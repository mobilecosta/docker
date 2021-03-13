/* eslint-disable @typescript-eslint/ban-ts-ignore */
import '../../../common/lib/bootstrap';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { EventEmitter } from 'events';
import { sanitize } from '../../../common/lib/functions';
import { sendToQueue } from '../../../common/lib/sqs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const soap = require('soap-as-promised');

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  let response: APIGatewayProxyResult = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '',
  };
  try {
    if (!event.pathParameters) {
      throw new Error('cep parameter is required for this request');
    }
    // @ts-ignore
    const params: { cep: string } = event.pathParameters;

    const { cep } = params;

    const data = await soap
      .createClient(
        'https://apps.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente?wsdl'
      )
      .then((client: { consultaCEP: (arg0: { cep: string }) => any }) =>
        client.consultaCEP({ cep: sanitize(cep) })
      )
      .then((result: { return: any }) => {
        if (!result.return) {
          return {
            body: JSON.stringify({ error: 'CEP Invalido' }),
            statusCode: 400,
          };
        }
        return { body: JSON.stringify(result.return), statusCode: 200 };
      })
      .catch(() => {
        return {
          body: JSON.stringify({ error: 'CEP Invalido' }),
          statusCode: 400,
        };
      });
    response.body = data.body;
    response.statusCode = data.statusCode;
  } catch (error) {
    console.error(error);
    response = {
      statusCode: 400,
      body: JSON.stringify({
        error: error.message,
        transaction: context.awsRequestId,
      }),
    };
  }
  await sendToQueue(
    JSON.stringify({
      method: event.httpMethod,
      url: event.path,
      origin: event.headers['User-Agent'],
      identity: event.requestContext.identity,
      payload: JSON.parse(event.body!) || { body: 'no body' },
      response: {
        body: JSON.parse(response.body),
        statusCode: response.statusCode,
      },
    }),
    `${process.env.PAYLOAD_QUEUE}`
  );
  return response;
};

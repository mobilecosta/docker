/* eslint-disable @typescript-eslint/ban-ts-ignore */
import '../../../common/lib/bootstrap';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import CreateInvoiceService from '../services/CreateNFEService';
import { sendToQueue } from '../../../common/lib/sqs';

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  let response: APIGatewayProxyResult = {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '',
  };

  try {
    if (!event.body) {
      throw new Error('Invalid Request');
    }
    const createInvoiceService = new CreateInvoiceService(event.body);
    const invoice = await createInvoiceService.run();
    response.body = JSON.stringify({
      invoice,
      action: 'NEW_INVOICE',
      transaction: context.awsRequestId,
    });
  } catch (error) {
    console.error(`[add-invoice]:`);
    console.error(error);
    response = {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: error.message,
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

/* eslint-disable @typescript-eslint/ban-ts-ignore */
import '../../../common/lib/bootstrap';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import InvoicesRepository from '../../../repositories/InvoicesRepository';
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
    if (!event.pathParameters) {
      throw new Error('CustomerId parameter is required for this request');
    }
    // @ts-ignore
    const params: { customerId: string } = event.pathParameters;

    const { customerId } = params;

    const invoices = await InvoicesRepository.find({
      value: customerId,
      field: 'customer_id',
    });

    response.body = JSON.stringify({
      invoices,
      customerId,
      transaction: context.awsRequestId,
    });

    // console.log({ event, context });
  } catch (error) {
    console.log(`[get-invoice]:`);
    console.log(error);
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

// eslint-disable-next-line import/no-extraneous-dependencies
import '../../../common/lib/bootstrap';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';

import { sendToQueue } from '../../../common/lib/sqs';
import CreateResellerService from '../services/CreateResellerService';

export const handler: APIGatewayProxyHandler = async (
  event,
  context
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
    const createResellerServices = new CreateResellerService(event.body!);
    const reseller = await createResellerServices.run(context.awsRequestId);
    response.body = JSON.stringify({
      resellersId: reseller.id,
      status: reseller.status,
      transaction: context.awsRequestId,
    });
  } catch (error) {
    console.log('[reseller-create]:');
    console.log(error);
    response = {
      statusCode: 422,
      body: JSON.stringify({
        status: 'error',
        error: error.message,
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

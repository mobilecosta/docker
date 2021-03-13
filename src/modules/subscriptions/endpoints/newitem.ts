// eslint-disable-next-line import/no-extraneous-dependencies
import '../../../common/lib/bootstrap';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { sendToQueue } from '../../../common/lib/sqs';
import NewItemSubscriptionService from '../services/NewItemSubscriptionService';
/**
 * @author Adalton L Goncalves <tp.adalton.goncalves@totvs.com.br>
 * @date May/2020
 * @param event
 * @param context
 */
export const handler: APIGatewayProxyHandler = async (
  event,
  context
): Promise<APIGatewayProxyResult> => {
  let response: APIGatewayProxyResult = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '',
  };
  if (!event.pathParameters) {
    throw new Error('Invalid Request');
  }
  const { document } = event.pathParameters;
  try {
    const newItem = new NewItemSubscriptionService(event.body);
    const { status, request } = await newItem.run(document);
    response.body = JSON.stringify({
      status,
      request,
      transaction: context.awsRequestId,
    });
  } catch (error) {
    response = {
      statusCode: 400,
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

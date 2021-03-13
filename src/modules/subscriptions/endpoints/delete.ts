// eslint-disable-next-line import/no-extraneous-dependencies
import '../../../common/lib/bootstrap';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import CancelSubscriptionService from '../services/CancelSubscriptionService';
import { sendToQueue } from '../../../common/lib/sqs';
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
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '',
  };

  try {
    const cancelSubscriptionService = new CancelSubscriptionService(
      event.body as string
    );
    const data = await cancelSubscriptionService.run();
    response.body = JSON.stringify({
      ...data,
      transaction: context.awsRequestId,
    });
  } catch (error) {
    response = {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: error.message,
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

// eslint-disable-next-line import/no-extraneous-dependencies
import '../../../common/lib/bootstrap';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import UpdateSubscriptionService from '../services/UpdateSubscriptionService';
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
    statusCode: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '',
  };

  try {
    if (!event.body || !event.pathParameters) {
      throw new Error('Invalid Request');
    }
    const { body } = event;
    const { customerId } = event.pathParameters;
    const updateSubscription = new UpdateSubscriptionService(customerId, body);
    const subscription = await updateSubscription.runPaymentMethod();
    response.body = JSON.stringify({
      status: 'success',
      action: 'UPDATE_SUBSCRIPTION',
      subscription,
      transaction: context.awsRequestId,
    });
  } catch (error) {
    console.log(error);
    response = {
      statusCode: 422,
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

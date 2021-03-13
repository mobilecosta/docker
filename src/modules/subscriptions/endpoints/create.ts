// eslint-disable-next-line import/no-extraneous-dependencies
import '../../../common/lib/bootstrap';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import CreateSubscriptionService from '../services/CreateSubscriptionService';
import { sendToQueue } from '../../../common/lib/sqs';
/**
 * @author Adalton L Goncalves <tp.adalton.goncalves@totvs.com.br>
 * @date May/2020
 * @param event
 * @param context
 * teste  teste testezinho novo teste teste
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
    const createSubscriptionServices = new CreateSubscriptionService(
      event.body
    );
    const {
      status,
      customerId,
      request,
    } = await createSubscriptionServices.run();
    response.body = JSON.stringify({
      customerId,
      status,
      request,
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

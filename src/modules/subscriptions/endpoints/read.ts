import '../../../common/lib/bootstrap';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import {
  subscriptionfindByCustomerMail,
  subscriptionfindByCustomerId,
  subscriptionfindByOrder,
} from '../../../repositories/SubscriptionsRepository';
import { sendToQueue } from '../../../common/lib/sqs';
import { getSubscriptionByDoc } from '../../queries/services/subscription-service';
import { customerfindById } from '../../../repositories/CustomersRepository';

/**
 * Get Subscription Data
 * @author Adalton L Goncalves <tp.adalton.goncalves@totvs.com.br>
 * @date May/2020
 * @param event
 * @param context
 * teste
 */
export const handler: APIGatewayProxyHandler = async (
  event,
  context
): Promise<APIGatewayProxyResult> => {
  const response: APIGatewayProxyResult = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '',
  };

  if (!event.queryStringParameters) {
    response.statusCode = 422;
    response.body = JSON.stringify({
      error: { message: 'Missing Parameters.' },
    });
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
  }

  if (
    !event.queryStringParameters.email &&
    !event.queryStringParameters.document &&
    !event.queryStringParameters.customerId &&
    !event.queryStringParameters.order
  ) {
    response.statusCode = 400;
    response.body = JSON.stringify({
      error: { message: 'Invalid Parameters.' },
    });
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
  }
  const { email, document, customerId, order } = event.queryStringParameters;

  try {
    if (customerId) {
      const customer = await customerfindById(customerId);
      const data = await getSubscriptionByDoc(
        customer.registryCode,
        event,
        context.awsRequestId
      );
      response.body = data.body;
      response.statusCode = data.statusCode;
    }
    if (email) {
      const subscription = await subscriptionfindByCustomerMail(email);
      const customer = await customerfindById(subscription[0].customerId);
      const data = await getSubscriptionByDoc(
        customer.registryCode,
        event,
        context.awsRequestId
      );
      response.body = data.body;
      response.statusCode = data.statusCode;
    }
    if (document) {
      const data = await getSubscriptionByDoc(
        document,
        event,
        context.awsRequestId
      );
      response.body = data.body;
      response.statusCode = data.statusCode;
    }
    if (order) {
      const subscription = await subscriptionfindByOrder(order);
      const customer = await customerfindById(subscription[0].customerId);
      const data = await getSubscriptionByDoc(
        customer.registryCode,
        event,
        context.awsRequestId
      );
      response.body = data.body;
      response.statusCode = data.statusCode;
    }
  } catch (error) {
    response.statusCode = 400;
    response.body = JSON.stringify(error.message);
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

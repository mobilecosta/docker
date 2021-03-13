/* eslint-disable @typescript-eslint/ban-ts-ignore */
import '../../../common/lib/bootstrap';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import {
  customerfindByMail,
  customerfindById,
} from '../../../repositories/CustomersRepository';
import { sendToQueue } from '../../../common/lib/sqs';
import { getCustomerByDocument } from '../../queries/services/customer-service';
/**
 * Get data from Customer
 * @author Adalton L Goncalves <tp.adalton.goncalves@totvs.com.br>
 * @date May/2020
 * @param event
 * @param context
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
      status: 'error',
      message: 'Missing Parameters',
      transaction: context.awsRequestId,
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
    !event.queryStringParameters.customerId
  ) {
    response.statusCode = 400;
    response.body = JSON.stringify({
      status: 'error',
      message: 'Invalid Parameters',
      transaction: context.awsRequestId,
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
  const { email, document, customerId } = event.queryStringParameters;

  try {
    if (email) {
      const customer = await customerfindByMail(email);
      const data = await getCustomerByDocument(
        customer[0].registryCode,
        event,
        context.awsRequestId
      );
      response.body = data.body;
      response.statusCode = data.statusCode;
    }
    if (document) {
      const data = await getCustomerByDocument(
        document,
        event,
        context.awsRequestId
      );
      response.body = data.body;
      response.statusCode = data.statusCode;
    }
    if (customerId) {
      const customer = await customerfindById(customerId);
      const data = await getCustomerByDocument(
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

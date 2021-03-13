import '../../../common/lib/bootstrap';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import {
  customerfindByRegistryCode,
  customerfindById,
} from '../../../repositories/CustomersRepository';
import bankSlipRepository from '../../../repositories/BankSlipRepository';
import { sendToQueue } from '../../../common/lib/sqs';
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
    response.statusCode = 400;
    response.body = JSON.stringify({
      status: 'error',
      message: 'missing parameters',
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
    !event.queryStringParameters.document &&
    !event.queryStringParameters.customerId
  ) {
    response.statusCode = 400;
    response.body = JSON.stringify({
      status: 'error',
      message: 'invalid parameters',
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
  const { document, customerId } = event.queryStringParameters;

  try {
    if (document) {
      const customer = await customerfindByRegistryCode(document);
      if (customer.length === 0) {
        response.body = JSON.stringify({
          status: 'error',
          message: 'customer not found',
          transaction: context.awsRequestId,
        });
      } else {
        const bankslip = await bankSlipRepository.findOne({
          value: customer[0].id,
          field: 'customer_id',
        });
        response.body = JSON.stringify({
          bankslip,
          transaction: context.awsRequestId,
        });
      }
    }
    if (customerId) {
      const customer = await customerfindById(customerId);
      if (!customer) {
        response.body = JSON.stringify({
          status: 'error',
          message: 'customer not found',
          transaction: context.awsRequestId,
        });
      } else {
        const bankslip = await bankSlipRepository.findOne({
          value: customer.id,
          field: 'customer_id',
        });
        response.body = JSON.stringify({
          bankslip,
          transaction: context.awsRequestId,
        });
      }
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

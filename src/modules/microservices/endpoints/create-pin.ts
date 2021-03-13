/* eslint-disable @typescript-eslint/ban-ts-ignore */
import '../../../common/lib/bootstrap';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { RequestPINInterface } from '../interfaces/requestpin.interface';
import { getMobilePhonesByCustomer } from '../../../repositories/CustomersRepository';
import { sendSMS } from '../../../common/lib/zenvia';
import { messages } from '../../../common/lib/messages';
import { createTwoFactorsToken } from '../../../repositories/Token2FactorsRepository';
import { TypeToken } from '../../../models/Token2Factors';
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
    body: JSON.stringify({
      message: 'Message Sent',
      transaction: context.awsRequestId,
    }),
  };
  try {
    if (!event.pathParameters) {
      throw new Error('CustomerId parameter is required for this request');
    }
    // @ts-ignore
    const params: RequestPINInterface = event.pathParameters;

    const { customerId } = params;

    const phone = await getMobilePhonesByCustomer(customerId);
    const pin = Math.floor(1000 + Math.random() * 9000);
    // @ts-ignore
    await createTwoFactorsToken({
      customerId,
      token: pin.toString(),
      type: TypeToken.SMS,
    });
    await sendSMS(`${phone.number}`, messages.sms.requestPIN(pin));

    // console.log({ event, context });
  } catch (error) {
    console.error(`[request-pin]: ${error}`);
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

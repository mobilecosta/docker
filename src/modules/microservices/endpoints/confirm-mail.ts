/* eslint-disable @typescript-eslint/ban-ts-ignore */
import '../../../common/lib/bootstrap';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { ConfirmPINInterface } from '../interfaces/confirmpin.interface';
import { confirmTokenSMS } from '../../../repositories/Token2FactorsRepository';

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  let response: APIGatewayProxyResult = {
    statusCode: 201,
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '',
  };
  try {
    if (!event.pathParameters) {
      throw new Error(
        'Parameters customerId and token/pin is required for this request'
      );
    }
    // @ts-ignore
    const params: ConfirmPINInterface = event.pathParameters;

    const { customerId, token } = params;
    const result = await confirmTokenSMS(customerId, token);
    if (!result) {
      throw new Error('PIN incorrect');
    }
    response.body = JSON.stringify({
      status: 'success',
      message: 'PIN correct',
      transaction: context.awsRequestId,
    });
  } catch (error) {
    console.error(`[confirm-pin]: ${error}`);
    response = {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        transaction: context.awsRequestId,
      }),
    };
  }
  return response;
};

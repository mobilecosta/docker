// eslint-disable-next-line import/no-extraneous-dependencies
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';

export const mailConfirmStatus = async (
  event: APIGatewayEvent,
  context: Context
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
    return response;
  }
  if (
    !event.queryStringParameters.email &&
    !event.queryStringParameters.customerId
  ) {
    response.statusCode = 400;
    response.body = JSON.stringify({
      error: { message: 'Invalid Parameters.' },
    });
    return response;
  }

  // For mockup Purpose
  const { email, customerId } = event.queryStringParameters;
  if (email === 'mpn@customer.com' || customerId === '01234mpn5678') {
    response.body = JSON.stringify({
      customerId: '01234mpn5678',
      status: '00',
      statusDescription: 'ok',
    });
  } else {
    response.statusCode = 400;
    response.body = JSON.stringify({
      error: { message: 'Customer Not Found.' },
    });
  }

  return response;
};

// export const checkPIN = async (event: APIGatewayEvent, context: Context) => {
//   const response: APIGatewayProxyResult = {
//     statusCode: 201,
//     headers: {
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Credentials': true,
//     },
//     body: '',
//   };

//   if (event.body === null) {
//     response.statusCode = 400;
//     response.body = JSON.stringify({ message: 'Request Body Not Found' });
//     return response;
//   }

//   const { pin } = JSON.parse(event.body);

//   if (!pin) {
//     response.statusCode = 400;
//     response.body = JSON.stringify({
//       error: { message: 'Request Body with Problems.' },
//     });
//     return response;
//   }

//   // For Mockup Purpose
//   if (pin !== '0101') {
//     response.statusCode = 400;
//     response.body = JSON.stringify({
//       error: { message: 'Invalid PIN' },
//     });
//     return response;
//   }

//   response.body = JSON.stringify({
//     status: '00',
//     statusDescription: 'Confirmed',
//   });

//   return response;
// };

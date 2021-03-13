import '../../../common/lib/bootstrap';
import { APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda';
import ReceiveVindiData from '../services/ReceiveVindiDataService';

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  const response: APIGatewayProxyResult = {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '',
  };
  const body = JSON.parse(event.body!);
  if (body.event.type === 'test') {
    return response;
  }
  if (
    !Object.prototype.hasOwnProperty.call(event.pathParameters, 'secret') ||
    event.pathParameters!.secret !==
      '87DFE934C37249CD30923EB6AF219F1736817A303FEE8B09AC788EB028A98FA229C953C12718EABC33F2B6E043521EC65F134DBE832C088DEFC480504790B000'
  ) {
    return {
      statusCode: 401,
      body: 'Unauthorized',
    };
  }
  try {
    const receiveVindiData = new ReceiveVindiData(event.body);
    await receiveVindiData.run();
    return response;
  } catch (error) {
    console.log(`[error | receive-vindi-webhook]: ${error}`);
    response.statusCode = 422;
    response.body = error.message;
    return response;
  }
};

import { graphql } from 'graphql';
import { APIGatewayProxyEvent } from 'aws-lambda';
import schema from './schemas';
// Highly scalable FaaS architecture :)
// Export a function which would be hooked up to the the λ node/ nodes as specified on serverless.yml template
export async function query(
  event: APIGatewayProxyEvent
  // context: Context,
) {
  const parsedRequestBody = event && event.body ? JSON.parse(event.body) : {};
  // eslint-disable-next-line no-useless-catch
  try {
    const graphQLResult = await graphql(
      schema,
      parsedRequestBody.query,
      null,
      null,
      parsedRequestBody.variables,
      parsedRequestBody.operationName
    );
    const hasError = Object.prototype.hasOwnProperty.call(
      graphQLResult,
      'errors'
    );
    if (hasError) {
      return { statusCode: 400, body: JSON.stringify(graphQLResult) };
    }
    return { statusCode: 200, body: JSON.stringify(graphQLResult) };
  } catch (error) {
    throw error;
  }
}

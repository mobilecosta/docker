import { Lambda, Request, AWSError } from 'aws-sdk';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Callback } from 'aws-lambda';

class LambdaAdapter {
  private lambda: Lambda;

  constructor() {
    if (`${process.env.ENV}` === 'local') {
      this.lambda = new Lambda({
        apiVersion: '2015-03-31',
        region: `${process.env.AWS_REGION}`,
        endpoint: 'http://localhost:3002',
      });
    } else {
      this.lambda = new Lambda({
        apiVersion: '2015-03-31',
        region: `${process.env.AWS_REGION}`,
      });
    }
  }

  public invoke(
    lambdaName: string,
    event: any
  ): Promise<Lambda.InvocationResponse> {
    return this.lambda
      .invoke({
        FunctionName: lambdaName,
        Payload: JSON.stringify(event, null, 2),
        InvocationType: 'RequestResponse',
      })
      .promise();
  }

  public invokeEvent(
    lambdaName: string,
    event: any
  ): Promise<Lambda.InvocationResponse> {
    return this.lambda
      .invoke({
        FunctionName: lambdaName,
        Payload: JSON.stringify(event, null, 2),
        InvocationType: 'Event',
      })
      .promise();
  }

  public invokeAsync(
    lambdaName: string,
    event: string,
    callback: Callback
  ): Request<Lambda.InvokeAsyncResponse, AWSError> {
    return this.lambda.invokeAsync(
      {
        FunctionName: lambdaName,
        InvokeArgs: JSON.stringify(event, null, 2),
      },
      callback
    );
  }
}

export default new LambdaAdapter();

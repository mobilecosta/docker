import { SQS } from 'aws-sdk';
// eslint-disable-next-line import/no-extraneous-dependencies
import { SQSRecord } from 'aws-lambda';

const options = {
  apiVersion: '2012-11-05',
  region: `${process.env.AWS_REGION}`,
};

const sqs = new SQS(options);

export const sendToQueue = async (
  message: string,
  queue: string,
  delaySeconds = 0
): Promise<SQS.SendMessageResult> => {
  if (!queue) {
    throw new Error('Invalid Queue');
  }

  const params = {
    QueueUrl: queue,
    MessageBody: message,
    DelaySeconds: delaySeconds,
  };

  try {
    return sqs.sendMessage(params).promise();
  } catch (error) {
    throw new Error(error);
  }
};

export const removeFromQueue = async (
  message: SQSRecord,
  queue: string
): Promise<any> => {
  if (!queue || !message) {
    throw new Error('[delete message]: Undefined');
  }

  const params = {
    QueueUrl: queue,
    ReceiptHandle: message.receiptHandle,
  };

  try {
    return sqs.deleteMessage(params).promise();
  } catch (error) {
    throw new Error(error);
  }
};

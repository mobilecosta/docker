import { SNS } from 'aws-sdk';

interface OptionsSNS {
  region: string;
  endpoint?: string;
}

const options: OptionsSNS = {
  region: `${process.env.AWS_REGION}`,
};

if (`${process.env.ENV}` === 'local') {
  options.endpoint = 'http://localhost:4002';
}

const sns = new SNS(options);

export const sendSubscription = async (
  message: string,
  topic: string
): Promise<SNS.PublishResponse> => {
  const params = {
    Message: message,
    TopicArn: topic,
  };

  try {
    return await sns.publish(params).promise();
  } catch (error) {
    throw new Error(error);
  }
};

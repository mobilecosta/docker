import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import { uuid } from '../common/lib/uuid';
import VindiWebhook from '../models/VindiWebhook';

let client;
if (`${process.env.ENV}` === 'local') {
  client = new DynamoDB({
    region: `${process.env.AWS_REGION}`,
    endpoint: 'http://localhost:8000',
  });
} else {
  client = new DynamoDB({
    region: `${process.env.AWS_REGION}`,
  });
}

const mapper = new DataMapper({
  client,
  tableNamePrefix: `${process.env.ENV}_`,
});

interface VindiWebhookCreateData {
  type: string;
  data: Record<string, any>;
  customerId: string;
}

export const createVindiData = async ({
  type,
  data,
  customerId,
}: VindiWebhookCreateData): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const toSave = Object.assign(new VindiWebhook(), {
      id: uuid(),
      type,
      data,
      customerId,
      createdAt: new Date(),
    });
    mapper
      .put(toSave)
      .then(objectSaved => {
        console.log(
          `new item added in [vindi webhook table] - id: ${objectSaved.id}`
        );
        resolve(true);
      })
      .catch(error => {
        console.error(`Error: [create-vindi-webhook-data] - ${error}`);
        reject(error.message);
      });
  });
};

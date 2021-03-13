/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Plan from '../models/Plan';

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

export const createPlan = async ({
  id,
  planId,
  planCode,
}: Plan): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const toSave = Object.assign(new Plan(), {
      id,
      planId,
      planCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mapper
      .put(toSave)
      .then(objectSaved => {
        console.log(`new item added in [plans table] - id: ${objectSaved.id}`);
        resolve(true);
      })
      .catch(error => {
        console.error(`Error: [create-plan] - ${error}`);
        reject(error.message);
      });
  });
};

export const planFindByCode = async (code: string): Promise<Plan[]> => {
  const condition: ConditionExpression = {
    ...equals(code),
    subject: 'plan_code',
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: Plan,
      filter: condition,
    });
    const result: Array<Plan> = [];
    for await (const plan of iterator) {
      result.push(plan);
    }
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

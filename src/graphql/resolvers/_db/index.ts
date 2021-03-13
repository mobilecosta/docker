import { DynamoDB } from 'aws-sdk';
import { ItemList } from 'aws-sdk/clients/dynamodb';

let dynamoDb: DynamoDB.DocumentClient;

if (`${process.env.ENV}` === 'local') {
  dynamoDb = new DynamoDB.DocumentClient({
    region: `${process.env.AWS_REGION}`,
    endpoint: 'http://localhost:8000',
  });
} else {
  dynamoDb = new DynamoDB.DocumentClient({
    region: `${process.env.AWS_REGION}`,
  });
}

export const scan = (params: any) => {
  return new Promise((resolve, reject) =>
    dynamoDb
      .scan(params)
      .promise()
      .then(data => resolve(data.Items))
      .catch(err => reject(err))
  );
};

export const query = (params: any) => {
  return new Promise((resolve, reject) => {
    dynamoDb
      .query(params)
      .promise()
      .then(data => resolve(data.Items))
      .catch(err => reject(err));
  });
};

export const get = (params: any) => {
  return new Promise((resolve, reject) =>
    dynamoDb
      .get(params)
      .promise()
      .then(data => resolve(data.Item))
      .catch(err => reject(err))
  );
};

export const createItem = (params: any) => {
  return new Promise((resolve, reject) =>
    dynamoDb
      .put(params)
      .promise()
      .then(() => resolve(params.Item))
      .catch(err => reject(err))
  );
};

export const updateItem = (params: any, args: any) => {
  return new Promise((resolve, reject) =>
    dynamoDb
      .update(params)
      .promise()
      .then(() => resolve(args))
      .catch(err => reject(err))
  );
};

export const deleteItem = (params: any, args: any) => {
  return new Promise((resolve, reject) =>
    dynamoDb
      .delete(params)
      .promise()
      .then(() => resolve(args))
      .catch(err => reject(err))
  );
};

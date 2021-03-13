/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import DocumentBureau from '../models/DocumentBureau';
import { uuid } from '../common/lib/uuid';

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

export const create = async ({
  type,
  document,
  code,
  description,
  details,
}: DocumentBureau): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const toSave = Object.assign(new DocumentBureau(), {
      id: uuid(),
      type,
      document,
      code,
      description,
      consulted: 1,
      details,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mapper
      .put(toSave)
      .then(objectSaved => {
        console.log(
          `new item added in [documents bureau table] - id: ${objectSaved.id}`
        );
        resolve(true);
      })
      .catch(error => {
        console.error(`Error: [create-documents-bureau] - ${error}`);
        reject(error.message);
      });
  });
};

export const update = async (
  id: string,
  { code, consulted, description, details }: DocumentBureau
) => {
  const updatedItem = await mapper.get(
    Object.assign(new DocumentBureau(), { id })
  );
  updatedItem.updatedAt = new Date();
  updatedItem.code = code;
  updatedItem.consulted = consulted;
  updatedItem.description = description;
  updatedItem.details = details;

  return mapper.update(updatedItem);
};

export const findById = async (
  id: string
): Promise<DocumentBureau | undefined> => {
  const toFetch = new DocumentBureau();
  toFetch.id = id;
  try {
    // @ts-ignore
    return await mapper.get({ item: toFetch });
  } catch (error) {
    return undefined;
  }
};

export const findByDocument = async (
  document: string
): Promise<DocumentBureau[]> => {
  const condition: ConditionExpression = {
    ...equals(document),
    subject: 'document',
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: DocumentBureau,
      filter: condition,
    });
    const result: Array<DocumentBureau> = [];
    for await (const doc of iterator) {
      result.push(doc);
    }
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

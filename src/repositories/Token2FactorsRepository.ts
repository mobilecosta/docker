import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import { uuid } from '../common/lib/uuid';
import Token2Factors, { TypeToken } from '../models/Token2Factors';
import {
  getMobilePhonesByCustomer,
  updateCustomerPhone,
} from './CustomersRepository';

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

export const findByCustomerIdAndType = async (
  customerId: string,
  type: TypeToken
): Promise<Token2Factors> => {
  const condition: ConditionExpression = {
    type: 'And',
    conditions: [
      {
        ...equals(customerId),
        subject: 'customer_id',
      },
      {
        ...equals(type),
        subject: 'type',
      },
    ],
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: Token2Factors,
      filter: condition,
    });
    const result: Array<Token2Factors> = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const item of iterator) {
      result.push(item);
    }
    return result[0];
  } catch (error) {
    throw new Error(error.message);
  }
};

export const createTwoFactorsToken = async ({
  customerId,
  type,
  token,
}: Token2Factors) => {
  const record = await findByCustomerIdAndType(customerId, type);
  let toSave: Token2Factors & {
    id: string;
    customerId: string;
    type: TypeToken;
    token: string;
    validatedAt: undefined;
    createdAt: Date;
  };
  if (!record) {
    toSave = Object.assign(new Token2Factors(), {
      id: uuid(),
      customerId,
      type,
      token,
      validatedAt: undefined,
      createdAt: new Date(),
    });
  } else {
    toSave = Object.assign(new Token2Factors(), {
      id: record.id,
      customerId,
      type,
      token,
      validatedAt: undefined,
      createdAt: new Date(),
    });
  }
  return new Promise((resolve, reject) => {
    mapper
      .put(toSave)
      .then(objectSaved => {
        console.log(
          `new item added in [twofactors token table] - id: ${objectSaved.id}`
        );
        resolve(true);
      })
      .catch(error => {
        console.error(`Error: [create-token] - ${error}`);
        reject(error.message);
      });
  });
};

const updateFieldsTokenFactor = async (id: string) => {
  const updatedItem = await mapper.get(
    Object.assign(new Token2Factors(), { id })
  );
  updatedItem.validatedAt = new Date();
  return mapper.update(updatedItem);
};

export const confirmTokenSMS = async (
  customerId: string,
  token: string
): Promise<boolean> => {
  const condition: ConditionExpression = {
    type: 'And',
    conditions: [
      {
        ...equals(customerId),
        subject: 'customer_id',
      },
      {
        ...equals(token),
        subject: 'token',
      },
    ],
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: Token2Factors,
      filter: condition,
    });
    const result: Array<Token2Factors> = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const item of iterator) {
      result.push(item);
    }
    if (!result[0]) return false;
    if (result[0].validatedAt) throw new Error('PIN previously validated');
    await updateFieldsTokenFactor(result[0].id);
    const phoneValidated = await getMobilePhonesByCustomer(
      result[0].customerId
    );
    await updateCustomerPhone(phoneValidated.id, { validated: true });
    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

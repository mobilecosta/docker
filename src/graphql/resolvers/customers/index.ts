/* eslint-disable @typescript-eslint/ban-ts-ignore */
import * as db from '../_db';
import { CustomerInterface } from './typings';

const TableName = `${process.env.ENV}_customers`;

export const getCustomers = (): Promise<CustomerInterface[]> => {
  const params = {
    TableName,
  };
  // @ts-ignore
  return db.scan(params);
};

export const getCustomerById = (id: string): Promise<CustomerInterface> => {
  const params = {
    TableName,
    Key: {
      id,
    },
  };
  // @ts-ignore
  return db.get(params);
};

export const getCustomerByDocument = (
  document: string
): Promise<CustomerInterface[]> => {
  const params = {
    TableName,
    FilterExpression: '#customer = :document',
    ExpressionAttributeNames: {
      '#customer': 'registry_code',
    },
    ExpressionAttributeValues: {
      ':document': document,
    },
  };
  // @ts-ignore
  return db.scan(params);
};

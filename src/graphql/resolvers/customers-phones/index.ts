/* eslint-disable @typescript-eslint/ban-ts-ignore */
import * as db from '../_db';
import { CustomerPhoneInterface } from './typings';

const TableName = `${process.env.ENV}_customers_phone`;

export const getCustomerPhoneByCustomerId = (
  id: string
): Promise<CustomerPhoneInterface[]> => {
  const params = {
    TableName,
    FilterExpression: '#customer = :id',
    ExpressionAttributeNames: {
      '#customer': 'customer_id',
    },
    ExpressionAttributeValues: {
      ':id': id,
    },
  };
  // @ts-ignore
  return db.scan(params);
};

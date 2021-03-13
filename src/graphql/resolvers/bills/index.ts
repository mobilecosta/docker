/* eslint-disable @typescript-eslint/ban-ts-ignore */
import * as db from '../_db';

import { BillInterface } from './typings';

const TableName = `${process.env.ENV}_bills`;

export const getBillBySubscriptionId = (
  id: string
): Promise<BillInterface[]> => {
  const params = {
    TableName,
    FilterExpression: '#subscription = :id',
    ExpressionAttributeNames: {
      '#subscription': 'subscription_id',
    },
    ExpressionAttributeValues: {
      ':id': id,
    },
  };
  // @ts-ignore
  return db.scan(params);
};

export const getLastBillBySubscriptionId = async (
  id: string
): Promise<BillInterface> => {
  const params = {
    TableName,
    FilterExpression: '#subscription = :id',
    ExpressionAttributeNames: {
      '#subscription': 'subscription_id',
    },
    ExpressionAttributeValues: {
      ':id': id,
    },
  };
  // @ts-ignore
  const bills: Array<BillInterface> = await db.scan(params);

  bills.sort((a, b) => {
    if (a.created_at < b.created_at) {
      return 1;
    }
    if (a.created_at > b.created_at) {
      return -1;
    }
    return 0;
  });
  return bills[0];
};

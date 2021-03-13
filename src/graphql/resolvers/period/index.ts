/* eslint-disable @typescript-eslint/ban-ts-ignore */
import * as db from '../_db';
import { PeriodInterface } from './typings';

const TableName = `${process.env.ENV}_periods`;

export const getLastPeriodBySubscription = async (
  subscriptionId: string
): Promise<PeriodInterface> => {
  const params = {
    TableName,
    IndexName: 'subscriptionAndStartIndex',
    KeyConditionExpression: 'subscription_id = :subscription',
    ExpressionAttributeValues: {
      ':subscription': subscriptionId,
    },
  };
  // @ts-ignore
  const list: PeriodInterface[] = await db.query(params);
  list.sort((a, b) => {
    if (a.created_at < b.created_at) {
      return 1;
    }
    if (a.created_at > b.created_at) {
      return -1;
    }
    return 0;
  });

  return list[0];
};

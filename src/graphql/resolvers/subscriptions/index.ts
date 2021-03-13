/* eslint-disable @typescript-eslint/ban-ts-ignore */
import * as db from '../_db';
import { SubscriptionInterface } from './typings';
import { getCustomerByDocument } from '../customers';
import CustomerRepository from '../../../repositories/v2/CustomerRepository';

const TableName = `${process.env.ENV}_subscriptions`;

export const getSubscriptionByCustomerId = (
  id: string
): Promise<SubscriptionInterface[]> => {
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

export const getSubscriptionByDocument = async (
  document: string
): Promise<SubscriptionInterface[]> => {
  const customer = await CustomerRepository.find({
    value: document,
    field: 'registry_code',
  });
  // const customer = await getCustomerByDocument(document);
  const params = {
    TableName,
    FilterExpression: '#customer = :id',
    ExpressionAttributeNames: {
      '#customer': 'customer_id',
    },
    ExpressionAttributeValues: {
      ':id': customer[0].id,
    },
  };
  // @ts-ignore
  const results: SubscriptionInterface[] = await db.scan(params);

  results.sort((a, b) => {
    if (a.created_at < b.created_at) {
      return 1;
    }
    if (a.created_at > b.created_at) {
      return -1;
    }
    return 0;
  });

  return results.filter(subscription => {
    return subscription.status !== 'cancelada';
  });
};

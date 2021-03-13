import * as db from '../_db';

const TableName = `${process.env.ENV}_discounts`;

export const getDiscountBySubscriptionId = (id: string) => {
  const params = {
    TableName,
    FilterExpression: '#subscription = :id',
    ExpressionAttributeNames: {
      '#subscription': 'subscriptionId',
    },
    ExpressionAttributeValues: {
      ':id': id,
    },
  };

  return db.scan(params);
};

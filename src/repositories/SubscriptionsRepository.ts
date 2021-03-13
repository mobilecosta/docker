/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Subscription from '../models/Subscription';

import {
  customerfindByMail,
  customerfindByRegistryCode,
} from './CustomersRepository';
import Discount from '../models/Discount';
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

export enum StatusSubscription {
  PROCESSING = 'em processamento',
  ACTIVE = 'ativa',
  CANCELED = 'cancelada',
  SUSPENDED = 'suspensa',
}

enum DiscountType {
  PRORATA = 'pro_rata',
  SETBYSTORE = 'set_by_store',
}

interface DiscountRecord {
  amount: string;
  cycles: number;
  isProRata?: boolean;
}

export const addDiscount = (subscriptionId: string, record: DiscountRecord) => {
  return new Promise((resolve, reject) => {
    const toSave = Object.assign(new Discount(), {
      id: uuid(),
      subscriptionId,
      amount: record.amount,
      cycles: record.cycles,
      type: record.isProRata ? DiscountType.PRORATA : DiscountType.SETBYSTORE,
      createdAt: new Date(),
    });
    mapper
      .put(toSave)
      .then(objectSaved => {
        console.log(
          `new item added in [discount table] - id: ${objectSaved.id}`
        );
        resolve(true);
      })
      .catch(error => {
        console.error(`Error: [create-discount] - ${error}`);
        reject(error.message);
      });
  });
};

export const createSubscription = async (
  {
    id,
    customerId,
    salesOrder,
    paymentMethod,
    price,
    planCode,
    installments,
    migrated,
  }: Subscription,
  discount: DiscountRecord | undefined
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const toSave = Object.assign(new Subscription(), {
      id,
      customerId,
      salesOrder,
      paymentMethod,
      price,
      planCode,
      installments: installments || 1,
      status: StatusSubscription.PROCESSING,
      migrated,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mapper
      .put(toSave)
      .then(async objectSaved => {
        console.log(
          `new item added in [subscriptions table] - id: ${objectSaved.id}`
        );
        if (discount) {
          await addDiscount(id, discount);
        }
        resolve(true);
      })
      .catch(error => {
        console.error(`Error: [create-subscriptions] - ${error}`);
        reject(error.message);
      });
  });
};

export const subscriptionfindById = async (
  id: string
): Promise<Subscription | undefined> => {
  const toFetch = new Subscription();
  toFetch.id = id;
  try {
    // @ts-ignore
    return await mapper.get({ item: toFetch });
  } catch (error) {
    return undefined;
  }
};

export const subscriptionfindByCustomerId = async (
  customerId: string
): Promise<Subscription[]> => {
  const condition: ConditionExpression = {
    ...equals(customerId),
    subject: 'customer_id',
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: Subscription,
      filter: condition,
    });
    const result: Array<Subscription> = [];
    for await (const subscription of iterator) {
      result.push(subscription);
    }
    result.sort((a, b) => {
      if (a.createdAt! < b.createdAt!) {
        return 1;
      }
      if (a.createdAt! > b.createdAt!) {
        return -1;
      }
      return 0;
    });
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const subscriptionfindByCustomerMail = async (
  email: string
): Promise<Subscription[]> => {
  const customer = await customerfindByMail(email);
  const condition: ConditionExpression = {
    ...equals(customer[0].id),
    subject: 'customer_id',
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: Subscription,
      filter: condition,
    });
    const result: Array<Subscription> = [];
    for await (const subscription of iterator) {
      result.push(subscription);
    }
    result.sort((a, b) => {
      if (a.createdAt! < b.createdAt!) {
        return 1;
      }
      if (a.createdAt! > b.createdAt!) {
        return -1;
      }
      return 0;
    });
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const subscriptionfindByCustomerDocument = async (
  document: string
): Promise<Subscription[]> => {
  const customer = await customerfindByRegistryCode(document);
  if (!customer) {
    throw new Error('Customer not found');
  }
  const condition: ConditionExpression = {
    ...equals(customer[0].id),
    subject: 'customer_id',
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: Subscription,
      filter: condition,
    });
    const result: Array<Subscription> = [];
    for await (const subscription of iterator) {
      result.push(subscription);
    }
    result.sort((a, b) => {
      if (a.createdAt! < b.createdAt!) {
        return 1;
      }
      if (a.createdAt! > b.createdAt!) {
        return -1;
      }
      return 0;
    });
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const subscriptionfindByOrder = async (
  order: string
): Promise<Subscription[]> => {
  const condition: ConditionExpression = {
    ...equals(order),
    subject: 'sales_order',
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: Subscription,
      filter: condition,
    });
    const result: Array<Subscription> = [];
    for await (const subscription of iterator) {
      result.push(subscription);
    }
    result.sort((a, b) => {
      if (a.createdAt! < b.createdAt!) {
        return 1;
      }
      if (a.createdAt! > b.createdAt!) {
        return -1;
      }
      return 0;
    });
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const updateFieldsSubscriptionToVindi = async (
  id: string,
  vindiCode: string
) => {
  const updatedItem = await mapper.get(
    Object.assign(new Subscription(), { id })
  );
  updatedItem.vindiSentAt = new Date();
  updatedItem.updatedAt = new Date();
  updatedItem.vindiId = vindiCode;

  return mapper.update(updatedItem);
};

export const updateFieldsSubscriptionToLicenciador = async (
  id: string,
  code: string
) => {
  const updatedItem = await mapper.get(
    Object.assign(new Subscription(), { id })
  );
  updatedItem.licenciadorSentAt = new Date();
  updatedItem.updatedAt = new Date();
  updatedItem.codeLicenciador = code;

  return mapper.update(updatedItem);
};

export const subscriptionfindByVindiCode = async (
  vindiCode: string
): Promise<Subscription[]> => {
  const condition: ConditionExpression = {
    ...equals(vindiCode),
    subject: 'vindi_id',
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: Subscription,
      filter: condition,
    });
    const result: Array<Subscription> = [];
    for await (const subscription of iterator) {
      result.push(subscription);
    }
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const setReasonToCancelSubscription = async (
  id: string,
  reason: Record<string, any>
) => {
  const subscription = await subscriptionfindByVindiCode(id);
  const updatedItem = await mapper.get(
    Object.assign(new Subscription(), { id: subscription[0].id })
  );
  updatedItem.updatedAt = new Date();
  updatedItem.reason = reason;

  return mapper.update(updatedItem);
};

export const updateSubscriptionStatus = async (
  id: string,
  status: StatusSubscription
) => {
  const updatedItem = await mapper.get(
    Object.assign(new Subscription(), { id })
  );
  updatedItem.updatedAt = new Date();
  updatedItem.status = status;

  return mapper.update(updatedItem);
};

export const update = async (
  id: string,
  fields: Record<string, any>
): Promise<any> => {
  const updatedItem = await mapper.get(
    Object.assign(new Subscription(), { id })
  );
  updatedItem.updatedAt = new Date();
  Object.assign(updatedItem, fields);
  return mapper.update(updatedItem);
};

/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Repository from '../../common/classes/Repository';
import Subscription from '../../models/Subscription';
import { uuid } from '../../common/lib/uuid';

interface SubscriptionCreateData {
  vindiId?: string;
  customerId: string;
  salesOrder?: string;
  planCode: string;
  paymentMethod: string;
  price: string;
  status: string;
  installments: number;
  vindiSentAt?: Date;
  licenciadorSentAt?: Date;
  codeLicenciador?: string;
  reason?: Record<string, any>;
}

class SubscriptionRepository implements Repository {
  private mapper: DataMapper;

  constructor() {
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

    this.mapper = new DataMapper({
      client,
      tableNamePrefix: `${process.env.ENV}_`,
    });
  }

  create({
    vindiId,
    customerId,
    salesOrder,
    planCode,
    paymentMethod,
    price,
    status,
    installments,
    vindiSentAt,
    licenciadorSentAt,
    codeLicenciador,
    reason,
  }: SubscriptionCreateData): Promise<Subscription> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new Subscription(), {
        id: uuid(),
        vindiId,
        customerId,
        salesOrder,
        planCode,
        paymentMethod,
        price,
        status,
        installments,
        vindiSentAt,
        licenciadorSentAt,
        codeLicenciador,
        reason,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [subscription table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-subscription] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const updatedItem = await this.mapper.get(
      Object.assign(new Subscription(), { id })
    );
    updatedItem.updatedAt = new Date();
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  remove(id: string): Promise<any> {
    return this.mapper.delete(Object.assign(new Subscription(), { id }));
  }

  findById(id: string): Promise<Subscription> {
    const toFetch = new Subscription();
    toFetch.id = id;
    // @ts-ignore
    return this.mapper
      .get({ item: toFetch })
      .then(async item => item)
      .catch(error => {
        if (error.code !== 'ResourceNotFoundException') {
          return undefined;
        }
        throw new Error(error.message);
      });
  }

  async findOne(parameter: {
    value: any;
    field: string;
  }): Promise<Subscription> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Subscription,
        filter: condition,
      });
      const result = [];
      for await (const customer of iterator) {
        result.push(customer);
      }
      result.sort((a, b) => {
        if (a.createdAt < b.createdAt) {
          return 1;
        }
        if (a.createdAt > b.createdAt) {
          return -1;
        }
        return 0;
      });
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: {
    value: any;
    field: string;
  }): Promise<Subscription[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Subscription,
        filter: condition,
      });
      const result = [];
      for await (const subscription of iterator) {
        result.push(subscription);
      }
      result.sort((a, b) => {
        if (a.createdAt < b.createdAt) {
          return 1;
        }
        if (a.createdAt > b.createdAt) {
          return -1;
        }
        return 0;
      });
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAll(): Promise<Subscription[]> {
    const result = [];
    for await (const item of this.mapper.scan(Subscription)) {
      result.push(item);
    }
    return result;
  }
}

export default new SubscriptionRepository();

/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Repository from '../common/classes/Repository';
import PendingPurchase from '../models/PendingPurchase';
import { uuid } from '../common/lib/uuid';

interface PendingPurchaseCreateData {
  price: string;
  salesOrder: string;
  offers: Array<{
    code: string;
    quantity: number;
    resellerProtheusId?: string;
  }>;
  discount?: {
    amount: string;
    cycles: number;
  };
}

class PendingPurchaseRepository implements Repository {
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
    price,
    salesOrder,
    offers,
    discount,
  }: PendingPurchaseCreateData): Promise<PendingPurchase> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new PendingPurchase(), {
        id: uuid(),
        price,
        salesOrder,
        offers,
        discount,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [pending-purchase table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-pending-purchase] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const updatedItem = await this.mapper.get(
      Object.assign(new PendingPurchase(), { id })
    );
    updatedItem.updatedAt = new Date();
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  remove(id: string): Promise<any> {
    return this.mapper.delete(Object.assign(new PendingPurchase(), { id }));
  }

  findById(id: string): Promise<PendingPurchase> {
    const toFetch = new PendingPurchase();
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
  }): Promise<PendingPurchase> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: PendingPurchase,
        filter: condition,
      });
      const result = [];
      for await (const purchase of iterator) {
        result.push(purchase);
      }
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: {
    value: any;
    field: string;
  }): Promise<PendingPurchase[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: PendingPurchase,
        filter: condition,
      });
      const result = [];
      for await (const purchase of iterator) {
        result.push(purchase);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAll(): Promise<PendingPurchase[]> {
    const result = [];
    for await (const item of this.mapper.scan(PendingPurchase)) {
      result.push(item);
    }
    return result;
  }
}

export default new PendingPurchaseRepository();

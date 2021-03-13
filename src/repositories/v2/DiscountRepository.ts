/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Repository from '../../common/classes/Repository';
import Discount from '../../models/Discount';
import { uuid } from '../../common/lib/uuid';

interface DiscountCreateData {
  subscriptionId: string;
  amount: string;
  cycles: string;
  type: string;
  salesOrder?: string;
}

class DiscountRepository implements Repository {
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
    subscriptionId,
    amount,
    cycles,
    type,
    salesOrder,
  }: DiscountCreateData): Promise<Discount> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new Discount(), {
        id: uuid(),
        subscriptionId,
        amount,
        cycles,
        type,
        salesOrder,
        createdAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [discount table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-discount] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const updatedItem = await this.mapper.get(
      Object.assign(new Discount(), { id })
    );
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  remove(id: string): Promise<any> {
    return this.mapper.delete(Object.assign(new Discount(), { id }));
  }

  findById(id: string): Promise<Discount> {
    const toFetch = new Discount();
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

  async findOne(parameter: { value: any; field: string }): Promise<Discount> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Discount,
        filter: condition,
      });
      const result = [];
      for await (const discount of iterator) {
        result.push(discount);
      }
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: { value: any; field: string }): Promise<Discount[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Discount,
        filter: condition,
      });
      const result = [];
      for await (const discount of iterator) {
        result.push(discount);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAll(): Promise<Discount[]> {
    const result = [];
    for await (const item of this.mapper.scan(Discount)) {
      result.push(item);
    }
    return result;
  }
}

export default new DiscountRepository();

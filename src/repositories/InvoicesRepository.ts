/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Repository from '../common/classes/Repository';
import Invoice, { InvoiceStatus } from '../models/Invoice';
import { uuid } from '../common/lib/uuid';

interface InvoiceCreateData {
  customerId: string;
  number: number;
  serie: number;
  url: string;
  hash: string;
  order: string;
}

class InvoicesRepository implements Repository {
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
    customerId,
    number,
    serie,
    url,
    hash,
    order,
  }: InvoiceCreateData): Promise<Invoice> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new Invoice(), {
        id: uuid(),
        customerId,
        number,
        serie,
        url,
        hash,
        order,
        status: InvoiceStatus.VALID,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [invoice table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-invoice] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const updatedItem = await this.mapper.get(
      Object.assign(new Invoice(), { id })
    );
    updatedItem.updatedAt = new Date();
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  remove(id: string): Promise<any> {
    return this.mapper.delete(Object.assign(new Invoice(), { id }));
  }

  findById(id: string): Promise<Invoice> {
    const toFetch = new Invoice();
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

  async findOne(parameter: { value: any; field: string }): Promise<Invoice> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Invoice,
        filter: condition,
      });
      const result = [];
      for await (const invoice of iterator) {
        result.push(invoice);
      }
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: { value: any; field: string }): Promise<Invoice[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Invoice,
        filter: condition,
      });
      const result = [];
      for await (const invoice of iterator) {
        result.push(invoice);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAll(): Promise<Invoice[]> {
    const result = [];
    for await (const item of this.mapper.scan(Invoice)) {
      result.push(item);
    }
    return result;
  }
}

export default new InvoicesRepository();

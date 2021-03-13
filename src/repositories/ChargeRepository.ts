/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Repository from '../common/classes/Repository';
import Charge from '../models/Charge';
import { uuid } from '../common/lib/uuid';

interface ChargeCreateData {
  idVindi: number;
  billId: number;
  status: string;
  dueAt: Date;
  paymentMethod: string;
  url?: string;
  typableBarcode?: string;
  barcode?: string;
  gatewayAuthorization?: string;
}

class ChargeRepository implements Repository {
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
    idVindi,
    billId,
    status,
    dueAt,
    paymentMethod,
    url,
    typableBarcode,
    barcode,
    gatewayAuthorization,
  }: ChargeCreateData): Promise<Charge> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new Charge(), {
        id: uuid(),
        idVindi,
        billId,
        status,
        dueAt,
        paymentMethod,
        url,
        typableBarcode,
        barcode,
        gatewayAuthorization,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [charge table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-charge] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const updatedItem = await this.mapper.get(
      Object.assign(new Charge(), { id })
    );
    updatedItem.updatedAt = new Date();
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  remove(id: string): Promise<any> {
    return this.mapper.delete(Object.assign(new Charge(), { id }));
  }

  findById(id: string): Promise<Charge> {
    const toFetch = new Charge();
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

  async findOne(parameter: { value: any; field: string }): Promise<Charge> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Charge,
        filter: condition,
      });
      const result = [];
      for await (const charge of iterator) {
        result.push(charge);
      }
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: { value: any; field: string }): Promise<Charge[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Charge,
        filter: condition,
      });
      const result = [];
      for await (const charge of iterator) {
        result.push(charge);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAll(): Promise<Charge[]> {
    const result = [];
    for await (const item of this.mapper.scan(Charge)) {
      result.push(item);
    }
    return result;
  }
}

export default new ChargeRepository();

/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import BankSlip from '../models/BankSlip';
import { uuid } from '../common/lib/uuid';

interface BSCreateData {
  customerId: string;
  vindiBill: string;
  barcode: string;
  typeableBarcode: string;
  slipTransactionId: string;
  url: string;
}

class BankSlipRepository {
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
    vindiBill,
    barcode,
    typeableBarcode,
    slipTransactionId,
    url,
  }: BSCreateData): Promise<BankSlip> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new BankSlip(), {
        id: uuid(),
        customerId,
        vindiBill,
        barcode,
        typeableBarcode,
        slipTransactionId,
        url,
        createdAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [bank-slip table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-bank-slip] - ${error}`);
          reject(error.message);
        });
    });
  }

  remove(id: string): Promise<any> {
    return this.mapper.delete(Object.assign(new BankSlip(), { id }));
  }

  findById(id: string): Promise<BankSlip> {
    const toFetch = new BankSlip();
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

  async findOne(parameter: { value: any; field: string }): Promise<BankSlip> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: BankSlip,
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

  async find(parameter: { value: any; field: string }): Promise<BankSlip[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: BankSlip,
        filter: condition,
      });
      const result = [];
      for await (const payload of iterator) {
        result.push(payload);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAll(): Promise<BankSlip[]> {
    const result = [];
    for await (const item of this.mapper.scan(BankSlip)) {
      result.push(item);
    }
    return result;
  }
}

export default new BankSlipRepository();

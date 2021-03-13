/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Repository from '../common/classes/Repository';
import Payload from '../models/Payload';
import { uuid } from '../common/lib/uuid';

interface LogCreateData {
  method: string;
  url: string;
  origin: string;
  identity: Record<string, any>;
  payload: Record<string, any>;
  response: Record<string, any>;
}

class PayloadsRepository implements Repository {
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
    method,
    url,
    origin,
    identity,
    payload,
    response,
  }: LogCreateData): Promise<Payload> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new Payload(), {
        id: uuid(),
        method,
        url,
        origin,
        identity,
        payload,
        response,
        createdAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [log payload table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-payload-log] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const updatedItem = await this.mapper.get(
      Object.assign(new Payload(), { id })
    );
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  remove(id: string): Promise<any> {
    return this.mapper.delete(Object.assign(new Payload(), { id }));
  }

  findById(id: string): Promise<Payload> {
    const toFetch = new Payload();
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

  async findOne(parameter: { value: any; field: string }): Promise<Payload> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Payload,
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

  async find(parameter: { value: any; field: string }): Promise<Payload[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Payload,
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

  async getAll(): Promise<Payload[]> {
    const result = [];
    for await (const item of this.mapper.scan(Payload)) {
      result.push(item);
    }
    return result;
  }
}

export default new PayloadsRepository();

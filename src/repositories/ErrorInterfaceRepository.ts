/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Repository from '../common/classes/Repository';
import ErrorInterface from '../models/ErrorInterface';
import { uuid } from '../common/lib/uuid';

interface ErrorCreateData {
  level: string;
  system: string;
  event: string;
  httpCode?: number;
  message?: string;
  customerId?: string;
  relatedId: string;
  action: string;
  queueMessage: string;
}

class ErrorInterfaceRepository implements Repository {
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
    relatedId,
    level,
    system,
    action,
    event,
    httpCode,
    message,
    queueMessage,
    customerId,
  }: ErrorCreateData): Promise<ErrorInterface> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new ErrorInterface(), {
        id: uuid(),
        relatedId,
        level,
        system,
        event,
        action,
        httpCode,
        message,
        queueMessage,
        customerId,
        retries: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [error-interface table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-error-interface] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const updatedItem = await this.mapper.get(
      Object.assign(new ErrorInterface(), { id })
    );
    updatedItem.updatedAt = new Date();
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  remove(id: string): Promise<any> {
    return this.mapper.delete(Object.assign(new ErrorInterface(), { id }));
  }

  findById(id: string): Promise<ErrorInterface> {
    const toFetch = new ErrorInterface();
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
  }): Promise<ErrorInterface> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: ErrorInterface,
        filter: condition,
      });
      const result = [];
      for await (const data of iterator) {
        result.push(data);
      }
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: {
    value: any;
    field: string;
  }): Promise<ErrorInterface[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: ErrorInterface,
        filter: condition,
      });
      const result = [];
      for await (const data of iterator) {
        result.push(data);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findByTwoParameters(
    parameter1: {
      value: any;
      field: string;
    },
    parameter2: { value: any; field: string }
  ): Promise<ErrorInterface[]> {
    const condition: ConditionExpression = {
      type: 'And',
      conditions: [
        {
          ...equals(parameter1.value),
          subject: parameter1.field,
        },
        {
          ...equals(parameter2.value),
          subject: parameter2.field,
        },
      ],
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: ErrorInterface,
        filter: condition,
      });
      const result = [];
      for await (const phone of iterator) {
        result.push(phone);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAll(): Promise<ErrorInterface[]> {
    const result = [];
    for await (const item of this.mapper.scan(ErrorInterface)) {
      result.push(item);
    }
    return result;
  }
}

export default new ErrorInterfaceRepository();

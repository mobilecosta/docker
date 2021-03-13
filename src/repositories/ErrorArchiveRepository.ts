/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import ErrorArchive from '../models/ErrorArchive';

interface ErrorCreateData {
  id: string;
  relatedId: string;
  level: string;
  system: string;
  event: string;
  httpCode: number;
  message: string;
  queueMessage: string;
  retries: number;
  action: string;
  createdAt: Date;
}

class ErrorArchiveRepository {
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
    id,
    relatedId,
    level,
    system,
    event,
    httpCode,
    message,
    queueMessage,
    retries,
    action,
    createdAt,
  }: ErrorCreateData): Promise<ErrorArchive> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new ErrorArchive(), {
        id,
        relatedId,
        level,
        system,
        event,
        action,
        httpCode,
        message,
        queueMessage,
        retries,
        resolvedAt: new Date(),
        createdAt,
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [error-archive table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-error-archive] - ${error}`);
          reject(error.message);
        });
    });
  }

  findById(id: string): Promise<ErrorArchive> {
    const toFetch = new ErrorArchive();
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
  }): Promise<ErrorArchive> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: ErrorArchive,
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
  }): Promise<ErrorArchive[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: ErrorArchive,
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

  async getAll(): Promise<ErrorArchive[]> {
    const result = [];
    for await (const item of this.mapper.scan(ErrorArchive)) {
      result.push(item);
    }
    return result;
  }
}

export default new ErrorArchiveRepository();

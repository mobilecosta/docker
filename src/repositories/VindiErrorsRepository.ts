import { DataMapper, ItemNotFoundException } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import VindiErrors from '../models/VindiErrors';
import { uuid } from '../common/lib/uuid';

interface VindiErrorsCreateData {
  event: string;
  action: string;
  payload: Record<string, any>;
  response: Record<string, any>;
  customerId?: string;
  queueMessage: Record<string, any>;
}

interface ParametersFind {
  value: any;
  field: string;
}

class VindiErrorsRepository {
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
    event,
    action,
    payload,
    response,
    customerId,
    queueMessage,
  }: VindiErrorsCreateData): Promise<VindiErrors> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new VindiErrors(), {
        id: uuid(),
        event,
        action,
        payload,
        response,
        customerId,
        queueMessage,
        retries: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [licenciador errors table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-licenciador errors] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<VindiErrors> {
    const updatedItem = await this.mapper.get(
      Object.assign(new VindiErrors(), { id })
    );
    updatedItem.updatedAt = new Date();
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  async remove(id: string): Promise<VindiErrors | undefined> {
    const data = await this.mapper.delete(
      Object.assign(new VindiErrors(), { id })
    );
    return data;
  }

  async findById(id: string): Promise<VindiErrors | undefined> {
    try {
      const data = await this.mapper.get(
        Object.assign(new VindiErrors(), { id })
      );
      return data;
    } catch (error) {
      if (error instanceof ItemNotFoundException) {
        return undefined;
      }
      throw new Error(error);
    }
  }

  async findOne(parameter: {
    value: any;
    field: string;
  }): Promise<VindiErrors> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const result = [];
      for await (const error of this.mapper.scan(VindiErrors, {
        filter: condition,
      })) {
        result.push(error);
      }
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: { value: any; field: string }): Promise<VindiErrors[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const result = [];
      for await (const error of this.mapper.scan(VindiErrors, {
        filter: condition,
        limit: 150,
      })) {
        result.push(error);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findByManyParameters(data: ParametersFind[]): Promise<VindiErrors[]> {
    const condition: ConditionExpression = {
      type: 'And',
      conditions: data.map(item => {
        return {
          ...equals(item.value),
          subject: item.field,
        };
      }),
    };
    try {
      const result = [];
      for await (const error of this.mapper.scan(VindiErrors, {
        filter: condition,
        limit: 150,
      })) {
        result.push(error);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAll(): Promise<VindiErrors[]> {
    const result = [];
    for await (const item of this.mapper.scan(VindiErrors)) {
      result.push(item);
    }
    return result;
  }
}

export default new VindiErrorsRepository();

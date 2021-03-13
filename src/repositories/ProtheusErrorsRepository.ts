import { DataMapper, ItemNotFoundException } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import ProtheusErrors from '../models/ProtheusErrors';
import { uuid } from '../common/lib/uuid';

interface ProtheusErrorsCreateData {
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

class ProtheusErrorsRepository {
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
  }: ProtheusErrorsCreateData): Promise<ProtheusErrors> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new ProtheusErrors(), {
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
            `new item added in table [Protheus errors table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-protheus errors] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<ProtheusErrors> {
    const updatedItem = await this.mapper.get(
      Object.assign(new ProtheusErrors(), { id })
    );
    updatedItem.updatedAt = new Date();
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  async remove(id: string): Promise<ProtheusErrors | undefined> {
    const data = await this.mapper.delete(
      Object.assign(new ProtheusErrors(), { id })
    );
    return data;
  }

  async findById(id: string): Promise<ProtheusErrors | undefined> {
    try {
      const data = await this.mapper.get(
        Object.assign(new ProtheusErrors(), { id })
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
  }): Promise<ProtheusErrors> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const result = [];
      for await (const error of this.mapper.scan(ProtheusErrors, {
        filter: condition,
      })) {
        result.push(error);
      }
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: { value: any; field: string }): Promise<ProtheusErrors[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const result = [];
      for await (const error of this.mapper.scan(ProtheusErrors, {
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

  async findByManyParameters(data: ParametersFind[]): Promise<ProtheusErrors[]> {
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
      for await (const error of this.mapper.scan(ProtheusErrors, {
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

  async getAll(): Promise<ProtheusErrors[]> {
    const result = [];
    for await (const item of this.mapper.scan(ProtheusErrors)) {
      result.push(item);
    }
    return result;
  }
}

export default new ProtheusErrorsRepository();
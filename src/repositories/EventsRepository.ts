import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Events from '../models/Events';
import { uuid } from '../common/lib/uuid';

interface EventsCreateRequest {
  codeEvent: string;
  relatedId: string;
  payload: Record<string, any>;
  status: string;
  transaction?: string;
  migrated?: boolean;
}

class EventsRepository {
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
    codeEvent,
    relatedId,
    payload,
    status,
    transaction,
    migrated,
  }: EventsCreateRequest): Promise<Events> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new Events(), {
        id: uuid(),
        codeEvent,
        relatedId,
        payload,
        status,
        transaction,
        migrated,
        createdAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [events table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-event] - ${error}`);
          reject(error.message);
        });
    });
  }

  async find(parameter: { value: any; field: string }): Promise<Events[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Events,
        filter: condition,
      });
      const result = [];
      for await (const event of iterator) {
        result.push(event);
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
  ): Promise<Events[]> {
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
        valueConstructor: Events,
        filter: condition,
      });
      const result = [];
      for await (const event of iterator) {
        result.push(event);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

export default new EventsRepository();

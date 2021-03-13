import { DataMapper, ItemNotFoundException } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import { uuid } from '../common/lib/uuid';
import MessageTemplate, { SendType, Template, TemplateType } from '../models/MessageTemplate';

interface MessageTemplateCreateData {
  templateType: TemplateType;
  templates: Record<SendType, Template>;
}

interface ParametersFind {
  value: any;
  field: string;
}

class MessageTemplateRepository { 
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

  create(data: MessageTemplateCreateData): Promise<MessageTemplate> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new MessageTemplate(), {
        id: uuid(),
        templateType: data.templateType,
        templates: data.templates       
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [MessageTemplate errors table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-MessageTemplate errors] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<MessageTemplate> {
    const updatedItem = await this.mapper.get(
      Object.assign(new MessageTemplate(), { id })
    );
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  async remove(id: string): Promise<MessageTemplate | undefined> {
    const data = await this.mapper.delete(
      Object.assign(new MessageTemplate(), { id })
    );
    return data;
  }

  async findById(id: string): Promise<MessageTemplate | undefined> {
    try {
      const data = await this.mapper.get(
        Object.assign(new MessageTemplate(), { id })
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
  }): Promise<MessageTemplate> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const result = [];
      for await (const error of this.mapper.scan(MessageTemplate, {
        filter: condition,
      })) {
        result.push(error);
      }
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: { value: any; field: string }): Promise<MessageTemplate[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const result = [];
      for await (const error of this.mapper.scan(MessageTemplate, {
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

  async findByManyParameters(data: ParametersFind[]): Promise<MessageTemplate[]> {
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
      for await (const error of this.mapper.scan(MessageTemplate, {
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

  async getAll(): Promise<MessageTemplate[]> {
    const result = [];
    for await (const item of this.mapper.scan(MessageTemplate)) {
      result.push(item);
    }
    return result;
  }
}

export default new MessageTemplateRepository();
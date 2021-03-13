/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import CustomerPhone from '../models/CustomerPhone';
import { uuid } from '../common/lib/uuid';

interface PhoneCreateData {
  phoneType: string;
  authorizesSMS: boolean;
  authorizesWhatsApp: boolean;
  default: boolean;
  validated: boolean;
  phone: {
    country: string;
    area: string;
    number: string;
    extension: string;
  };
}

class CustomersPhoneRepository {
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

  async create(
    customerId: string,
    data: PhoneCreateData
  ): Promise<CustomerPhone> {
    const phoneNumber = `${data.phone.country}${data.phone.area}${data.phone.number}`;
    if (data.default) {
      const phonesByCustomer = await this.findByTwoParameters(
        {
          value: customerId,
          field: 'customer_id',
        },
        {
          value: true,
          field: 'default',
        }
      );
      if (phonesByCustomer.length > 0) {
        for await (const phone of phonesByCustomer) {
          await this.update(phone.id, { default: false });
        }
        // phonesByCustomer.forEach(async item => {
        //   await this.update(item.id, { default: false });
        // });
      }
    }
    const alreadyExists = await this.findByTwoParameters(
      {
        value: customerId,
        field: 'customer_id',
      },
      {
        value: phoneNumber,
        field: 'number',
      }
    );
    if (alreadyExists.length > 0) {
      return this.update(alreadyExists[0].id, {
        sms: {
          acceptedReceive: data.authorizesSMS,
          acceptanceDate: new Date(),
        },
        whatsapp: {
          acceptedReceive: data.authorizesWhatsApp,
          acceptanceDate: new Date(),
        },
        validated: data.validated,
        default: data.default,
        type: data.phoneType,
        extension: data.phone.extension,
      });
    }
    const toSave = Object.assign(new CustomerPhone(), {
      id: uuid(),
      number: phoneNumber,
      customerId,
      sms: {
        acceptedReceive: data.authorizesSMS,
        acceptanceDate: new Date(),
      },
      whatsapp: {
        acceptedReceive: data.authorizesWhatsApp,
        acceptanceDate: new Date(),
      },
      type: data.phoneType,
      validated: data.validated || false,
      default: data.default,
      extension: data.phone.extension,
      updatedAt: new Date(),
      createdAt: new Date(),
    });
    return this.mapper.put(toSave);
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const updatedItem = await this.mapper.get(
      Object.assign(new CustomerPhone(), { id })
    );
    updatedItem.updatedAt = new Date();
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  remove(id: string): Promise<any> {
    return this.mapper.delete(Object.assign(new CustomerPhone(), { id }));
  }

  async findById(id: string): Promise<CustomerPhone> {
    const toFetch = new CustomerPhone();
    toFetch.id = id;
    try {
      const item = await this.mapper.get({ item: toFetch });
      // @ts-ignore
      return item;
    } catch (error) {
      if (error.code !== 'ResourceNotFoundException') {
        // @ts-ignore
        return undefined;
      }
      throw new Error(error.message);
    }
  }

  async findOne(parameter: {
    value: any;
    field: string;
  }): Promise<CustomerPhone> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: CustomerPhone,
        filter: condition,
      });
      const result = [];
      for await (const phone of iterator) {
        result.push(phone);
      }
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: {
    value: any;
    field: string;
  }): Promise<CustomerPhone[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: CustomerPhone,
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

  async findByTwoParameters(
    parameter1: {
      value: any;
      field: string;
    },
    parameter2: { value: any; field: string }
  ): Promise<CustomerPhone[]> {
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
        valueConstructor: CustomerPhone,
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

  async getAll(): Promise<CustomerPhone[]> {
    const result = [];
    for await (const item of this.mapper.scan(CustomerPhone)) {
      result.push(item);
    }
    return result;
  }
}

export default new CustomersPhoneRepository();

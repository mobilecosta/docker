/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Repository from '../../common/classes/Repository';
import Customer from '../../models/Customer';

interface CustomerCreateData {
  id: string;
  name: string;
  trade?: string;
  email: string;
  isLegalEntity: boolean;
  registryCode: string;
  registryStateCode?: string;
  cnae?: string;
  notes?: string;
  contactPerson?: string;
  website?: string;
  address: {
    street: string;
    number: string;
    additionalDetails?: string;
    zipcode: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  isOver16: boolean;
  over16Metadata: {
    ip: string;
    details: string;
  };
}

class CustomerRepository implements Repository {
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
    name,
    trade,
    email,
    isLegalEntity,
    registryCode,
    registryStateCode,
    cnae,
    notes,
    contactPerson,
    website,
    address,
    isOver16,
    over16Metadata,
  }: CustomerCreateData): Promise<Customer> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new Customer(), {
        id,
        name,
        trade,
        email,
        isLegalEntity,
        registryCode,
        registryStateCode,
        cnae,
        notes,
        contactPerson,
        website,
        address,
        isOver16,
        over16Metadata,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [customer table] - id: ${objectSaved.id}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-customer] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const updatedItem = await this.mapper.get(
      Object.assign(new Customer(), { id })
    );
    updatedItem.updatedAt = new Date();
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  remove(id: string): Promise<any> {
    return this.mapper.delete(Object.assign(new Customer(), { id }));
  }

  findById(id: string): Promise<Customer> {
    const toFetch = new Customer();
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

  async findOne(parameter: { value: any; field: string }): Promise<Customer> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Customer,
        filter: condition,
      });
      const result = [];
      for await (const customer of iterator) {
        result.push(customer);
      }
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: { value: any; field: string }): Promise<Customer[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Customer,
        filter: condition,
      });
      const result = [];
      for await (const customer of iterator) {
        result.push(customer);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAll(): Promise<Customer[]> {
    const result = [];
    for await (const item of this.mapper.scan(Customer)) {
      result.push(item);
    }
    return result;
  }
}

export default new CustomerRepository();

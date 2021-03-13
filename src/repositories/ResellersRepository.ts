/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import Repository from '../common/classes/Repository';
import Reseller from '../models/Reseller';

interface ResellerCreateData {
  resellerId: string;
  name: string;
  address: {
    street: string;
    zipcode: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  phone: {
    area: string;
    number: string;
  };
  cnpjCpf: string;
  stateRegistryCode: string;
  municipalRegistryCode: string;
  office: string;
  cellphone: {
    area: string;
    number: string;
  };
  agn: string;
  costCenter: string;
  login: string;
  email: string;
}

class ResellerRepository implements Repository {
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
    resellerId,
    name,
    address,
    phone,
    cnpjCpf,
    stateRegistryCode,
    municipalRegistryCode,
    office,
    cellphone,
    agn,
    costCenter,
    login,
    email,
  }: ResellerCreateData): Promise<Reseller> {
    return new Promise((resolve, reject) => {
      const toSave = Object.assign(new Reseller(), {
        resellerId,
        name,
        address,
        phone,
        cnpjCpf,
        stateRegistryCode,
        municipalRegistryCode,
        office,
        cellphone,
        agn,
        costCenter,
        login,
        email,
        sentToProtheus: false,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      this.mapper
        .put(toSave)
        .then(objectSaved => {
          console.info(
            `new item added in table [reseller table] - id: ${objectSaved.resellerId}`
          );
          resolve(objectSaved);
        })
        .catch(error => {
          console.error(`Error: [create-reseller] - ${error}`);
          reject(error.message);
        });
    });
  }

  async update(id: string, fields: Record<string, any>): Promise<any> {
    const updatedItem = await this.mapper.get(
      Object.assign(new Reseller(), { reseller_id: id })
    );
    updatedItem.updatedAt = new Date();
    Object.assign(updatedItem, fields);
    return this.mapper.update(updatedItem);
  }

  remove(id: string): Promise<any> {
    return this.mapper.delete(
      Object.assign(new Reseller(), { reseller_id: id })
    );
  }

  findById(id: string): Promise<Reseller> {
    const toFetch = new Reseller();
    toFetch.resellerId = id;
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

  async findOne(parameter: { value: any; field: string }): Promise<Reseller> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Reseller,
        filter: condition,
      });
      const result = [];
      for await (const reseller of iterator) {
        result.push(reseller);
      }
      return result[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async find(parameter: { value: any; field: string }): Promise<Reseller[]> {
    const condition: ConditionExpression = {
      ...equals(parameter.value),
      subject: parameter.field,
    };
    try {
      const iterator = this.mapper.scan({
        valueConstructor: Reseller,
        filter: condition,
      });
      const result = [];
      for await (const reseller of iterator) {
        result.push(reseller);
      }
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAll(): Promise<Reseller[]> {
    const result = [];
    for await (const item of this.mapper.scan(Reseller)) {
      result.push(item);
    }
    return result;
  }
}

export default new ResellerRepository();

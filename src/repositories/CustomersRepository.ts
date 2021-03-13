/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable default-case */
/* eslint-disable no-restricted-syntax */
import { DataMapper } from '@aws/dynamodb-data-mapper';
import { ConditionExpression, equals } from '@aws/dynamodb-expressions';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import CustomerPhone from '../models/CustomerPhone';
import Customer from '../models/Customer';
import phoneRepository from './CustomersPhoneRepository';

import { uuid } from '../common/lib/uuid';

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

const mapper = new DataMapper({
  client,
  tableNamePrefix: `${process.env.ENV}_`,
});

interface Phone {
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

export const customerPhoneAlreadyRegistered = async (
  customerId: string,
  phoneNumber: string
): Promise<CustomerPhone | undefined> => {
  const condition: ConditionExpression = {
    type: 'And',
    conditions: [
      {
        ...equals(customerId),
        subject: 'customer_id',
      },
      {
        ...equals(phoneNumber),
        subject: 'number',
      },
    ],
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: CustomerPhone,
      filter: condition,
    });
    const result: Array<CustomerPhone> = [];
    for await (const phone of iterator) {
      result.push(phone);
    }
    return result[0] || undefined;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const addCustomerPhone = async (customerId: string, record: Phone) => {
  const phoneNumber = `${record.phone.country}${record.phone.area}${record.phone.number}`;
  const registered = await customerPhoneAlreadyRegistered(
    customerId,
    phoneNumber
  );
  if (record.default) {
    const phonesByCustomer = await findCustomerPhoneByParameters(
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
      phonesByCustomer.forEach(async item => {
        await updateCustomerPhone(item.id, { default: false });
      });
    }
  }
  if (registered) {
    if (record.default) {
      await updateCustomerPhone(registered.id, {
        default: true,
      });
    }
    await updateCustomerPhone(registered.id, {
      sms: {
        acceptedReceive: record.authorizesSMS,
        acceptanceDate: new Date(),
      },
      whatsapp: {
        acceptedReceive: record.authorizesWhatsApp,
        acceptanceDate: new Date(),
      },
      type: record.phoneType,
      extension: record.phone.extension,
    });
    return new Promise((resolve, reject) => {
      resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const toSave = Object.assign(new CustomerPhone(), {
      id: uuid(),
      number: phoneNumber,
      customerId,
      sms: {
        acceptedReceive: record.authorizesSMS,
        acceptanceDate: new Date(),
      },
      whatsapp: {
        acceptedReceive: record.authorizesWhatsApp,
        acceptanceDate: new Date(),
      },
      type: record.phoneType,
      validated: record.validated || false,
      default: record.default,
      extension: record.phone.extension,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mapper
      .put(toSave)
      .then(objectSaved => {
        console.log(
          `new item added in [customers-phone table] - id: ${objectSaved.id}`
        );
        resolve(true);
      })
      .catch(error => {
        console.error(`Error: [create-customer-phone] - ${error}`);
        reject(error.message);
      });
  });
};

export const createCustomer = async ({
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
  codeT,
}: Customer): Promise<boolean> => {
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
      codeT,
      over16Metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mapper
      .put(toSave)
      .then(async objectSaved => {
        console.log(
          `new item added in [customers table] - id: ${objectSaved.id}`
        );
      })
      .then(() => resolve(true))
      .catch(error => {
        console.error(`Error: [create-customer] - ${error}`);
        reject(error.message);
      });
  });
};

export const showPhonesByCustomer = async (
  customerId: string
): Promise<CustomerPhone[]> => {
  const condition: ConditionExpression = {
    ...equals(customerId),
    subject: 'customer_id',
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: CustomerPhone,
      filter: condition,
    });
    const result: Array<CustomerPhone> = [];
    for await (const phone of iterator) {
      result.push(phone);
    }
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const customerfindById = async (id: string): Promise<any> => {
  const toFetch = new Customer();
  toFetch.id = id;
  const customerPhones = await phoneRepository.find({
    value: id,
    field: 'customer_id',
  });
  const phones = Promise.all(
    customerPhones.map(item => {
      return {
        phoneType: item.type,
        number: item.number,
        extension: item.extension,
        sms: item.sms,
        whatsapp: item.whatsapp,
      };
    })
  );
  // @ts-ignore
  return mapper
    .get({ item: toFetch })
    .then(async item => {
      return {
        ...item,
        phones: await phones,
      };
    })
    .catch(error => {
      if (error.code !== 'ResourceNotFoundException') {
        return undefined;
      }
      throw new Error(error);
    });
};

export const customerfindByMail = async (
  email: string
): Promise<Customer[]> => {
  const condition: ConditionExpression = {
    ...equals(
      email
        .normalize('NFD')
        .toUpperCase()
        .replace(/[\u0300-\u036f]/g, '')
    ),
    subject: 'email',
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: Customer,
      filter: condition,
    });
    const result: Array<any> = [];
    for await (const customer of iterator) {
      const customerPhones = await phoneRepository.find({
        value: customer.id,
        field: 'customer_id',
      });
      const phones = Promise.all(
        customerPhones.map(item => {
          return {
            phoneType: item.type,
            number: item.number,
            extension: item.extension,
            sms: item.sms,
            whatsapp: item.whatsapp,
          };
        })
      );
      result.push({
        ...customer,
        phones: await phones,
      });
    }
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const customerfindByRegistryCode = async (
  registryCode: string
): Promise<Customer[]> => {
  const condition: ConditionExpression = {
    ...equals(registryCode.replace(/([^0-9])/g, '')),
    subject: 'registryCode',
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: Customer,
      filter: condition,
    });
    const result: Array<any> = [];
    for await (const customer of iterator) {
      // const phones = await showPhonesByCustomer(customer.id);
      const customerPhones = await phoneRepository.find({
        value: customer.id,
        field: 'customer_id',
      });
      const phones = Promise.all(
        customerPhones.map(item => {
          return {
            phoneType: item.type,
            number: item.number,
            extension: item.extension,
            sms: item.sms,
            whatsapp: item.whatsapp,
          };
        })
      );
      result.push({
        ...customer,
        phones: await phones,
      });
    }
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const updateFieldsCustomerToVindi = async (
  id: string,
  vindiCode: string
) => {
  const updatedItem = await mapper.get(Object.assign(new Customer(), { id }));
  updatedItem.vindiSentAt = new Date();
  updatedItem.updatedAt = new Date();
  updatedItem.vindiCode = vindiCode;

  return mapper.update(updatedItem);
};

export const updateFieldsCustomerToStore = async (id: string) => {
  const updatedItem = await mapper.get(Object.assign(new Customer(), { id }));
  updatedItem.storeSentAt = new Date();
  updatedItem.updatedAt = new Date();

  return mapper.update(updatedItem);
};

export const updateFieldsCustomerToProtheus = async (id: string) => {
  const updatedItem = await mapper.get(Object.assign(new Customer(), { id }));
  updatedItem.protheusSentAt = new Date();
  updatedItem.updatedAt = new Date();

  return mapper.update(updatedItem);
};

export const updateFieldsCustomerToLicenciador = async (
  id: string,
  codeLicenciador: string
) => {
  const updatedItem = await mapper.get(Object.assign(new Customer(), { id }));
  updatedItem.codeLicenciador = codeLicenciador;
  updatedItem.licenciadorSentAt = new Date();
  updatedItem.updatedAt = new Date();

  return mapper.update(updatedItem);
};

export const customerUpdateFields = async (id: string, fields: any) => {
  const updatedItem = await mapper.get(Object.assign(new Customer(), { id }));
  const data = fields;
  if (data.phones) {
    const { phones } = data;
    delete data.phones;
    await addCustomerPhone(id, phones);
  }
  updatedItem.updatedAt = new Date();
  Object.assign(updatedItem, data);
  return mapper.update(updatedItem);
};

export const getMobilePhonesByCustomer = async (
  customerId: string
): Promise<CustomerPhone> => {
  const condition: ConditionExpression = {
    type: 'And',
    conditions: [
      {
        ...equals(true),
        subject: 'default',
      },
      {
        ...equals(customerId),
        subject: 'customer_id',
      },
      {
        ...equals('mobile'),
        subject: 'type',
      },
    ],
  };
  try {
    const iterator = mapper.scan({
      valueConstructor: CustomerPhone,
      filter: condition,
    });
    const result: Array<CustomerPhone> = [];
    for await (const phone of iterator) {
      result.push(phone);
    }
    return result[0];
  } catch (error) {
    throw new Error(error.message);
  }
};

export const updateCustomerPhone = async (
  id: string,
  fields: Record<string, any>
): Promise<any> => {
  const updatedItem = await mapper.get(
    Object.assign(new CustomerPhone(), { id })
  );
  updatedItem.updatedAt = new Date();
  Object.assign(updatedItem, fields);
  return mapper.update(updatedItem);
};

export const findCustomerPhoneByParameters = async (
  parameter1: {
    value: any;
    field: string;
  },
  parameter2: { value: any; field: string }
): Promise<CustomerPhone[]> => {
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
    const iterator = mapper.scan({
      valueConstructor: CustomerPhone,
      filter: condition,
    });
    const result = [];
    for await (const cf of iterator) {
      result.push(cf);
    }
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

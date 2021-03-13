/* eslint-disable @typescript-eslint/ban-ts-ignore */
import * as Joi from '@hapi/joi';
import { APIGatewayProxyEvent, APIGatewayEvent } from 'aws-lambda';
import { hash256 } from '../../../common/lib/uuid';
import CustomerDTO from '../interfaces/customerdto.interface';
import RequestInterface from '../interfaces/request.interface';
import { sendToQueue } from '../../../common/lib/sqs';

import InvokeLambda from '../../../common/lib/lambdaAdapter';
import BureauService from '../../../common/services/BureauService';
import CustomerRepository from '../../../repositories/v2/CustomerRepository';
import {
  customerfindById,
  customerfindByRegistryCode,
} from '../../../repositories/CustomersRepository';

const schema = Joi.object({
  name: Joi.string().required(),
  trade: Joi.string().allow('').optional(),
  email: Joi.string().email().required(),
  isLegalEntity: Joi.boolean().required(),
  registryCode: Joi.string().required(),
  registryStateCode: Joi.string().allow('').optional(),
  cnae: Joi.string().allow('').optional(),
  notes: Joi.string().allow('').optional(),
  contactPerson: Joi.string().allow('').optional(),
  website: Joi.string().allow('').optional(),
  address: Joi.object({
    street: Joi.string().required(),
    number: Joi.string().required(),
    additionalDetails: Joi.string().allow('').optional(),
    zipcode: Joi.string().required(),
    neighborhood: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
  }).required(),
  phones: Joi.array().items(
    Joi.object({
      authorizesSMS: Joi.boolean().required(),
      authorizesWhatsApp: Joi.boolean().required(),
      phoneType: Joi.string().valid('mobile', 'landline').required(),
      default: Joi.boolean().required(),
      validated: Joi.boolean().required(),
      phone: Joi.object({
        country: Joi.string().required().max(2),
        area: Joi.string().required().max(2).min(2),
        number: Joi.string().required().max(9).min(8),
        extension: Joi.string().allow('').optional(),
      }).required(),
    })
  ),
  isOver16: Joi.boolean().required(),
  over16Metadata: Joi.object({
    ip: Joi.string()
      .ip({
        version: ['ipv4', 'ipv6'],
        cidr: 'optional',
      })
      .required(),
    details: Joi.string().required(),
  }),
  idProtheus: Joi.string().optional(),
});

class CreateCustomerService {
  body: RequestInterface;

  constructor(body: string) {
    if (!body) {
      throw new Error('Invalid Request');
    }
    this.body = JSON.parse(body);
    const { error } = schema.validate(this.body);
    if (error) {
      console.log(error);
      const resultError = error.details.map(err => {
        const data = err.message;
        return data.replace(/[-^#]|[?|{}\\/"']/g, '');
      });
      throw new Error(resultError.toString());
    }
  }

  public async run(event: APIGatewayEvent): Promise<CustomerDTO> {
    try {
      if (this.body.registryStateCode === '') {
        this.body.registryStateCode = undefined;
      }
      const customer: CustomerDTO = {
        id: hash256(`${this.body.registryCode}${this.body.email}`),
        ...this.body,
        codeT: this.body.idProtheus || '',
      };

      let result = await this.verifyCustomerExists(customer);
      if (!result) {
        result = await this.validateCustomerData(customer, event);

        await sendToQueue(
          JSON.stringify({ ...result, codeT: this.body.idProtheus || '' }),
          `${process.env.CUSTOMERS_QUEUE}`
        );
        return { ...result, action: 'NEW_CUSTOMER' };
      }
      return { ...result, action: 'CUSTOMER_ALREADY_EXISTS' };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  private async validateCustomerData(
    data: CustomerDTO,
    event: APIGatewayEvent
  ): Promise<CustomerDTO> {
    const customer: CustomerDTO = data;
    if (customer.registryStateCode) {
      customer.registryStateCode = this.sanitize(customer.registryStateCode!);
    }
    if (customer.isLegalEntity && !customer.registryStateCode) {
      customer.registryStateCode = 'ISENTO';
    }
    if (!customer.isOver16) {
      throw new Error('Customer Must be Over 16 Years Old');
    }
    customer.cnae = '';
    customer.registryCode = this.sanitize(customer.registryCode);
    customer.address.zipcode = this.sanitize(customer.address.zipcode);

    // eslint-disable-next-line consistent-return
    function isDefaultPhone(item: any) {
      if (item.default) {
        return item;
      }
    }
    const defaultPhones = customer.phones.filter(isDefaultPhone);

    if (defaultPhones.length > 1)
      throw new Error('Only 1(one) phone can be default');

    if (defaultPhones.length === 0)
      throw new Error('1 (one) phone must be indicated as the default');

    if (defaultPhones[0].phoneType !== 'mobile') {
      throw new Error('The default phone must be a mobile phone');
    }

    const validateDocument: APIGatewayProxyEvent = event;
    if (customer.isLegalEntity) {
      validateDocument.body = JSON.stringify({ cnpj: customer.registryCode });
    } else {
      validateDocument.body = JSON.stringify({
        cpf: customer.registryCode,
      });
    }

    const functionName = `${process.env.APPNAME}-${process.env.ENV}-validateCpfCnpj`;

    const documentResponse = await InvokeLambda.invoke(
      functionName,
      validateDocument
    );
    const payload = JSON.parse(documentResponse.Payload as string);
    if (payload.statusCode > 201) {
      const body = JSON.parse(payload.body);
      throw new Error(body.message);
    }

    const validateCEP: APIGatewayProxyEvent = event;
    validateCEP.pathParameters = { cep: customer.address.zipcode };
    const cepLambda = `${process.env.APPNAME}-${process.env.ENV}-consultaCEP`;

    const cepResponse = await InvokeLambda.invoke(cepLambda, validateCEP);
    const payloadCEP = JSON.parse(cepResponse.Payload as string);

    if (payloadCEP.statusCode > 201) {
      if (!customer.codeT || customer.registryCode.length < 14) {
        const bodyCEP = JSON.parse(payloadCEP.body);
        throw new Error(bodyCEP.error);
      }

      const bureauAddress = await BureauService.getLastValidAddressByDocument(
        customer.registryCode
      );

      if (bureauAddress == null) {
        const bodyCEP = JSON.parse(payloadCEP.body);
        throw new Error(bodyCEP.error);
      }

      customer.address.additionalDetails = bureauAddress.additionalDetails;
      customer.address.city = bureauAddress.city;
      customer.address.neighborhood = bureauAddress.neighborhood;
      customer.address.number = bureauAddress.number;
      customer.address.state = bureauAddress.state;
      customer.address.street = bureauAddress.street;
      customer.address.zipcode = bureauAddress.zipcode;
    }

    customer.name = customer.name
      .normalize('NFD')
      .toUpperCase()
      .replace(/[\u0300-\u036f]/g, '');
    customer.trade = customer.trade
      ? customer.trade
          .normalize('NFD')
          .toUpperCase()
          .replace(/[\u0300-\u036f]/g, '')
      : '';
    customer.email = customer.email
      .normalize('NFD')
      .toUpperCase()
      .replace(/[\u0300-\u036f]/g, '');
    customer.notes = customer.notes
      ? customer.notes
          .normalize('NFD')
          .toUpperCase()
          .replace(/[\u0300-\u036f]/g, '')
      : '';
    customer.contactPerson = customer.contactPerson
      ? customer.contactPerson
          .normalize('NFD')
          .toUpperCase()
          .replace(/[\u0300-\u036f]/g, '')
      : '';
    customer.website = customer.website
      ? customer.website
          .normalize('NFD')
          .toUpperCase()
          .replace(/[\u0300-\u036f]/g, '')
      : '';
    customer.address = {
      street: customer.address.street
        .normalize('NFD')
        .toUpperCase()
        .replace(/[\u0300-\u036f]/g, ''),
      number: customer.address.number,
      neighborhood: customer.address.neighborhood
        .normalize('NFD')
        .toUpperCase()
        .replace(/[\u0300-\u036f]/g, ''),
      additionalDetails: customer.address.additionalDetails
        ? customer.address.additionalDetails
            .normalize('NFD')
            .toUpperCase()
            .replace(/[\u0300-\u036f]/g, '')
        : '',
      zipcode: customer.address.zipcode
        .normalize('NFD')
        .toUpperCase()
        .replace(/[\u0300-\u036f]/g, ''),
      city: customer.address.city
        .normalize('NFD')
        .toUpperCase()
        .replace(/[\u0300-\u036f]/g, ''),
      state: customer.address.state
        .normalize('NFD')
        .toUpperCase()
        .replace(/[\u0300-\u036f]/g, ''),
    };

    return customer;
  }

  private async verifyCustomerExists({
    id,
    registryCode,
  }: CustomerDTO): Promise<any> {
    // const customerById = await CustomerRepository.findById(id);
    // if (customerById) {
    //   throw new Error('Customer already exists.');
    // }

    // // const customerByMail = await CustomerRepository.findOne({
    // //   value: email,
    // //   field: 'email',
    // // });
    // const customerByDocument = await CustomerRepository.findOne({
    //   value: registryCode,
    //   field: 'registry_code',
    // });
    // if (customerByDocument) {
    //   throw new Error('Customer already exists. Document Found.');
    // }
    try {
      return (
        (await customerfindById(id)) ||
        (await customerfindByRegistryCode(registryCode))[0]
      );
    } catch (error) {
      console.log(error);
      throw new Error(error.message);
    }
  }

  private sanitize(str: string): string {
    return str.replace(/([^0-9])/g, '');
  }
}

export default CreateCustomerService;

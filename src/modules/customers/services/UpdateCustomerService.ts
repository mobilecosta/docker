/* eslint-disable @typescript-eslint/ban-ts-ignore */
import * as Joi from '@hapi/joi';
import { APIGatewayEvent, APIGatewayProxyEvent } from 'aws-lambda';
import UpdateRequestInterface from '../interfaces/update-request.interface';
import {
  customerfindById,
  customerUpdateFields,
  findCustomerPhoneByParameters,
  customerPhoneAlreadyRegistered,
} from '../../../repositories/CustomersRepository';
import { sanitize } from '../../../common/lib/functions';
import InvokeLambda from '../../../common/lib/lambdaAdapter';
import { sendToQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';

const schema = Joi.object({
  trade: Joi.string().allow('').optional(),
  cnae: Joi.string().allow('').optional(),
  notes: Joi.string().allow('').optional(),
  contactPerson: Joi.string().allow('').optional(),
  website: Joi.string().allow('').optional(),
  address: Joi.object({
    street: Joi.string().required(),
    number: Joi.string().required(),
    additionalDetails: Joi.string().allow(''),
    zipcode: Joi.string().required(),
    neighborhood: Joi.string().allow(''),
    city: Joi.string().required(),
    state: Joi.string().required(),
  }).optional(),
  phones: Joi.object({
    authorizesSMS: Joi.boolean().required(),
    authorizesWhatsApp: Joi.boolean().required(),
    phoneType: Joi.string().valid('mobile', 'landline').required(),
    default: Joi.boolean().required(),
    validated: Joi.boolean().optional(),
    phone: Joi.object({
      country: Joi.string().required().max(2),
      area: Joi.string().required().max(2),
      number: Joi.string().required().max(9),
      extension: Joi.string().allow(''),
    }).optional(),
  }),
});

export default class UpdateCustomerService {
  private customer: UpdateRequestInterface;

  private id: string;

  constructor(customerId: string, body: string) {
    if (!body) {
      throw new Error('Invalid Request');
    }
    this.id = customerId;
    this.customer = JSON.parse(body);
    const { error } = schema.validate(this.customer);
    if (error) {
      const resultError = error.details.map(err => {
        const data = err.message;
        return data.replace(/[-^#]|[?|{}\\/"']/g, '');
      });
      throw new Error(resultError.toString());
    }
  }

  public async run(event: APIGatewayEvent): Promise<any> {
    const customer = await this.validateCustomerData(this.customer, event);
    await customerUpdateFields(this.id, customer);
    const updatedCustomer = await customerfindById(this.id);
    await sendToQueue(
      JSON.stringify({
        ...updatedCustomer,
        key: Events.VINDI_UPDATECUSTOMER,
      }),
      `${process.env.EVENTS_VINDI_QUEUE}`
    );
    return updatedCustomer;
  }

  private async validateCustomerData(
    data: UpdateRequestInterface,
    event: APIGatewayEvent
  ): Promise<UpdateRequestInterface> {
    const customer: UpdateRequestInterface = data;

    if (this.customer.cnae) {
      customer.cnae = '';
    }

    const registered = await customerPhoneAlreadyRegistered(
      this.id,
      `${this.customer.phones.phone.country}${this.customer.phones.phone.area}${this.customer.phones.phone.number}`
    );

    if (registered && registered.default && !this.customer.phones.default) {
      throw new Error(
        'It is not possible to change a default phone without indicating another to be the default.'
      );
    }

    if (
      this.customer.phones.default &&
      this.customer.phones.phoneType !== 'mobile'
    ) {
      throw new Error('The default phone must be a mobile phone');
    }

    if (this.customer.address) {
      // @ts-ignore
      customer.address.zipcode = sanitize(customer.address.zipcode);
      const validateCEP: APIGatewayProxyEvent = event;
      // @ts-ignore
      validateCEP.pathParameters = { cep: customer.address.zipcode };
      const cepLambda = `${process.env.APPNAME}-${process.env.ENV}-consultaCEP`;

      const cepResponse = await InvokeLambda.invoke(cepLambda, validateCEP);
      const payloadCEP = JSON.parse(cepResponse.Payload as string);
      if (payloadCEP.statusCode > 201) {
        const bodyCEP = JSON.parse(payloadCEP.body);
        throw new Error(bodyCEP.error);
      }
      customer.address = {
        // @ts-ignore
        street: customer.address.street
          .normalize('NFD')
          .toUpperCase()
          .replace(/[\u0300-\u036f]/g, ''),
        // @ts-ignore
        number: customer.address.number,
        // @ts-ignore
        neighborhood: customer.address.neighborhood
          .normalize('NFD')
          .toUpperCase()
          .replace(/[\u0300-\u036f]/g, ''),
        // @ts-ignore
        additionalDetails: customer.address.additionalDetails
          ? // @ts-ignore
            customer.address.additionalDetails
              .normalize('NFD')
              .toUpperCase()
              .replace(/[\u0300-\u036f]/g, '')
          : '',
        // @ts-ignore
        zipcode: customer.address.zipcode
          .normalize('NFD')
          .toUpperCase()
          .replace(/[\u0300-\u036f]/g, ''),
        // @ts-ignore
        city: customer.address.city
          .normalize('NFD')
          .toUpperCase()
          .replace(/[\u0300-\u036f]/g, ''),
        // @ts-ignore
        state: customer.address.state
          .normalize('NFD')
          .toUpperCase()
          .replace(/[\u0300-\u036f]/g, ''),
      };
    }

    if (this.customer.trade) {
      customer.trade = customer.trade
        ? customer.trade
            .normalize('NFD')
            .toUpperCase()
            .replace(/[\u0300-\u036f]/g, '')
        : '';
    }

    if (this.customer.notes) {
      customer.notes = customer.notes
        ? customer.notes
            .normalize('NFD')
            .toUpperCase()
            .replace(/[\u0300-\u036f]/g, '')
        : '';
    }

    if (this.customer.contactPerson) {
      customer.contactPerson = customer.contactPerson
        ? customer.contactPerson
            .normalize('NFD')
            .toUpperCase()
            .replace(/[\u0300-\u036f]/g, '')
        : '';
    }

    if (this.customer.website) {
      customer.website = customer.website
        ? customer.website
            .normalize('NFD')
            .toUpperCase()
            .replace(/[\u0300-\u036f]/g, '')
        : '';
    }
    return customer;
  }
}

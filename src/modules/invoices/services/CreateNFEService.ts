/* eslint-disable @typescript-eslint/ban-ts-ignore */
import * as Joi from '@hapi/joi';
import { RequestNFEInterface } from '../interfaces/request.interface';
import InvoicesRepository from '../../../repositories/InvoicesRepository';
import { customerfindById } from '../../../repositories/CustomersRepository';
import Invoice from '../../../models/Invoice';

const schema = Joi.object({
  customerId: Joi.string().required(),
  number: Joi.number().required(),
  serie: Joi.number().required(),
  url: Joi.string().required(),
  hash: Joi.string().required(),
  order: Joi.string().required(),
});
export default class CreateNFEService {
  private nfedata: RequestNFEInterface;

  constructor(body: string) {
    if (!body) {
      throw new Error('Invalid Request');
    }
    this.nfedata = JSON.parse(body);
    const { error } = schema.validate(this.nfedata);
    if (error) {
      // @ts-ignore
      throw new Error(error.details);
    }
  }

  public async run(): Promise<Invoice> {
    const { customerId, number, serie, url, hash, order } = this.nfedata;
    try {
      const customer = await customerfindById(customerId);
      if (!customer) {
        throw new Error('CustomerId does not exist');
      }
      return InvoicesRepository.create({
        customerId,
        number,
        serie,
        url,
        hash,
        order,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

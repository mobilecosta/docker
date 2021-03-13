/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import * as Joi from '@hapi/joi';
import { sendToQueue } from '../../../common/lib/sqs';
import ResellersRepository from '../../../repositories/ResellersRepository';
import { Events } from '../../internal-processes/interfaces/common-enums';

import ResellerRequestInterface from '../interfaces/ResellerRequestInterface';

const schema = Joi.array().items(
  Joi.object({
    A3_COD: Joi.string().required(),
    A3_NOME: Joi.string().required(),
    A3_END: Joi.string().allow(''),
    A3_BAIRRO: Joi.string().allow(''),
    A3_MUN: Joi.string().allow(''),
    A3_EST: Joi.string().allow(''),
    A3_CEP: Joi.string().allow(''),
    A3_DDDTEL: Joi.string().allow(''),
    A3_TEL: Joi.string().allow(''),
    A3_CGC: Joi.string().allow(''),
    A3_INSCR: Joi.string().allow(''),
    A3_INSCRM: Joi.string().allow(''),
    A3_CARGO: Joi.string().required(),
    A3_DDI: Joi.string().allow(''),
    A3_CEL: Joi.string().allow(''),
    A3_XAGN: Joi.string().required(),
    A3_XCC: Joi.string().required(),
    A3_XLOGIN: Joi.string().required(),
    A3_EMAIL: Joi.string().required(),
  })
);

export default class CreateResellerService {
  body: ResellerRequestInterface[];

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

  public async run(
    transaction: string
  ): Promise<{ id: Array<string>; status: string }> {
    try {
      const codes = [];
      for await (const body of this.body) {
        await ResellersRepository.create({
          resellerId: body.A3_COD,
          name: body.A3_NOME,
          address: {
            street: body.A3_END,
            zipcode: body.A3_CEP,
            neighborhood: body.A3_BAIRRO,
            city: body.A3_MUN,
            state: body.A3_EST,
          },
          phone: {
            area: body.A3_DDDTEL,
            number: body.A3_TEL,
          },
          cnpjCpf: body.A3_CGC,
          stateRegistryCode: body.A3_INSCR,
          municipalRegistryCode: body.A3_INSCRM,
          office: body.A3_CARGO,
          cellphone: {
            area: body.A3_DDI,
            number: body.A3_CEL,
          },
          agn: body.A3_XAGN,
          costCenter: body.A3_XCC,
          login: body.A3_XLOGIN,
          email: body.A3_EMAIL,
        });
        codes.push(body.A3_COD);
      }

      await sendToQueue(
        JSON.stringify({
          resellers: {
            ...this.body,
          },
          key: Events.PROTHEUS_ADD_RESELLER,
          transaction,
        }),
        `${process.env.EVENTS_PROTHEUS_QUEUE}`
      );

      // await sendToQueue(
      //   JSON.stringify({
      //     resellers: {
      //       ...this.body,
      //     },
      //     key: Events.PROTHEUS_ADD_RESELLER,
      //     transaction,
      //   }),
      //   `${process.env.VERIFY_EVENTS_QUEUE}`,
      //   300
      // );

      await sendToQueue(
        JSON.stringify({
          resellers: {
            ...this.body,
          },
          key: Events.LICENCIADOR_ADD_RESELLER,
          transaction,
        }),
        `${process.env.EVENTS_LICENCIADOR_QUEUE}`
      );

      // await sendToQueue(
      //   JSON.stringify({
      //     resellers: {
      //       ...this.body,
      //     },
      //     key: Events.LICENCIADOR_ADD_RESELLER,
      //     transaction,
      //   }),
      //   `${process.env.VERIFY_EVENTS_QUEUE}`,
      //   300
      // );

      return { id: codes, status: 'success' };
    } catch (error) {
      throw new Error(error);
    }
  }
}

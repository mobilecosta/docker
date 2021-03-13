import { protheusAPI } from '../../../../common/lib/external_apis';
import EventsRepository from '../../../../repositories/EventsRepository';
import ProtheusErrorsRepository from '../../../../repositories/ProtheusErrorsRepository';
import { Events } from '../../../internal-processes/interfaces/common-enums';
import { ERROR_CODE_INTERNAL_RETRY } from '../../../internal-processes/interfaces/constants';

interface ICustomerDTO {
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
  phones: Array<{
    phoneType: string;
    authorizesSMS: boolean;
    authorizesWhatsApp: boolean;
    default: boolean;
    validated: boolean;
    phone: {
      country: string;
      area: string;
      number: string;
      extension?: string;
    };
  }>;
  isOver16: boolean;
  over16Metadata: {
    ip: string;
    details: string;
  };
  emailConfirmedAt?: Date;
  vindiSentAt?: Date;
  protheusSentAt?: Date;
  codeT?: string;
  createdAt?: Date;
  updatedAt?: Date;
  action?: string;
}

class AddCustomerProtheusCorpService {
  private customer: ICustomerDTO;

  async clearApostrophe(content: string): Promise<string> {
    return content.replace(/[']/g, '');
  }

  public async execute(customer: string): Promise<void> {
    this.customer = JSON.parse(customer);
    const event = Events.PROTHEUS_CORP_ADD_CUSTOMER;
    const data = {
      dados: [
        {
          EmpresaInt: 'ELEVET',
          A1_XCLIVIP: 'B',
          A1_COD: this.customer.registryCode,
          A1_CGC: this.customer.registryCode,
          A1_NOME: await this.clearApostrophe(this.customer.name),
          A1_NREDUZ: this.customer.trade
            ? await this.clearApostrophe(this.customer.trade)
            : await this.clearApostrophe(this.customer.name),
          A1_INSCR: this.customer.isLegalEntity
            ? this.customer.registryStateCode
            : 'ISENTO',
          A1_END: this.customer.address.street,
          A1_XNEND: this.customer.address.number,
          A1_BAIRRO: this.customer.address.neighborhood,
          A1_CEP: this.customer.address.zipcode,
          A1_TEL: this.customer.phones[0].phone.number,
          A1_EST: this.customer.address.state,
          A1_MUN: this.customer.address.city,
          A1_TIPO: 'F',
          A1_CNAE: this.customer.cnae || '9999-9/99',
          A1_VEND: 'T01076',
          A1_PAIS: '105',
        },
      ],
    };

    await (await protheusAPI()).put('/protheus-integracoes-cadastros/v1.0/TAdqPutClientes', data)
    .then(async response => {
      if ((response.status && response.status > 201) || (response.data && response.data.statuscode && response.data.statuscode > 201)) {
        console.error(`Ocorreu um erro ao enviar o cliente ${this.customer.id} para o Protheus Corporativo`, response);
        let error = {
          response: response
        };
        await this.catchError(error, this.customer.id, data, this.customer, event);
        return;
      }

      console.log({
        action: 'sent-customer-protheus-corp',
        status: response.status,
        description: response.statusText,
        customer: response.data,
      });

      await this.checkReprocessing(this.customer.id, event);

      await EventsRepository.create({
        codeEvent: event,
        relatedId: this.customer.id,
        payload: data,
        status: 'success',
      });
    })
    .catch(async error => {
      console.error(`Ocorreu um erro ao enviar o cliente ${this.customer.id} para o Protheus Corporativo`, error);
      await this.catchError(error, this.customer.id, data, this.customer, event);
    });
  }

  private async checkReprocessing(customerId: string, event: Events): Promise<void> {
    const errData = await ProtheusErrorsRepository.findByManyParameters([
      {
        value: customerId,
        field: 'customer_id',
      },
      {
        value: event,
        field: 'event',
      },
    ]);

    if (errData.length > 0) {
      console.log(`SUCCESS REPROCESSING: customer_id: ${customerId} - ${event}`);

      for await (const err of errData) {
        await ProtheusErrorsRepository.remove(err.id);
      }
    }
  }

  private async catchError(error: any, customerId: string, payload: any, queueMessage: any, event: Events): Promise<void> {
    const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
      error.response.status
    );

    const errData = await ProtheusErrorsRepository.findByManyParameters([
      {
        value: customerId,
        field: 'customer_id',
      },
      {
        value: event,
        field: 'event',
      },
    ]);

    if (errData.length === 0) {
      await ProtheusErrorsRepository.create({
        event: event,
        action: typeAction ? 'retry' : 'call_IT',
        payload: payload,
        response: error.response.data,
        customerId: customerId,
        queueMessage: queueMessage,
      });
    } else {
      await ProtheusErrorsRepository.update(errData[0].id, {
        action: typeAction ? 'retry' : 'call_IT',
        httpCode: error.response.status,
      });
    }
  }
}

export default new AddCustomerProtheusCorpService();

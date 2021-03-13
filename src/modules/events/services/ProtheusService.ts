/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable guard-for-in */
/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { addDays, addMonths, differenceInMonths } from 'date-fns';
import { protheusAPI, getIbgeId } from '../../../common/lib/external_apis';
import {
  customerfindById,
  updateFieldsCustomerToProtheus,
} from '../../../repositories/CustomersRepository';
import EventsRepository from '../../../repositories/EventsRepository';
import { Events } from '../../internal-processes/interfaces/common-enums';
import { hasOwnDeepProperty } from '../../../common/lib/functions';
import { ERROR_CODE_INTERNAL_RETRY } from '../../internal-processes/interfaces/constants';
import SubscriptionRepository from '../../../repositories/v2/SubscriptionRepository';
import ProtheusErrorsRepository from '../../../repositories/ProtheusErrorsRepository';

export default class ProtheusService {
  private data: any;

  constructor(record: string) {
    this.data = JSON.parse(record);
  }

  getPeriod(period: string): number {
    const periods: { [index: string]: number } = {
      TOTVSMENSAL: 1,
      TOTVSTRIMESTRAL: 3,
      TOTVSSEMESTRAL: 6,
      TOTVSANUAL: 12,
      default: 0,
    };
    return periods[period] || periods.default;
  }

  async clearApostrophe(content: string): Promise<string> {
    return content.replace(/[']/g, '');
  }

  public async protheusBillPaid(): Promise<void> {
    const event = Events.PROTHEUS_BILL_PAID;
    const customer = await customerfindById(
      this.data.event.data.bill.customer.code
    );
    const subscription = await SubscriptionRepository.findOne({
      value: this.data.event.data.bill.customer.code,
      field: 'customer_id',
    });

    let DIFERIMENTO_TEMPO: number | string = this.getPeriod(
      subscription.planCode
    ).toString();

    const DIFERIMENTO_DATA = addMonths(
      new Date(subscription.createdAt),
      this.getPeriod(subscription.planCode)
    );

    if (this.data.event.data.bill.code) {
      DIFERIMENTO_TEMPO = differenceInMonths(
        DIFERIMENTO_DATA,
        new Date()
      ).toString();
    }

    const NSUVINDI = hasOwnDeepProperty(this.data, 'nsu')
      ? this.data.event.data.bill.charges[0].last_transaction
          .gateway_response_fields.nsu
      : '';
    const PAYMENTID = hasOwnDeepProperty(this.data, 'nsu')
      ? this.data.event.data.bill.charges[0].last_transaction
          .gateway_authorization
      : '';
    const LINHA_DIGITAVEL = hasOwnDeepProperty(this.data, 'barcode')
      ? this.data.barcode
      : '';
    const CODIGO_BARRA = LINHA_DIGITAVEL;
    const data = {
      CABECALHO: [
        {
          CNPJ: customer.registryCode,
          CONDICAO_PAGTO: '000',
          VENDEDOR: 'T01076',
          MSG_NOTA: '',
          NSUVINDI,
          PAYMENTID,
          CODIGO_BARRA,
          LINHA_DIGITAVEL,
          DIFERIMENTO_TEMPO,
          DIFERIMENTO_DATA,
          FATURA: this.data.event.data.bill.id.toString(),
          AVULSO: this.data.event.data.bill.code ? 'S' : 'N',
          C5_XCSTORE: this.data.event.order,
          //DATA_PAGTO: this.data.event.data.bill.charges[0].paid_at
        },
      ],
      ITENS: [
        {
          ITEM: '01',
          PRODUTO: '7124101021',
          QTD: '1',
          VLR_UNIT: this.data.event.data.bill.charges[0].last_transaction
            .amount,
          VLR_TOTAL: this.data.event.data.bill.charges[0].last_transaction
            .amount,
        },
      ],
    };

    await (await protheusAPI())
      .post('/protheus-faturamento-pedidos/v1.0/TTVMPNPV', data)
      .then(async response => {
        if (
          (response.status && response.status > 201) ||
          (response.data &&
            response.data.statuscode &&
            response.data.statuscode > 201)
        ) {
          console.error(
            `Ocorreu um erro ao enviar a fatura do cliente ${customer.id} para o Protheus`,
            response
          );
          const error = {
            response,
          };
          await this.catchError(error, customer.id, data, this.data, event);
          return;
        }

        console.log({
          action: 'order-sent-to-protheus',
          status: response.status,
          description: response.statusText,
          order: response.data,
        });

        await this.checkReprocessing(customer.id, event);

        await EventsRepository.create({
          codeEvent: Events.PROTHEUS_BILL_PAID,
          relatedId: this.data.event.data.bill.customer.code,
          payload: data,
          status: 'success',
        });
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao enviar a fatura do cliente ${customer.id} para o Protheus`,
          error
        );
        await this.catchError(error, customer.id, data, this.data, event);
      });
  }

  public async protheuAddCustomer(): Promise<void> {
    const event = Events.PROTHEUS_ADD_CUSTOMER;
    const customer = this.data;
    let codeIBGE = '3550308';
    try {
      const ibge = await getIbgeId(
        customer.address.city,
        customer.address.state
      );
      codeIBGE = ibge.toString();
    } catch (error) {
      console.error(
        `Erro ao realizar a consulta do código IGBE para o cliente ${customer.id}`,
        error
      );
    }

    const data = {
      EMPRESA: '99',
      FILIAL: '01',
      DADOS_CLIENTE: [
        {
          CNPJ: customer.registryCode,
          NOME: await this.clearApostrophe(customer.name),
          TIP_PESSOA: customer.isLegalEntity ? 'J' : 'F',
          NICKNAME:
            (await this.clearApostrophe(customer.trade)) ||
            (await this.clearApostrophe(customer.name)),
          ENDERECO: `${customer.address.street}, ${customer.address.number}`,
          BAIRRO: customer.address.neighborhood,
          MUNICIPIO: customer.address.city,
          COD_IBGE: codeIBGE.substring(2, 7),
          UF: customer.address.state,
          CEP: customer.address.zipcode,
          DDD: customer.phones[0].phone.area,
          FONE: customer.phones[0].phone.number,
          CONTATO: customer.contactPerson,
          IE: customer.registryStateCode || 'ISENTO',
          EMAIL: customer.email,
          CNAE: customer.cnae,
          HASHID: customer.id,
        },
      ],
    };

    await (await protheusAPI())
      .post('/protheus-faturamento-clientes/v1.0/TTVMPNCLI', data)
      .then(async response => {
        if (
          (response.status && response.status > 201) ||
          (response.data &&
            response.data.statuscode &&
            response.data.statuscode > 201)
        ) {
          console.error(
            `Ocorreu um erro ao enviar o cliente ${customer.id} para o Protheus`,
            response
          );
          const error = {
            response,
          };
          await this.catchError(error, customer.id, data, this.data, event);
          return;
        }

        console.log({
          action: 'sent-customer-protheus',
          status: response.status,
          description: response.statusText,
          customer: response.data,
        });

        await this.checkReprocessing(customer.id, event);

        await EventsRepository.create({
          codeEvent: Events.PROTHEUS_ADD_CUSTOMER,
          relatedId: this.data.id,
          payload: data,
          status: 'success',
        });

        await updateFieldsCustomerToProtheus(customer.id);
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao enviar o cliente ${customer.id} para o Protheus`,
          error
        );
        await this.catchError(error, customer.id, data, this.data, event);
      });
  }

  private async checkReprocessing(
    customerId: string,
    event: Events
  ): Promise<void> {
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
      console.log(
        `SUCCESS REPROCESSING: customer_id: ${customerId} - ${event}`
      );

      for await (const err of errData) {
        await ProtheusErrorsRepository.remove(err.id);
      }
    }
  }

  private async catchError(
    error: any,
    customerId: string,
    payload: any,
    queueMessage: any,
    event: Events
  ): Promise<void> {
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
        event,
        action: typeAction ? 'retry' : 'call_IT',
        payload,
        response: error.response.data,
        customerId,
        queueMessage,
      });
    } else {
      await ProtheusErrorsRepository.update(errData[0].id, {
        action: typeAction ? 'retry' : 'call_IT',
        httpCode: error.response.status,
      });
    }
  }
}

/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { format } from 'date-fns';
import {
  empoderaAPI,
  licenciadorAPI,
} from '../../../../common/lib/external_apis';
import { sendToQueue } from '../../../../common/lib/sqs';
import EventsRepository from '../../../../repositories/EventsRepository';
import CustomerRepository from '../../../../repositories/v2/CustomerRepository';
import SubscriptionService from '../../../../services/SubscriptionService';
import { Events } from '../../../internal-processes/interfaces/common-enums';
import EmpoderaErrorsService from './EmpoderaErrorsService';

interface IBillInterfaceDTO {
  event: {
    created_at: string;
    data: {
      bill: {
        id: number;
        code?: string;
        amount: string;
        due_at: string;
        customer: {
          code: string;
        };
        period: {
          end_at: string;
        };
        charges: Array<{
          payment_method: {
            public_name: string;
          };
        }>;
        subscription?: {
          code?: string
        };
      };
    };
  };
  transaction: string;
}

interface IEmpoderaCustomFields {
  name: string;
  value: string | any;
}

class AddCustomFieldsService {
  private bill: IBillInterfaceDTO;

  public async execute(message: string): Promise<void> {
    this.bill = JSON.parse(message);

    const event = Events.EMPODERA_ADD_CUSTOM;

    const customer = await CustomerRepository.findById(
      this.bill.event.data.bill.customer.code
    );

    let customerExists = true;
    await empoderaAPI().get(`/customers/codt/${customer.registryCode}`)
    .catch(async error => {
      console.warn(`Cliente ${customer.id} não existe no Empodera.`);
      customerExists = false;
    });

    if (!customerExists){
      await sendToQueue(
        JSON.stringify({
          ...{ event: this.bill.event },
          key: Events.EMPODERA_ADD_CUSTOMER,
          transaction: this.bill.transaction
        }),
        `${process.env.EVENTS_EMPODERA_QUEUE}`
      );

      console.log(`Cliente enviado para a fila ${process.env.EVENTS_EMPODERA_QUEUE}`);

      return;
    }
    
    const subscription = await SubscriptionService.GetSubscriptionByBillPaidEvent(JSON.parse(message));
    if (!subscription) {
      await EmpoderaErrorsService.businessError('Nenhuma subscrição encontrada para esse cliente/fatura', customer.id, message, event);
      return;
    }

    let valorRecorrente: number;
    switch (subscription.planCode) {
      case 'TOTVSMENSAL':
        valorRecorrente = parseFloat(subscription.price);
        break;
      case 'TOTVSBIMESTRAL':
        valorRecorrente = parseFloat(subscription.price) / 2;
        break;
      case 'TOTVSTRIMESTRAL':
        valorRecorrente = parseFloat(subscription.price) / 3;
        break;
      case 'TOTVSQUADRIMESTRAL':
        valorRecorrente = parseFloat(subscription.price) / 4;
        break;
      case 'TOTVSSEMESTRAL':
        valorRecorrente = parseFloat(subscription.price) / 6;
        break;
      case 'TOTVSANUAL':
        valorRecorrente = parseFloat(subscription.price) / 12;
        break;
      default:
        valorRecorrente = parseFloat(subscription.price);
        break;
    }

    let produtos: any[] = [];
    let canal: string = '';
    let licenciadorSubscription: any;

    await (await licenciadorAPI()).get(`/client/subscription?document=${customer.registryCode}`)
    .then(async response => {
      licenciadorSubscription = response.data.subscriptions.find((x: { id: string | undefined; }) => x.id === subscription.codeLicenciador);

      if (licenciadorSubscription == null) {
        console.warn(`A subscrição de ID ${subscription.codeLicenciador} não foi localizada no Licenciador para o cliente ${customer.id}`);
        return;
      }

      produtos = licenciadorSubscription.offers.map((item: any) => {
        return item.description;
      });

      canal = licenciadorSubscription.offers[0].resellerProtheusId;
    })
    .catch(async error => {
      console.error(`Erro ao localizar as subscrições do cliente ${customer.id} no Licenciador`, error);
    });

    const data: Array<IEmpoderaCustomFields> = [
      {
        name: 'grupo_de_produto',
        value: licenciadorSubscription ? licenciadorSubscription.offers[0].productCode : '-',
      },
      { name: 'produto', value: produtos.toString() || '-' },
      {
        name: 'forma_de_pagamento',
        value:
          this.bill.event.data.bill.charges[0].payment_method.public_name ||
          'NAO ESPECIFICADO',
      },
      {
        name: 'data_assinatura',
        value: format(new Date(subscription.createdAt), 'yyyy-MM-dd'),
      },
      {
        name: 'canal_de_vendas',
        value: canal.toString() || 'VENDA ORGANICA',
      },
      { name: 'estado', value: customer.address.state },
      { name: 'cidade', value: customer.address.city },
      { name: 'motivo_de_cancelamento', value: null },
      { name: 'submotivo_de_cancelamento', value: null },
      { name: 'detalhamento_do_cancelamento', value: null },
      { name: 'data_cancelamento', value: null },
      { name: 'data_sol_cancelamento', value: null },
      { name: 'comp._cancelamento', value: null },
      {
        name: 'valor_total_do_contrato',
        value: parseFloat(subscription.price),
      },
      { name: 'valor_de_mrr', value: valorRecorrente },
      { name: 'status_licenciador', value: 'CONTA PAGA' },
    ];

    await empoderaAPI().put(`/customers/${customer.registryCode}/custom-fields`, data)
    .then(async response => {
      console.log({
        action: 'sent-custom-fields-empodera',
        status: response.status,
        description: response.statusText,
        response: response.data,
      });

      await EmpoderaErrorsService.checkReprocessing(customer.id, event);

      await sendToQueue(
        JSON.stringify({
          ... { customer },
          key: Events.EMPODERA_ACTIVATE_CUSTOMER
        }),
        `${process.env.EVENTS_EMPODERA_QUEUE}`
      );

      await EventsRepository.create({
        codeEvent: Events.EMPODERA_ADD_CUSTOM,
        relatedId: customer.id,
        payload: data,
        status: 'success',
        transaction: this.bill.transaction,
      });
    })
    .catch(async error => {
      console.error(`Ocorreu um erro ao enviar os campos customizados do cliente ${customer.id} para o Empodera`, error);
      await EmpoderaErrorsService.catchError(error, customer.id, data, message, event);
    });
  }
}

export default new AddCustomFieldsService();

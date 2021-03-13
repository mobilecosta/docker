/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { format } from 'date-fns';
import { empoderaAPI } from '../../../../common/lib/external_apis';
import { sendToQueue } from '../../../../common/lib/sqs';
import EventsRepository from '../../../../repositories/EventsRepository';
import CustomerRepository from '../../../../repositories/v2/CustomerRepository';
import SubscriptionRepository from '../../../../repositories/v2/SubscriptionRepository';
import { Events } from '../../../internal-processes/interfaces/common-enums';
import EmpoderaErrorsService from './EmpoderaErrorsService';

interface ISubscriptionInterfaceDTO {
  event: {
    created_at: string;
    data: {
      subscription: {
        id: number;
        code: string;
        customer: {
          code: string;
        };
        current_period: {
          start_at: string;
          end_at: string;
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

class CancelCustomFieldsService {
  private subscription: ISubscriptionInterfaceDTO;

  public async execute(message: string): Promise<void> {
    this.subscription = JSON.parse(message);
    const event = Events.EMPODERA_CANCELED_CUSTOM;

    const customer = await CustomerRepository.findById(
      this.subscription.event.data.subscription.customer.code
    );

    const subscription = await SubscriptionRepository.findById(
      this.subscription.event.data.subscription.code
    );

    const cancelDate = new Date(this.subscription.event.data.subscription.current_period.end_at);

    const data: Array<IEmpoderaCustomFields> = [
      {
        name: 'motivo_de_cancelamento',
        value: subscription.reason!.main || 'NAO INFORMADO',
      },
      {
        name: 'submotivo_de_cancelamento',
        value: subscription.reason!.sub || 'NAO INFORMADO',
      },
      {
        name: 'detalhamento_do_cancelamento',
        value: subscription.reason!.details || 'NAO INFORMADO',
      },
      {
        name: 'data_cancelamento',
        value: format(cancelDate, 'yyyy-MM-dd')
      },
      {
        name: 'data_sol_cancelamento',
        value: format(new Date(this.subscription.event.created_at), 'yyyy-MM-dd')
      },
      {
        name: 'comp._cancelamento',
        value: format(cancelDate, 'yyyy-MM-dd')
      },

      { name: 'status_licenciador', value: 'ASSINATURA CANCELADA' },
    ];

    await empoderaAPI().put(`/customers/${customer.registryCode}/custom-fields`, data)
    .then(async response => {
      console.log({
        action: `cancel-custom-fields-empodera`,
        status: response.status,
        description: response.statusText,
        response: response.data,
      });

      await EmpoderaErrorsService.checkReprocessing(customer.id, event);

      await sendToQueue(
        JSON.stringify({
          ... { customer },
          key: Events.EMPODERA_INACTIVATE_CUSTOMER
        }),
        `${process.env.EVENTS_EMPODERA_QUEUE}`
      );

      await EventsRepository.create({
        codeEvent: event,
        relatedId: customer.id,
        payload: data,
        status: 'success',
        transaction: this.subscription.transaction,
      });
    })
    .catch(async error => {
      console.error(`Ocorreu um erro ao enviar os campos customizados de cancelamento do cliente ${customer.id} para o Empodera`, error);
      await EmpoderaErrorsService.catchError(error, customer.id, data, this.subscription, event);
    });
  }
}

export default new CancelCustomFieldsService();

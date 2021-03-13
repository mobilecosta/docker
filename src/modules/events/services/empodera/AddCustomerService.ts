/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { empoderaAPI } from '../../../../common/lib/external_apis';
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
        subscription?: {
          code?: string
        };
      };
    };
  };
  transaction: string;
}

interface IEmpoderaCustomerContract {
  COD_CLIENTE: string;
  CONTRATO: string;
  ITEM: string;
  PLAN_FINAN: string;
}

class AddCustomerService {
  private bill: IBillInterfaceDTO;

  public async execute(message: string): Promise<void> {
    const event = Events.EMPODERA_ADD_CUSTOMER;
    this.bill = JSON.parse(message);
    const customer = await CustomerRepository.findById(
      this.bill.event.data.bill.customer.code
    );
    
    const subscription = await SubscriptionService.GetSubscriptionByBillPaidEvent(JSON.parse(message));
    if (!subscription) {
      await EmpoderaErrorsService.businessError('Nenhuma subscrição encontrada para esse cliente/fatura', customer.id, message, event);
      return;
    }

    const data: IEmpoderaCustomerContract = {
      COD_CLIENTE: customer.registryCode,
      CONTRATO: subscription.salesOrder!,
      ITEM: '001',
      PLAN_FINAN: subscription.planCode,
    };

    await empoderaAPI().post(`/contracts/customer`, data)
    .then(async response => {
      console.log({
        action: 'sent-customer-empodera',
        status: response.status,
        description: response.statusText,
        customer: response.data,
      });

      await EmpoderaErrorsService.checkReprocessing(this.bill.event.data.bill.customer.code, event);

      await EventsRepository.create({
        codeEvent: event,
        relatedId: customer.id,
        payload: data,
        status: 'success',
        transaction: this.bill.transaction,
      });

      await sendToQueue(
        JSON.stringify({
          ...{ event: this.bill.event },
          key: Events.EMPODERA_ADD_CUSTOM,
          transaction: this.bill.transaction
        }),
        `${process.env.EVENTS_EMPODERA_QUEUE}`
      );
    })
    .catch(async error => {
      console.error(`Ocorreu um erro ao enviar o cliente ${this.bill.event.data.bill.customer.code} para o Empodera`, error);
      await EmpoderaErrorsService.catchError(error, this.bill.event.data.bill.customer.code, data, message, event);
    });
  }
}

export default new AddCustomerService();

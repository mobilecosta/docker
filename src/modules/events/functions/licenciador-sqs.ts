import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { removeFromQueue } from '../../../common/lib/sqs';
import Licenciador from '../services/LicenciadorService';
import EventsRepository from '../../../repositories/EventsRepository';
import AddResellerLicenciadorService from '../services/licenciador/AddResellerLicenciadorService';
import { Events } from '../../internal-processes/interfaces/common-enums';

async function workflows(
  instance: Licenciador,
  type: string,
  body: string,
  data: any
): Promise<any> {
  const run: { [index: string]: any } = {
    licenciador_add_customer: async (): Promise<void> => {
      await instance.newCustomer();
    },
    licenciador_update_customer: async (): Promise<void> => {
      await instance.updateCustomer();
    },
    licenciador_new_subscription: async (): Promise<void> => {
      await instance.addSubscription();
    },
    licenciador_bill_paid: async (): Promise<void> => {
      await instance.billPaid();
    },
    licenciador_update_payment_method: async (): Promise<void> => {
      await instance.updatePaymentMethod();
    },
    licenciador_subscription_canceled: async (): Promise<void> => {
      await instance.subscriptionCanceled();
    },
    licenciador_add_offers: async (): Promise<void> => {
      await instance.addOffers();
    },
    licenciador_update_price: async (): Promise<void> => {
      await instance.updatePrice();
    },
    licenciador_add_reseller: async (): Promise<void> => {
      await AddResellerLicenciadorService.execute(body);
      await EventsRepository.create({
        codeEvent: Events.LICENCIADOR_ADD_RESELLER,
        relatedId: data.id,
        payload: data,
        status: 'success',
        transaction: data.transaction,
      });
    },
    licenciador_add_discount: async (): Promise<void> => {
      await instance.addDiscount();
    },
    licenciador_change_price: async (): Promise<void> => {
      await instance.changePrice();
    },
    default: (): any => {
      console.log(type);
    },
  };

  return (run[type] || run.default)();
}
/**
 * Listen new messages in LICENCIADOR Queue (SQS)
 * @author Adalton L Goncalves - <tp.adalton.goncalves@totvs.com.br>
 * @date May/2020
 * @param {SQSEvent} event
 */

export const handler: SQSHandler = async ({
  Records,
}: SQSEvent): Promise<void> => {
  for await (const record of Records) {
    const { body } = record;
    const data = JSON.parse(body);
    try {
      const licenciador = new Licenciador(body);
      await workflows(licenciador, data.key, body, data);
      await removeFromQueue(record, `${process.env.EVENTS_LICENCIADOR_QUEUE}`);
    } catch {
      await removeFromQueue(record, `${process.env.EVENTS_LICENCIADOR_QUEUE}`);
    }
  }
};

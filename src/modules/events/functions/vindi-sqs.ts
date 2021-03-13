import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { removeFromQueue } from '../../../common/lib/sqs';
import Vindi from '../services/VindiService';
import { Events } from '../../internal-processes/interfaces/common-enums';
/**
 * Listen new messages in VINDI Queue (SQS)
 * @author Adalton L Goncalves - <tp.adalton.goncalves@totvs.com.br>
 * @date July/2020
 * @param {SQSEvent} event
 */

export const handler: SQSHandler = async ({
  Records,
}: SQSEvent): Promise<void> => {
  for await (const record of Records) {
    const { body } = record;
    const data = JSON.parse(body);
    try {
      const vindi = new Vindi(body);
      switch (data.key) {
        case Events.VINDI_NEWCUSTOMER:
          await vindi.addCustomer();
          await removeFromQueue(record, `${process.env.EVENTS_VINDI_QUEUE}`);
          break;
        case Events.VINDI_UPDATECUSTOMER:
          await vindi.updateCustomer();
          await removeFromQueue(record, `${process.env.EVENTS_VINDI_QUEUE}`);
          break;
        case Events.VINDI_NEWSUBSCRIPTION:
          await vindi.addSubscription();
          await removeFromQueue(record, `${process.env.EVENTS_VINDI_QUEUE}`);
          break;
        case Events.VINDI_UPDATE_PAYMENT_METHOD:
          await vindi.updatePaymentMethod();
          await removeFromQueue(record, `${process.env.EVENTS_VINDI_QUEUE}`);
          break;
        case Events.VINDI_CANCELSUBSCRIPTION:
          await vindi.cancelSubscription();
          await removeFromQueue(record, `${process.env.EVENTS_VINDI_QUEUE}`);
          break;
        case Events.VINDI_NEWITEM_BILL:
          await vindi.newBill();
          await removeFromQueue(record, `${process.env.EVENTS_VINDI_QUEUE}`);
          break;
        case Events.VINDI_UPDATE_PRICE:
          await vindi.updatePrice();
          await removeFromQueue(record, `${process.env.EVENTS_VINDI_QUEUE}`);
          break;
        case Events.VINDI_ADD_DISCOUNT:
          await vindi.addDiscount();
          await removeFromQueue(record, `${process.env.EVENTS_VINDI_QUEUE}`);
          break;
        case Events.VINDI_MIGRATION_PERIOD:
          await vindi.changePeriod();
          await removeFromQueue(record, `${process.env.EVENTS_VINDI_QUEUE}`);
          break;
        case Events.VINDI_CHANGE_PRICE:
          await vindi.changePrice();
          await removeFromQueue(record, `${process.env.EVENTS_VINDI_QUEUE}`);
          break;
        default:
          break;
      }
    } catch {
      await removeFromQueue(record, `${process.env.EVENTS_VINDI_QUEUE}`);
    }
  }
};

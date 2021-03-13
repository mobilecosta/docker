import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { removeFromQueue } from '../../../common/lib/sqs';
import Store from '../services/StoreService';

import { Events } from '../../internal-processes/interfaces/common-enums';
/**
 * Listen new messages in STORE Queue (SQS)
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
      const store = new Store(body);
      switch (data.key) {
        case Events.STORE_NEW_CUSTOMER:
          await store.newCustomer();
          await removeFromQueue(record, `${process.env.EVENTS_STORE_QUEUE}`);
          break;
        case Events.STORE_BILL_CREATED:
          await store.billCreated();
          await removeFromQueue(record, `${process.env.EVENTS_STORE_QUEUE}`);
          break;
        case Events.STORE_BILL_PAID:
          await store.billPaid();
          await removeFromQueue(record, `${process.env.EVENTS_STORE_QUEUE}`);
          break;
        case Events.STORE_SUBSCRIPTION_CREATED:
          await store.subscriptionCreated();
          await removeFromQueue(record, `${process.env.EVENTS_STORE_QUEUE}`);
          break;
        case Events.STORE_PAYMENT_PROFILE_CREATED:
          await store.paymentProfile();
          await removeFromQueue(record, `${process.env.EVENTS_STORE_QUEUE}`);
          break;
        case Events.STORE_CHARGE_REJECTED:
          await store.chargeRejected();
          await removeFromQueue(record, `${process.env.EVENTS_STORE_QUEUE}`);
          break;
        case Events.STORE_CHARGE_CREATED:
          await store.chargeCreated();
          await removeFromQueue(record, `${process.env.EVENTS_STORE_QUEUE}`);
          break;
        case Events.STORE_SUBSCRIPTION_CANCELED:
          await store.subscriptionCanceled();
          await removeFromQueue(record, `${process.env.EVENTS_STORE_QUEUE}`);
          break;
        case Events.STORE_SUBSCRIPTION_MIGRATED:
          await store.migrateSubscription();
          await removeFromQueue(record, `${process.env.EVENTS_STORE_QUEUE}`);
          break;
        default:
          break;
      }
    } catch {
      await removeFromQueue(record, `${process.env.EVENTS_STORE_QUEUE}`);
    }
  }
};

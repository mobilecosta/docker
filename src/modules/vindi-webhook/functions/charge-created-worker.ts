import '../../../common/lib/bootstrap';
import { Handler } from 'aws-lambda';
import ChargeInterface from '../interfaces/charge.interface';
import SubscriptionRepository from '../../../repositories/v2/SubscriptionRepository';
import { sendToQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';
import PendingPurchaseRepository from '../../../repositories/PendingPurchaseRepository';

const dispatch = {
  feedSelf: (): void => {
    Promise.all([]);
  },

  feedQueues: async (data: ChargeInterface): Promise<void> => {
    const subscription = await SubscriptionRepository.findOne({
      value: data.event.data.charge.customer.code,
      field: 'customer_id',
    });
    const request = {
      event: {
        ...data.event,
        order: subscription.salesOrder,
      },
    };
    if (data.event.data.charge.bill.code) {
      const purchase = await PendingPurchaseRepository.findById(
        data.event.data.charge.bill.code
      );
      request.event.order = purchase.salesOrder;
    }
    await Promise.all([
      await sendToQueue(
        JSON.stringify({ ...request, key: Events.STORE_CHARGE_CREATED }),
        `${process.env.EVENTS_STORE_QUEUE}`
      ),
    ]);
  },
};

export const handler: Handler = async (event: any) => {
  const data: ChargeInterface = JSON.parse(event);
  await Promise.all([dispatch.feedQueues(data)]);
};

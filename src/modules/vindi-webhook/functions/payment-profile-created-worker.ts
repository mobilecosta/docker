import '../../../common/lib/bootstrap';
import { Handler } from 'aws-lambda';
import PaymentProfileInterface from '../interfaces/payment-profile.interface';
import SubscriptionRepository from '../../../repositories/v2/SubscriptionRepository';
import { sendToQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';

const dispatch = {
  feedSelf: (): void => {
    Promise.all([]);
  },

  feedQueues: async (data: PaymentProfileInterface): Promise<void> => {
    const subscription = await SubscriptionRepository.findOne({
      value: data.event.data.payment_profile.customer.code,
      field: 'customer_id',
    });
    const request = {
      event: {
        ...data.event,
        order: subscription.salesOrder,
      },
    };

    await Promise.all([
      await sendToQueue(
        JSON.stringify({
          ...request,
          key: Events.STORE_PAYMENT_PROFILE_CREATED,
        }),
        `${process.env.EVENTS_STORE_QUEUE}`
      ),
    ]);
  },
};

export const handler: Handler = async (event: any) => {
  const data: PaymentProfileInterface = JSON.parse(event);
  await Promise.all([dispatch.feedQueues(data)]);
};

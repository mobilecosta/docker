import '../../../common/lib/bootstrap';
import { Handler } from 'aws-lambda';
import SubscriptionInterface from '../interfaces/subscription.interface';
import {
  StatusSubscription,
  updateSubscriptionStatus,
} from '../../../repositories/SubscriptionsRepository';
import SubscriptionRepository from '../../../repositories/v2/SubscriptionRepository';
import { sendToQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';

const dispatch = {
  feedSelf: async (data: SubscriptionInterface): Promise<void> => {
    await Promise.all([
      await updateSubscriptionStatus(
        data.event.data.subscription.code,
        StatusSubscription.ACTIVE
      ),
    ]);
  },
  feedQueues: async (data: SubscriptionInterface): Promise<void> => {
    const subscription = await SubscriptionRepository.findById(
      data.event.data.subscription.code
    );

    const request = {
      event: {
        ...data.event,
        order: subscription.salesOrder,
      },
    };
    await Promise.all([
      await sendToQueue(
        JSON.stringify({ ...request, key: Events.STORE_SUBSCRIPTION_CREATED }),
        `${process.env.EVENTS_STORE_QUEUE}`
      ),
    ]);
  },
};

export const handler: Handler = async (event: any) => {
  const data: SubscriptionInterface = JSON.parse(event);
  await Promise.all([dispatch.feedSelf(data), dispatch.feedQueues(data)]);
};

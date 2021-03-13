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
import { uuid } from '../../../common/lib/uuid';

const dispatch = {
  feedSelf: async (data: SubscriptionInterface): Promise<void> => {
    await Promise.all([
      await updateSubscriptionStatus(
        data.event.data.subscription.code,
        StatusSubscription.CANCELED
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
    const transaction = `SCW-${uuid()}`;
    await Promise.all([
      await sendToQueue(
        JSON.stringify({ ...request, key: Events.STORE_SUBSCRIPTION_CANCELED }),
        `${process.env.EVENTS_STORE_QUEUE}`
      ),
      await sendToQueue(
        JSON.stringify({
          ...request,
          key: Events.LICENCIADOR_SUBSCRIPTION_CANCELED,
        }),
        `${process.env.EVENTS_LICENCIADOR_QUEUE}`
      ),
      await sendToQueue(
        JSON.stringify({
          ...request,
          key: Events.EMPODERA_CANCEL_CONTRACT,
          transaction,
        }),
        `${process.env.EVENTS_EMPODERA_QUEUE}`
      ),
    ]);
    // Confirmacao se os eventos foram executados com sucesso
    // await sendToQueue(
    //   JSON.stringify({
    //     ...request,
    //     key: 'subscription_canceled',
    //     transaction,
    //   }),
    //   `${process.env.VERIFY_EVENTS_QUEUE}`,
    //   300
    // );
  },
};

export const handler: Handler = async (event: any) => {
  const data: SubscriptionInterface = JSON.parse(event);
  await Promise.all([dispatch.feedSelf(data), dispatch.feedQueues(data)]);
};

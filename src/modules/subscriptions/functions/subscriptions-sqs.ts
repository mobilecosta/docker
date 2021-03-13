import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { createSubscription } from '../../../repositories/SubscriptionsRepository';
import { removeFromQueue, sendToQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';
/**
 * Listen new messages in Subscriptions Queue (SQS) and test test
 * save in table subscriptions (DynamoDB)
 * @author Adalton L Goncalves - <tp.adalton.goncalves@totvs.com.br>
 * @date May/2020
 * @param {SQSEvent} event
 */

export const handler: SQSHandler = async ({
  Records,
}: SQSEvent): Promise<void> => {
  for await (const record of Records) {
    const { body } = record;
    const { discount, billingAt } = JSON.parse(body);
    await createSubscription(JSON.parse(body), discount);
    await Promise.all([
      await sendToQueue(
        JSON.stringify({
          ...JSON.parse(body),
          key: Events.VINDI_NEWSUBSCRIPTION,
        }),
        `${process.env.EVENTS_VINDI_QUEUE}`
      ),
      await sendToQueue(
        JSON.stringify({
          ...JSON.parse(body),
          periodEndAt: new Date(billingAt),
          key: Events.LICENCIADOR_NEW_SUBSCRIPTION,
        }),
        `${process.env.EVENTS_LICENCIADOR_QUEUE}`
      ),
    ]);
    await removeFromQueue(record, `${process.env.SUBSCRIPTIONS_QUEUE}`);
  }
};

import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { removeFromQueue, sendToQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';
/**
 * Listen new messages in Subscriptions Cancel Queue (SQS), send to payment
 *
 * @author Adalton L Goncalves - <tp.adalton.goncalves@totvs.com.br>
 * @date May/2020
 * @param {SQSEvent} event
 */

export const handler: SQSHandler = async ({
  Records,
}: SQSEvent): Promise<void> => {
  for await (const record of Records) {
    const { body } = record;
    await Promise.all([
      await sendToQueue(
        JSON.stringify({
          ...JSON.parse(body),
          key: Events.VINDI_CANCELSUBSCRIPTION,
        }),
        `${process.env.EVENTS_VINDI_QUEUE}`
      ),
    ]);
    await removeFromQueue(record, `${process.env.CANCEL_SUBSCRIPTION_QUEUE}`);
  }
};

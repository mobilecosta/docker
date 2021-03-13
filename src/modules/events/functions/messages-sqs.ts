import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { removeFromQueue } from '../../../common/lib/sqs';
import Messages from '../services/MessageService';
import { Events } from '../../internal-processes/interfaces/common-enums';
/**
 * Listen new messages in PROTHEUS Queue (SQS)
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
      const messages = new Messages(body);
      if (data.key === Events.SMS_BILL_PAID) {
        await messages.smsBillPaid();
        await removeFromQueue(record, `${process.env.EVENTS_MESSAGE_QUEUE}`);
      } else {
        await messages.smsBillCreated();
        await removeFromQueue(record, `${process.env.EVENTS_MESSAGE_QUEUE}`);
      }
    } catch {
      await removeFromQueue(record, `${process.env.EVENTS_MESSAGE_QUEUE}`);
    }
  }
};

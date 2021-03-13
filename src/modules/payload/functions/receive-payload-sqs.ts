import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { removeFromQueue } from '../../../common/lib/sqs';
import payloadRepository from '../../../repositories/PayloadsRepository';
import PayloadInterface from '../interfaces/payload-data.interface';
/**
 * Listen new messages in Payload Queue (SQS), save in internal table
 * @author Adalton L Goncalves - <tp.adalton.goncalves@totvs.com.br>
 * @date May/2020
 * @param {SQSEvent} event
 */

export const handler: SQSHandler = async ({
  Records,
}: SQSEvent): Promise<void> => {
  for await (const record of Records) {
    const { body } = record;
    const data: PayloadInterface = JSON.parse(body);
    const { method, url, origin, identity, payload, response } = data;
    await payloadRepository.create({
      method,
      url,
      origin,
      identity,
      payload,
      response,
    });
    await removeFromQueue(record, `${process.env.PAYLOAD_QUEUE}`);
  }
};

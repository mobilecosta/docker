import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler, SQSRecord } from 'aws-lambda';
import { removeFromQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';
import EventsRepository from '../../../repositories/EventsRepository';
import ErrorInterfaceRepository from '../../../repositories/ErrorInterfaceRepository';

async function identifyErrors(
  transaction: string,
  type: string,
  body: string,
  system: string,
  customerId: string
): Promise<void> {
  const event = await EventsRepository.findByTwoParameters(
    { value: transaction, field: 'transaction' },
    { value: type, field: 'code_event' }
  );
  const data = JSON.parse(body);
  data.key = type;
  if (event.length === 0) {
    console.log(`Error Found. Event: ${type} - Transaction: ${transaction}`);
    await ErrorInterfaceRepository.create({
      relatedId: transaction,
      system,
      level: 'STANDARD',
      action: 'retry',
      event: type,
      customerId,
      queueMessage: JSON.stringify(data),
    });
  }
}

async function workflows(record: SQSRecord): Promise<any> {
  const { body } = record;
  const data = JSON.parse(body);
  const run: { [index: string]: any } = {
    add_contract_full: async (): Promise<void> => {
      const customerId = data.event.data.bill.customer.code;
      await Promise.all([
        await identifyErrors(
          data.transaction,
          Events.EMPODERA_ADD_CUSTOMER,
          body,
          'EMPODERA',
          customerId
        ),
        await identifyErrors(
          data.transaction,
          Events.EMPODERA_ADD_BILL,
          body,
          'EMPODERA',
          customerId
        ),
        await identifyErrors(
          data.transaction,
          Events.EMPODERA_ADD_CONTACT,
          body,
          'EMPODERA',
          customerId
        ),
        await identifyErrors(
          data.transaction,
          Events.EMPODERA_ADD_CUSTOM,
          body,
          'EMPODERA',
          customerId
        ),
      ]);
    },
    add_contract_bill: async (): Promise<void> => {
      const customerId = data.event.data.bill.customer.code;
      await identifyErrors(
        data.transaction,
        Events.EMPODERA_ADD_BILL,
        body,
        'EMPODERA',
        customerId
      );
    },
    bill_paid: async (): Promise<void> => {
      const customerId = data.event.data.bill.customer.code;
      await identifyErrors(
        data.transaction,
        Events.EMPODERA_ADD_CONTRACT,
        body,
        'EMPODERA',
        customerId
      );
    },
    subscription_canceled: async (): Promise<void> => {
      const customerId = data.event.data.subscription.customer.code;
      await identifyErrors(
        data.transaction,
        Events.EMPODERA_CANCEL_CONTRACT,
        body,
        'EMPODERA',
        customerId
      );
    },
    cancel_contract_add_customer: async (): Promise<void> => {
      const customerId = data.event.data.subscription.customer.code;
      await identifyErrors(
        data.transaction,
        Events.EMPODERA_ADD_CUSTOMER,
        body,
        'EMPODERA',
        customerId
      );
    },
    cancel_contract: async (): Promise<void> => {
      const customerId = data.event.data.subscription.customer.code;
      await identifyErrors(
        data.transaction,
        Events.EMPODERA_CANCELED_CUSTOM,
        body,
        'EMPODERA',
        customerId
      );
    },
    default: (): any => {
      console.log(data.key);
    },
  };
  return (run[data.key] || run.default)();
}

/**
 * Verify if all events has been processed
 * @author Adalton L Goncalves - <tp.adalton.goncalves@totvs.com.br>
 * @date Oct/2020
 * @param {SQSEvent} event
 */

export const handler: SQSHandler = async ({
  Records,
}: SQSEvent): Promise<void> => {
  for await (const record of Records) {
    try {
      await workflows(record);
      await removeFromQueue(record, `${process.env.VERIFY_EVENTS_QUEUE}`);
    } catch (error) {
      await removeFromQueue(record, `${process.env.VERIFY_EVENTS_QUEUE}`);
    }
    // const { body } = record;
    // const data = JSON.parse(body);
    // try {
    //   let result;
    //   switch (data.key) {
    //     case Events.PROTHEUS_ADD_RESELLER:
    //       result = await EventsRepository.findByTwoParameters(
    //         {
    //           value: Events.PROTHEUS_ADD_RESELLER,
    //           field: 'code_event',
    //         },
    //         { value: data.transaction, field: 'transaction' }
    //       );
    //       if (result.length === 0) {
    //         await ErrorInterfaceRepository.create({
    //           relatedId: `CTX-${data.transaction}`,
    //           system: 'PROTHEUS',
    //           level: 'HIGH',
    //           action: 'retry',
    //           event: Events.PROTHEUS_ADD_RESELLER,
    //           message: 'failed',
    //           httpCode: 0,
    //           queueMessage: body,
    //         });
    //       }
    //       await removeFromQueue(record, `${process.env.VERIFY_EVENTS_QUEUE}`);
    //       break;
    //     default:
    //       console.log('Method not supported');
    //   }
    // } catch (error) {
    //   console.log(error.message);
    // }
  }
};

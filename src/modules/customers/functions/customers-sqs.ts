import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { createCustomer } from '../../../repositories/CustomersRepository';
import { removeFromQueue, sendToQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';
import customersPhoneRepository from '../../../repositories/CustomersPhoneRepository';
/**
 * Listen new messages in Customers Queue (SQS) and
 * save in table customers (DynamoDB)
 * @author Adalton L Goncalves - <tp.adalton.goncalves@totvs.com.br>
 * @date May/2020
 * @param {SQSEvent} event
 */

interface Phone {
  phoneType: string;
  authorizesSMS: boolean;
  authorizesWhatsApp: boolean;
  default: boolean;
  validated: boolean;
  phone: {
    country: string;
    area: string;
    number: string;
    extension: string;
  };
}

export const handler: SQSHandler = async ({
  Records,
}: SQSEvent): Promise<void> => {
  for await (const record of Records) {
    const { body } = record;
    const { id, phones } = JSON.parse(body);
    const PHONES: Array<Phone> = phones;
    await createCustomer(JSON.parse(body));
    for await (const phone of PHONES) {
      await customersPhoneRepository.create(id, phone);
    }

    await Promise.all([
      await sendToQueue(
        JSON.stringify({
          ...JSON.parse(body),
          key: Events.VINDI_NEWCUSTOMER,
        }),
        `${process.env.EVENTS_VINDI_QUEUE}`
      ),
      // Store
      await sendToQueue(
        JSON.stringify({
          ...JSON.parse(body),
          key: Events.STORE_NEW_CUSTOMER,
        }),
        `${process.env.EVENTS_STORE_QUEUE}`
      ),
      // Licenciador
      await sendToQueue(
        JSON.stringify({
          ...JSON.parse(body),
          key: Events.LICENCIADOR_ADD_CUSTOMER,
        }),
        `${process.env.EVENTS_LICENCIADOR_QUEUE}`
      ),
      // Protheus
      await sendToQueue(
        JSON.stringify({
          ...JSON.parse(body),
          key: Events.PROTHEUS_ADD_CUSTOMER,
        }),
        `${process.env.EVENTS_PROTHEUS_QUEUE}`
      ),
      // Protheus Corp
      await sendToQueue(
        JSON.stringify({
          ...JSON.parse(body),
          key: Events.PROTHEUS_CORP_ADD_CUSTOMER,
        }),
        `${process.env.EVENTS_PROTHEUS_QUEUE}`
      ),
    ]);
    await removeFromQueue(record, `${process.env.CUSTOMERS_QUEUE}`);
  }
};

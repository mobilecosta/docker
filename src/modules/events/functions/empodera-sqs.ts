import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler, SQSRecord } from 'aws-lambda';
import { removeFromQueue } from '../../../common/lib/sqs';
import AddBillService from '../services/empodera/AddBillService';
import AddContractService from '../services/empodera/AddContractService';
import AddCustomerService from '../services/empodera/AddCustomerService';
import AddCustomerContactService from '../services/empodera/AddCustomerContactService';
import AddCustomFieldsService from '../services/empodera/AddCustomFieldsService';
import CancelContractService from '../services/empodera/CancelContractService';
import CancelCustomFieldsService from '../services/empodera/CancelCustomFieldsService';
import ActivateCustomerService from '../services/empodera/ActivateCustomerService';
import InactivateCustomerService from '../services/empodera/InactivateCustomerService';

async function workflows(record: SQSRecord): Promise<any> {
  const { body } = record;
  const data = JSON.parse(body);
  const run: { [index: string]: any } = {
    empodera_add_contract: async (): Promise<void> => {
      await AddContractService.execute(body);
    },
    empodera_add_customer: async (): Promise<void> => {
      await AddCustomerService.execute(body);
    },
    empodera_add_bill: async (): Promise<void> => {
      await AddBillService.execute(body);
    },
    empodera_add_contact: async (): Promise<void> => {
      await AddCustomerContactService.execute(body);
    },
    empodera_add_custom_fields: async (): Promise<void> => {
      await AddCustomFieldsService.execute(body);
    },
    empodera_cancel_contract: async (): Promise<void> => {
      await CancelContractService.execute(body);
    },
    empodera_canceled_custom_fields: async (): Promise<void> => {
      await CancelCustomFieldsService.execute(body);
    },
    empodera_activate_customer: async (): Promise<void> => {
      await ActivateCustomerService.execute(body);
    },
    empodera_inactivate_customer: async (): Promise<void> => {
      await InactivateCustomerService.execute(body);
    },
    default: (): any => {
      console.log(data.key);
    },
  };

  return (run[data.key] || run.default)();
}
/**
 * Listen new messages in Empodera Queue (SQS)
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
      await removeFromQueue(record, `${process.env.EVENTS_EMPODERA_QUEUE}`);
    } catch (error) {
      await removeFromQueue(record, `${process.env.EVENTS_EMPODERA_QUEUE}`);
    }
  }
};

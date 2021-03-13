import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { removeFromQueue } from '../../../common/lib/sqs';
import Protheus from '../services/ProtheusService';
import { Events } from '../../internal-processes/interfaces/common-enums';
import EventsRepository from '../../../repositories/EventsRepository';
import ErrorInterfaceRepository from '../../../repositories/ErrorInterfaceRepository';
import ErrorArchiveRepository from '../../../repositories/ErrorArchiveRepository';
import AddResellerService from '../services/protheus/AddResellerService';
import AddCustomerProtheusCorpService from '../services/protheus/AddCustomerProtheusCorpService';
/**
 * Listen new messages in PROTHEUS Queue (SQS)
 * @author Adalton L Goncalves - <tp.adalton.goncalves@totvs.com.br>
 * @date Oct/2020
 * @param {SQSEvent} event
 */

export const handler: SQSHandler = async ({
  Records,
}: SQSEvent): Promise<void> => {
  for await (const record of Records) {
    const { body } = record;
    const data = JSON.parse(body);
    try {
      const protheus = new Protheus(body);
      let errors;
      switch (data.key) {
        case Events.PROTHEUS_ADD_CUSTOMER:
          await protheus.protheuAddCustomer();
          await removeFromQueue(record, `${process.env.EVENTS_PROTHEUS_QUEUE}`);
          break;
        case Events.PROTHEUS_CORP_ADD_CUSTOMER:
          await AddCustomerProtheusCorpService.execute(body);
          await EventsRepository.create({
            codeEvent: Events.PROTHEUS_CORP_ADD_CUSTOMER,
            relatedId: data.id,
            payload: data,
            status: 'success',
            transaction: data.transaction,
          });
          await removeFromQueue(record, `${process.env.EVENTS_PROTHEUS_QUEUE}`);
          break;
        case Events.PROTHEUS_BILL_PAID:
          await protheus.protheusBillPaid();
          await removeFromQueue(record, `${process.env.EVENTS_PROTHEUS_QUEUE}`);
          break;
        case Events.PROTHEUS_ADD_RESELLER:
          await AddResellerService.execute(body);
          await EventsRepository.create({
            codeEvent: Events.PROTHEUS_ADD_RESELLER,
            relatedId: 'not_related_to_databus_codes',
            payload: data,
            status: 'success',
            transaction: data.transaction,
          });
          // There only one event in each transaction for add_resellers
          errors = await ErrorInterfaceRepository.find({
            value: `CTX-${data.transaction}`,
            field: 'related_id',
          });
          if (errors.length > 0) {
            for await (const error of errors) {
              await ErrorArchiveRepository.create({
                id: error.id,
                relatedId: error.relatedId,
                level: error.level,
                system: error.system,
                event: error.event,
                httpCode: error.httpCode || 999,
                message: error.message || '',
                queueMessage: error.queueMessage,
                retries: error.retries || 1,
                action: error.action,
                createdAt: error.createdAt,
              });
              await ErrorInterfaceRepository.remove(error.id);
            }
          }
          await removeFromQueue(record, `${process.env.EVENTS_PROTHEUS_QUEUE}`);
          break;
        default:
          console.log('Method not supported');
      }
    } catch (error) {
      await removeFromQueue(record, `${process.env.EVENTS_PROTHEUS_QUEUE}`);
    }
  }
};

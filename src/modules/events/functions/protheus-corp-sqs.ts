import '../../../common/lib/bootstrap';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { removeFromQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';
import EventsRepository from '../../../repositories/EventsRepository';
import AddCustomerProtheusCorpService from '../services/protheus/AddCustomerProtheusCorpService';
/**
 * Listen new messages in PROTHEUS CORP Queue (SQS)
 * @author Fabricio Cavalcante - <tp.fabricio.cavalcante@totvs.com.br>
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
      await AddCustomerProtheusCorpService.execute(body);
      await EventsRepository.create({
        codeEvent: Events.PROTHEUS_CORP_ADD_CUSTOMER,
        relatedId: data.id,
        payload: data,
        status: 'success',
        transaction: data.transaction,
      });
    } catch (error) {
      console.error(`Ocorreu um erro ao executar o método de envio do cliente ${data.id} para o Protheus Corporativo`, error);
    }

    await removeFromQueue(
      record,
      `${process.env.EVENTS_PROTHEUS_CORP_QUEUE}`
    );
  }
};

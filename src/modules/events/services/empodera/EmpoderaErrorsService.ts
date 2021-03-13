import EmpoderaErrorsRepository from "../../../../repositories/EmpoderaErrorsRepository";
import { Events } from "../../../internal-processes/interfaces/common-enums";
import { ERROR_CODE_INTERNAL_RETRY } from "../../../internal-processes/interfaces/constants";

class EmpoderaErrorsService {
  public async checkReprocessing(customerId: string, event: Events): Promise<void> {
    const errData = await EmpoderaErrorsRepository.findByManyParameters([
      {
        value: customerId,
        field: 'customer_id',
      },
      {
        value: event,
        field: 'event',
      },
    ]);

    if (errData.length > 0) {
      console.log(`SUCCESS REPROCESSING: customer_id: ${customerId} - ${event}`);

      for await (const err of errData) {
        await EmpoderaErrorsRepository.remove(err.id);
      }
    }
  }

  public async catchError(error: any, customerId: string, payload: any, queueMessage: any, event: Events): Promise<void> {
    const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
      error.response.status
    );

    const errData = await EmpoderaErrorsRepository.findByManyParameters([
      {
        value: customerId,
        field: 'customer_id',
      },
      {
        value: event,
        field: 'event',
      },
    ]);

    if (errData.length === 0) {
      await EmpoderaErrorsRepository.create({
        event: event,
        action: typeAction ? 'retry' : 'call_IT',
        payload: payload,
        response: error.response.data,
        customerId: customerId,
        queueMessage: typeof(queueMessage) === 'string' ? JSON.parse(queueMessage) : queueMessage,
      });
    } else {
      await EmpoderaErrorsRepository.update(errData[0].id, {
        action: typeAction ? 'retry' : 'call_IT',
        httpCode: error.response.status,
        retries: errData[0].retries + 1,
        payload: payload,
        response: error.response.data
      });
    }
  }

  public async businessError(message: string, customerId: string, queueMessage: any, event: Events): Promise<void> {
    const errData = await EmpoderaErrorsRepository.findByManyParameters([
      {
        value: customerId,
        field: 'customer_id',
      },
      {
        value: event,
        field: 'event',
      },
    ]);

    if (errData.length === 0) {
      await EmpoderaErrorsRepository.create({
        event: event,
        action: 'call_IT',
        payload: {
          message: 'Ocorreu um erro lógico que impede o processamento desta mensagem'
        },
        response: {
          businessMessage: message
        },
        customerId: customerId,
        queueMessage: typeof(queueMessage) === 'string' ? JSON.parse(queueMessage) : queueMessage,
      });
    } else {
      await EmpoderaErrorsRepository.update(errData[0].id, {
        retries: errData[0].retries + 1
      });
    }
  }
}

export default new EmpoderaErrorsService();
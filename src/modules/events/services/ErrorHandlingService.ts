import { formatRFC7231 } from 'date-fns';
import { Events } from '../../internal-processes/interfaces/common-enums';
import { sendToQueue } from '../../../common/lib/sqs';
import LicenciadorErrorsRepository from '../../../repositories/LicenciadorErrorsRepository';
import VindiErrorsRepository from '../../../repositories/VindiErrorsRepository';
import StoreErrorsRepository from '../../../repositories/StoreErrorsRepository';
import ProtheusErrorsRepository from '../../../repositories/ProtheusErrorsRepository';
import EmpoderaErrorsRepository from '../../../repositories/EmpoderaErrorsRepository';

interface MessageData {
  id: string;
  system: string;
  event: string;
  relatedId: string;
  message: string;
  info: string;
}
export default class ErrorHandlingService {
  public async runLicenciador(): Promise<string> {
    const licenciadorErrors = await LicenciadorErrorsRepository.findByManyParameters(
      [
        // {
        //   value: Events.LICENCIADOR_NEW_SUBSCRIPTION,
        //   field: 'event',
        // },
        {
          value: 'retry',
          field: 'action',
        },
      ]
    );
    if (licenciadorErrors.length === 0) {
      return `[${formatRFC7231(
        new Date()
      )}]: AWESOME! No Licenciador events in error at this time`;
    }
    // eslint-disable-next-line no-restricted-syntax
    for await (const item of licenciadorErrors) {
      const retries = item.retries ? item.retries + 1 : 1;
      await LicenciadorErrorsRepository.update(item.id, { retries });
      await sendToQueue(
        JSON.stringify(item.queueMessage),
        `${process.env.EVENTS_LICENCIADOR_QUEUE}`
      );
    }
    return `[${formatRFC7231(new Date())}]: Work with ${
      licenciadorErrors.length
    } message(s) in error`;
  }

  // VINDI
  public async runVindi(): Promise<string> {
    const vindiErrors = await VindiErrorsRepository.findByManyParameters([
      // {
      //   value: Events.VINDI_NEWSUBSCRIPTION,
      //   field: 'event',
      // },
      {
        value: 'retry',
        field: 'action',
      },
    ]);
    if (vindiErrors.length === 0) {
      return `[${formatRFC7231(
        new Date()
      )}]: AWESOME! No Vindi events in error at this time`;
    }
    // eslint-disable-next-line no-restricted-syntax
    for await (const item of vindiErrors) {
      const retries = item.retries ? item.retries + 1 : 1;
      await VindiErrorsRepository.update(item.id, { retries });
      await sendToQueue(
        JSON.stringify(item.queueMessage),
        `${process.env.EVENTS_VINDI_QUEUE}`
      );
    }
    return `[${formatRFC7231(new Date())}]: Work with ${
      vindiErrors.length
    } message(s) in error`;
  }

  public async runStore(): Promise<string> {
    const storeErrors = await StoreErrorsRepository.findByManyParameters([
      // {
      //   value: Events.STORE_SUBSCRIPTION_CREATED,
      //   field: 'event',
      // },
      {
        value: 'retry',
        field: 'action',
      },
    ]);
    if (storeErrors.length === 0) {
      return `[${formatRFC7231(
        new Date()
      )}]: AWESOME! No Store events in error at this time`;
    }
    // eslint-disable-next-line no-restricted-syntax
    for await (const item of storeErrors) {
      const retries = item.retries ? item.retries + 1 : 1;
      await StoreErrorsRepository.update(item.id, { retries });
      await sendToQueue(
        JSON.stringify(item.queueMessage),
        `${process.env.EVENTS_STORE_QUEUE}`
      );
    }
    return `[${formatRFC7231(new Date())}]: Work with ${storeErrors.length} message(s) in error`;
  }

  public async runProtheus(): Promise<string> {
    const protheusErrors = await ProtheusErrorsRepository.findByManyParameters([
      {
        value: 'retry',
        field: 'action',
      },
    ]);
    if (protheusErrors.length === 0) {
      return `[${formatRFC7231(
        new Date()
      )}]: AWESOME! No Protheus events in error at this time`;
    }
    // eslint-disable-next-line no-restricted-syntax
    for await (const item of protheusErrors) {
      const retries = item.retries ? item.retries + 1 : 1;
      await ProtheusErrorsRepository.update(item.id, { retries });
      await sendToQueue(
        JSON.stringify(item.queueMessage),
        `${process.env.EVENTS_PROTHEUS_QUEUE}`
      );
    }
    return `[${formatRFC7231(new Date())}]: Work with ${protheusErrors.length} message(s) in error`;
  }

  public async runEmpodera(): Promise<string> {
    const empoderaErrors = await EmpoderaErrorsRepository.findByManyParameters([
      {
        value: 'retry',
        field: 'action',
      },
    ]);

    if (empoderaErrors.length === 0) {
      return `[${formatRFC7231(
        new Date()
      )}]: AWESOME! No Empodera events in error at this time`;
    }

    // eslint-disable-next-line no-restricted-syntax
    for await (const item of empoderaErrors) {
      const retries = item.retries ? item.retries + 1 : 1;
      await EmpoderaErrorsRepository.update(item.id, { retries });
      await sendToQueue(
        JSON.stringify(item.queueMessage),
        `${process.env.EVENTS_EMPODERA_QUEUE}`
      );
    }
    return `[${formatRFC7231(new Date())}]: Work with ${empoderaErrors.length} message(s) in error`;
  }
}

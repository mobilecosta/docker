/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { AxiosResponse } from 'axios';
import { storeAPI } from '../../../common/lib/external_apis';
import { updateFieldsCustomerToStore } from '../../../repositories/CustomersRepository';
import EventsRepository from '../../../repositories/EventsRepository';
import { Events } from '../../internal-processes/interfaces/common-enums';
import errorInterfaceRepository from '../../../repositories/ErrorInterfaceRepository';
import errorArchiveRepository from '../../../repositories/ErrorArchiveRepository';
import { ERROR_CODE_INTERNAL_RETRY } from '../../internal-processes/interfaces/constants';
import BillCreatedInterface from '../../vindi-webhook/interfaces/bill-created.interface';
import customerRepository from '../../../repositories/v2/CustomerRepository';
import StoreErrorsRepository from '../../../repositories/StoreErrorsRepository';

export default class StoreService {
  private data: Record<string, any>;

  private errorCode: number;

  constructor(record: string) {
    this.data = JSON.parse(record);
  }

  public async newCustomer(): Promise<void> {
    await (await storeAPI())
      .post('/beehive/mpn-customer-notify', this.data)
      .then(async response => {
        // Prepare Error Handling
        const errData = await StoreErrorsRepository.findByManyParameters([
          {
            value: this.data.id,
            field: 'customer_id',
          },
          {
            value: Events.STORE_NEW_CUSTOMER,
            field: 'event',
          },
        ]);
        if (errData.length > 0) {
          console.log(
            `ERROR REPROCESSING: customer_id: ${this.data.id} - ${Events.STORE_NEW_CUSTOMER}`
          );
          for await (const err of errData) {
            await StoreErrorsRepository.remove(err.id);
          }
        }
        await EventsRepository.create({
          codeEvent: Events.STORE_NEW_CUSTOMER,
          relatedId: this.data.id,
          payload: this.data,
          status: 'success',
          migrated: !!this.data.periodEndAt,
        });
        await updateFieldsCustomerToStore(this.data.id);
      })
      .catch(async error => {
        const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
          error.response.status
        );
        // Prepare Error Handling
        const errData = await StoreErrorsRepository.findByManyParameters([
          {
            value: this.data.id,
            field: 'customer_id',
          },
          {
            value: Events.STORE_NEW_CUSTOMER,
            field: 'event',
          },
        ]);
        if (errData.length === 0) {
          await StoreErrorsRepository.create({
            event: Events.STORE_NEW_CUSTOMER,
            action: typeAction ? 'retry' : 'call_IT',
            payload: this.data,
            response: error.response.data,
            customerId: this.data.id,
            queueMessage: this.data,
          });
        } else {
          await StoreErrorsRepository.update(errData[0].id, {
            action: typeAction ? 'retry' : 'call_IT',
            httpCode: error.response.status,
          });
        }
      });
  }

  private async commonNotify(): Promise<AxiosResponse> {
    return (await storeAPI()).post('/beehive/mpn-order-notify', this.data);
  }

  public async billCreated(): Promise<void> {
    // @ts-ignore
    const info: BillCreatedInterface = this.data;
    const errData = await errorInterfaceRepository.findOne({
      value: info.event.data.bill.customer.code,
      field: 'related_id',
    });
    try {
      const response = await this.commonNotify();
      if (response.status > 201) {
        this.errorCode = response.status;
        console.log(response.data);
      }
      if (errData && errData.event === Events.STORE_BILL_CREATED) {
        await errorArchiveRepository.create({
          id: errData.id,
          relatedId: errData.relatedId,
          level: errData.level,
          system: errData.system,
          event: errData.event,
          httpCode: errData.httpCode || 999,
          message: errData.message || '',
          queueMessage: errData.queueMessage,
          retries: errData.retries || 1,
          action: errData.action,
          createdAt: errData.createdAt,
        });
        await errorInterfaceRepository.remove(errData.id);
      }
      await EventsRepository.create({
        codeEvent: Events.STORE_BILL_CREATED,
        relatedId: info.event.data.bill.customer.code,
        payload: this.data,
        status: 'success',
      });
    } catch (error) {
      console.error(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (!errData || errData.event !== Events.STORE_BILL_CREATED) {
        await errorInterfaceRepository.create({
          relatedId: info.event.data.bill.customer.code,
          level: 'HIGH',
          system: 'STORE',
          action: typeAction ? 'retry' : 'call_IT',
          event: Events.STORE_BILL_CREATED,
          message: error.message,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.STORE_BILL_CREATED) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.STORE_BILL_CREATED);
    }
  }

  public async billPaid(): Promise<void> {
    const errData = await errorInterfaceRepository.findOne({
      value: this.data.event.data.bill.customer.code,
      field: 'related_id',
    });
    try {
      const response = await this.commonNotify();
      if (response.status > 201) {
        this.errorCode = response.status;
        console.log(response.data);
      }
      if (errData && errData.event === Events.STORE_BILL_PAID) {
        await errorArchiveRepository.create({
          id: errData.id,
          relatedId: errData.relatedId,
          level: errData.level,
          system: errData.system,
          event: errData.event,
          httpCode: errData.httpCode || 999,
          message: errData.message || '',
          queueMessage: errData.queueMessage,
          retries: errData.retries || 1,
          action: errData.action,
          createdAt: errData.createdAt,
        });
        await errorInterfaceRepository.remove(errData.id);
      }
      await EventsRepository.create({
        codeEvent: Events.STORE_BILL_PAID,
        relatedId: this.data.event.data.bill.customer.code,
        payload: this.data,
        status: 'success',
      });
    } catch (error) {
      console.error(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (!errData || errData.event !== Events.STORE_BILL_PAID) {
        await errorInterfaceRepository.create({
          relatedId: this.data.event.data.bill.customer.code,
          level: 'HIGH',
          system: 'STORE',
          action: typeAction ? 'retry' : 'call_IT',
          event: Events.STORE_BILL_PAID,
          message: error.message,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.STORE_BILL_PAID) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.STORE_BILL_PAID);
    }
  }

  public async subscriptionCreated(): Promise<void> {
    await (await storeAPI())
      .post('/beehive/mpn-order-notify', this.data)
      .then(async response => {
        const errData = await StoreErrorsRepository.findByManyParameters([
          {
            value: this.data.customerId,
            field: 'customer_id',
          },
          {
            value: Events.STORE_SUBSCRIPTION_CREATED,
            field: 'event',
          },
        ]);
        if (errData.length > 0) {
          console.log(
            `ERROR REPROCESSING: customer_id: ${this.data.id} - ${Events.STORE_SUBSCRIPTION_CREATED}`
          );
          for await (const err of errData) {
            await StoreErrorsRepository.remove(err.id);
          }
        }
        await EventsRepository.create({
          codeEvent: Events.STORE_SUBSCRIPTION_CREATED,
          relatedId: this.data.event.data.subscription.customer.code,
          // @ts-ignore
          payload: this.data,
          status: 'success',
        });
      })
      .catch(async error => {
        const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
          error.response.status
        );
        const errData = await StoreErrorsRepository.findByManyParameters([
          {
            value: this.data.customerId,
            field: 'customer_id',
          },
          {
            value: Events.STORE_SUBSCRIPTION_CREATED,
            field: 'event',
          },
        ]);
        if (errData.length === 0) {
          await StoreErrorsRepository.create({
            event: Events.STORE_SUBSCRIPTION_CREATED,
            action: typeAction ? 'retry' : 'call_IT',
            // @ts-ignore
            payload: this.data,
            response: error.response.data,
            customerId: this.data.customerId,
            queueMessage: this.data,
          });
        } else {
          await StoreErrorsRepository.update(errData[0].id, {
            action: typeAction ? 'retry' : 'call_IT',
            httpCode: error.response.status,
          });
        }
      });

    /*  if (errData && errData.event === Events.STORE_SUBSCRIPTION_CREATED) {
        await errorArchiveRepository.create({
          id: errData.id,
          relatedId: errData.relatedId,
          level: errData.level,
          system: errData.system,
          event: errData.event,
          httpCode: errData.httpCode || 999,
          message: errData.message || '',
          queueMessage: errData.queueMessage,
          retries: errData.retries || 1,
          action: errData.action,
          createdAt: errData.createdAt,
        });
        await errorInterfaceRepository.remove(errData.id);
      }
      await EventsRepository.create({
        codeEvent: Events.STORE_SUBSCRIPTION_CREATED,
        relatedId: this.data.event.data.subscription.customer.code,
        payload: this.data,
        status: 'success',
      });
     catch (error) {
      console.error(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (!errData || errData.event !== Events.STORE_SUBSCRIPTION_CREATED) {
        await errorInterfaceRepository.create({
          relatedId: this.data.id,
          level: 'HIGH',
          system: 'STORE',
          action: typeAction ? 'retry' : 'call_IT',
          event: Events.STORE_SUBSCRIPTION_CREATED,
          message: error.message,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.STORE_SUBSCRIPTION_CREATED) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.STORE_SUBSCRIPTION_CREATED);
    } */
  }

  public async paymentProfile(): Promise<void> {
    // @ts-ignore
    const errData = await errorInterfaceRepository.findOne({
      value: this.data.event.data.payment_profile.customer.code,
      field: 'related_id',
    });
    try {
      const response = await this.commonNotify();
      if (response.status > 201) {
        this.errorCode = response.status;
        console.log(response.data);
      }
      if (errData && errData.event === Events.STORE_PAYMENT_PROFILE_CREATED) {
        await errorArchiveRepository.create({
          id: errData.id,
          relatedId: errData.relatedId,
          level: errData.level,
          system: errData.system,
          event: errData.event,
          httpCode: errData.httpCode || 999,
          message: errData.message || '',
          queueMessage: errData.queueMessage,
          retries: errData.retries || 1,
          action: errData.action,
          createdAt: errData.createdAt,
        });
        await errorInterfaceRepository.remove(errData.id);
      }
      await EventsRepository.create({
        codeEvent: Events.STORE_PAYMENT_PROFILE_CREATED,
        relatedId: this.data.event.data.payment_profile.customer.code,
        payload: this.data,
        status: 'success',
      });
    } catch (error) {
      console.error(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (!errData || errData.event !== Events.STORE_PAYMENT_PROFILE_CREATED) {
        await errorInterfaceRepository.create({
          relatedId: this.data.event.data.payment_profile.customer.code,
          level: 'HIGH',
          system: 'STORE',
          action: typeAction ? 'retry' : 'call_IT',
          event: Events.STORE_PAYMENT_PROFILE_CREATED,
          message: error.message,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.STORE_PAYMENT_PROFILE_CREATED) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.STORE_PAYMENT_PROFILE_CREATED);
    }
  }

  public async chargeRejected(): Promise<void> {
    // @ts-ignore
    const errData = await errorInterfaceRepository.findOne({
      value: this.data.event.data.charge.customer.code,
      field: 'related_id',
    });
    try {
      const response = await this.commonNotify();
      if (response.status > 201) {
        this.errorCode = response.status;
        console.log(response.data);
      }
      if (errData && errData.event === Events.STORE_CHARGE_REJECTED) {
        await errorArchiveRepository.create({
          id: errData.id,
          relatedId: errData.relatedId,
          level: errData.level,
          system: errData.system,
          event: errData.event,
          httpCode: errData.httpCode || 999,
          message: errData.message || '',
          queueMessage: errData.queueMessage,
          retries: errData.retries || 1,
          action: errData.action,
          createdAt: errData.createdAt,
        });
        await errorInterfaceRepository.remove(errData.id);
      }
      await EventsRepository.create({
        codeEvent: Events.STORE_CHARGE_REJECTED,
        relatedId: this.data.event.data.charge.customer.code,
        payload: this.data,
        status: 'success',
      });
    } catch (error) {
      console.error(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (!errData || errData.event !== Events.STORE_CHARGE_REJECTED) {
        await errorInterfaceRepository.create({
          relatedId: this.data.event.data.charge.customer.code,
          level: 'HIGH',
          system: 'STORE',
          action: typeAction ? 'retry' : 'call_IT',
          event: Events.STORE_CHARGE_REJECTED,
          message: error.message,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.STORE_CHARGE_REJECTED) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.STORE_CHARGE_REJECTED);
    }
  }

  public async chargeCreated(): Promise<void> {
    // @ts-ignore
    const errData = await errorInterfaceRepository.findOne({
      value: this.data.event.data.charge.customer.code,
      field: 'related_id',
    });
    try {
      const response = await this.commonNotify();
      if (response.status > 201) {
        this.errorCode = response.status;
        console.log(response.data);
      }
      if (errData && errData.event === Events.STORE_CHARGE_CREATED) {
        await errorArchiveRepository.create({
          id: errData.id,
          relatedId: errData.relatedId,
          level: errData.level,
          system: errData.system,
          event: errData.event,
          httpCode: errData.httpCode || 999,
          message: errData.message || '',
          queueMessage: errData.queueMessage,
          retries: errData.retries || 1,
          action: errData.action,
          createdAt: errData.createdAt,
        });
        await errorInterfaceRepository.remove(errData.id);
      }
      await EventsRepository.create({
        codeEvent: Events.STORE_CHARGE_CREATED,
        relatedId: this.data.event.data.charge.customer.code,
        payload: this.data,
        status: 'success',
      });
    } catch (error) {
      console.error(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (!errData || errData.event !== Events.STORE_CHARGE_CREATED) {
        await errorInterfaceRepository.create({
          relatedId: this.data.event.data.charge.customer.code,
          level: 'HIGH',
          system: 'STORE',
          action: typeAction ? 'retry' : 'call_IT',
          event: Events.STORE_CHARGE_CREATED,
          message: error.message,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.STORE_CHARGE_CREATED) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.STORE_CHARGE_CREATED);
    }
  }

  public async subscriptionCanceled(): Promise<void> {
    // @ts-ignore
    const errData = await errorInterfaceRepository.findOne({
      value: this.data.event.data.subscription.customer.code,
      field: 'related_id',
    });
    try {
      const response = await this.commonNotify();
      if (response.status > 201) {
        this.errorCode = response.status;
        console.log(response.data);
      }
      if (errData && errData.event === Events.STORE_SUBSCRIPTION_CANCELED) {
        await errorArchiveRepository.create({
          id: errData.id,
          relatedId: errData.relatedId,
          level: errData.level,
          system: errData.system,
          event: errData.event,
          httpCode: errData.httpCode || 999,
          message: errData.message || '',
          queueMessage: errData.queueMessage,
          retries: errData.retries || 1,
          action: errData.action,
          createdAt: errData.createdAt,
        });
        await errorInterfaceRepository.remove(errData.id);
      }
      await EventsRepository.create({
        codeEvent: Events.STORE_SUBSCRIPTION_CANCELED,
        relatedId: this.data.event.data.subscription.customer.code,
        payload: this.data,
        status: 'success',
      });
    } catch (error) {
      console.error(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (!errData || errData.event !== Events.STORE_SUBSCRIPTION_CANCELED) {
        await errorInterfaceRepository.create({
          relatedId: this.data.event.data.subscription.customer.code,
          level: 'HIGH',
          system: 'STORE',
          action: typeAction ? 'retry' : 'call_IT',
          event: Events.STORE_SUBSCRIPTION_CANCELED,
          message: error.message,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.STORE_SUBSCRIPTION_CANCELED) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.STORE_SUBSCRIPTION_CANCELED);
    }
  }

  public async migrateSubscription(): Promise<void> {
    // @ts-ignore
    const errData = await errorInterfaceRepository.findOne({
      value: this.data.customerId,
      field: 'related_id',
    });
    const customer = await customerRepository.findById(this.data.customerId);
    const data = {
      'mpn-signature': {
        document: customer.registryCode,
        idVindi: customer.vindiCode,
      },
    };
    try {
      const response = await (await storeAPI()).post('/beehive', data);
      if (response.status > 201) {
        this.errorCode = response.status;
        console.log(response.data);
      }
      if (errData && errData.event === Events.STORE_SUBSCRIPTION_MIGRATED) {
        await errorArchiveRepository.create({
          id: errData.id,
          relatedId: errData.relatedId,
          level: errData.level,
          system: errData.system,
          event: errData.event,
          httpCode: errData.httpCode || 999,
          message: errData.message || '',
          queueMessage: errData.queueMessage,
          retries: errData.retries || 1,
          action: errData.action,
          createdAt: errData.createdAt,
        });
        await errorInterfaceRepository.remove(errData.id);
      }
      await EventsRepository.create({
        codeEvent: Events.STORE_SUBSCRIPTION_MIGRATED,
        relatedId: this.data.customerId,
        payload: this.data,
        status: 'success',
      });
    } catch (error) {
      console.error(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (!errData || errData.event !== Events.STORE_SUBSCRIPTION_MIGRATED) {
        await errorInterfaceRepository.create({
          relatedId: this.data.customerId,
          level: 'HIGH',
          system: 'STORE',
          action: typeAction ? 'retry' : 'call_IT',
          event: Events.STORE_SUBSCRIPTION_MIGRATED,
          message: error.message,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.STORE_SUBSCRIPTION_MIGRATED) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.STORE_SUBSCRIPTION_MIGRATED);
    }
  }
}

/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { addDays, addMonths } from 'date-fns';
import { stringType } from 'aws-sdk/clients/iam';
import { AxiosResponse } from 'axios';
import {
  subscriptionfindById,
  updateFieldsSubscriptionToLicenciador,
} from '../../../repositories/SubscriptionsRepository';
import {
  customerfindById,
  updateFieldsCustomerToLicenciador,
  findCustomerPhoneByParameters,
} from '../../../repositories/CustomersRepository';
import { licenciadorAPI, getIbgeId } from '../../../common/lib/external_apis';
import {
  Events,
  Recurrence,
} from '../../internal-processes/interfaces/common-enums';
import EventsRepository from '../../../repositories/EventsRepository';
import errorInterfaceRepository from '../../../repositories/ErrorInterfaceRepository';
import errorArchiveRepository from '../../../repositories/ErrorArchiveRepository';
import { ERROR_CODE_INTERNAL_RETRY } from '../../internal-processes/interfaces/constants';
import NewSubscriptionInterface from '../interfaces/new-subscription.interface';
import pendingPurchaseRepository from '../../../repositories/PendingPurchaseRepository';
import SubscriptionRepository from '../../../repositories/v2/SubscriptionRepository';
import LicenciadorErrorsRepository from '../../../repositories/LicenciadorErrorsRepository';
import CustomerRepository from '../../../repositories/v2/CustomerRepository';

interface SubscriptionLicenciador {
  DDD: string;
  subscriptions: Array<{
    offers: Array<{
      quantity: number;
      productId: string;
      description: string;
      restrictions: Array<{
        name: string;
        code: string;
        quantity: number;
        id: string;
      }>;
      frequencyCode: string;
      createdAt: string;
      productCode: string;
      price: number;
      resellerProtheusId: string;
      name: string;
      offerId: string;
      id: string;
      updatedAt: string;
      productName: string;
    }>;
    createdAt: string;
    recurrenceMonths: number;
    charge: number;
    paymentMethod: string;
    id: string;
    endAt: string;
    vouchers: Array<{
      validUntil: string;
      createdAt: string;
      id: string;
      value: number;
      updatedAt: string;
    }>;
    startAt: string;
    status: string;
    updatedAt: string;
    loginEndAt: string;
    restrictions: Array<{
      name: string;
      code: string;
      quantity: number;
    }>;
  }>;
  personType: number;
  createdAt: string;
  address: string;
  email: string;
  fantasyName: string;
  name: string;
  state: string;
  city: string;
  active: boolean;
  inConfidence: boolean;
  updatedAt: string;
  neighborhood: string;
  complement: string;
  internal: boolean;
  personRegister: string;
  municipalityCode: string;
  id: string;
  document: string;
  phone: string;
  postaCode: string;
  addressNumber: string;
  notifications: Array<{
    id: string;
    description: string;
    title: string;
    productCode: string;
  }>;
}
export default class LicenciadorService {
  private data: Record<string, any>;

  constructor(record: string) {
    this.data = JSON.parse(record);
  }

  public async newCustomer(): Promise<void> {
    let codeIBGE = '3550308';
    try {
      const ibge = await getIbgeId(
        this.data.address.city,
        this.data.address.state
      );
      codeIBGE = ibge.toString();
    } catch (error) {
      console.log(error.message);
    }

    const data = {
      name: this.data.name,
      fantasyName: this.data.trade,
      document: this.data.registryCode,
      email: this.data.email,
      DDD: this.data.phones[0].phone.area,
      phone: this.data.phones[0].phone.number,
      personType: this.data.isLegalEntity ? 1 : 2,
      personRegister: this.data.registryStateCode || 'ISENTO',
      state: this.data.address.state,
      postalCode: this.data.address.zipcode,
      neighborhood: this.data.address.neighborhood,
      municipalityIbgeCode: codeIBGE,
      address: this.data.address.street,
      addressNumber: this.data.address.number,
      city: this.data.address.city,
      complement: this.data.address.additionalDetails || '',
    };
    await (await licenciadorAPI())
      .post('/client', data)
      .then(async response => {
        // Prepare Error Handling
        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: this.data.id,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_ADD_CUSTOMER,
            field: 'event',
          },
        ]);
        if (errData.length > 0) {
          console.log(
            `ERROR REPROCESSING: customer_id: ${this.data.id} - ${Events.LICENCIADOR_ADD_CUSTOMER}`
          );
          for await (const err of errData) {
            await LicenciadorErrorsRepository.remove(err.id);
          }
        }
        await EventsRepository.create({
          codeEvent: Events.LICENCIADOR_ADD_CUSTOMER,
          relatedId: this.data.id,
          payload: data,
          status: 'success',
          migrated: !!this.data.periodEndAt,
        });
        await updateFieldsCustomerToLicenciador(this.data.id, response.data.id);
      })
      .catch(async error => {
        const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
          error.response.status
        );
        // Prepare Error Handling
        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: this.data.id,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_ADD_CUSTOMER,
            field: 'event',
          },
        ]);
        if (errData.length === 0) {
          await LicenciadorErrorsRepository.create({
            event: Events.LICENCIADOR_ADD_CUSTOMER,
            action: typeAction ? 'retry' : 'call_IT',
            payload: data,
            response: error.response.data,
            customerId: this.data.id,
            queueMessage: this.data,
          });
        } else {
          await LicenciadorErrorsRepository.update(errData[0].id, {
            action: typeAction ? 'retry' : 'call_IT',
            httpCode: error.response.status,
          });
        }
      });
  }

  public async updateCustomer(): Promise<void> {
    const ibge = await getIbgeId(
      this.data.address.city,
      this.data.address.state
    );
    const codeIBGE = ibge.toString() || '3550308';
    const errData = await errorInterfaceRepository.findOne({
      value: this.data.id,
      field: 'related_id',
    });
    const phones = await findCustomerPhoneByParameters(
      { value: this.data.id, field: 'customer_id' },
      { value: true, field: 'default' }
    );
    const data = {
      name: this.data.name,
      fantasyName: this.data.trade,
      DDD: phones[0].number.substring(2, 4),
      phone: phones[0].number.substring(4, 13),
      personRegister: this.data.registryStateCode || 'ISENTO',
      state: this.data.address.state,
      postalCode: this.data.address.zipcode,
      neighborhood: this.data.address.neighborhood,
      municipalityIbgeCode: codeIBGE,
      address: this.data.address.street,
      addressNumber: this.data.address.number,
      city: this.data.address.city,
      complement: this.data.address.additionalDetails || '',
    };
    try {
      const response = await (await licenciadorAPI()).put(
        `/client/${this.data.codeLicenciador}`,
        data
      );
      if (response.status > 201) {
        throw new Error(response.data.errorMessage);
      }
      if (errData && errData.event === Events.LICENCIADOR_UPDATE_CUSTOMER) {
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

      console.log({
        action: 'update-customer-licenciador',
        status: response.status,
        description: response.statusText,
        customer: response.data,
      });

      await EventsRepository.create({
        codeEvent: Events.LICENCIADOR_UPDATE_CUSTOMER,
        relatedId: this.data.id,
        payload: data,
        status: 'success',
      });
    } catch (error) {
      console.error(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (!errData || errData.event !== Events.LICENCIADOR_UPDATE_CUSTOMER) {
        await errorInterfaceRepository.create({
          relatedId: this.data.id,
          level: 'LOW',
          system: 'LICENCIADOR',
          action: typeAction ? 'retry' : 'call_IT',
          message: error.message,
          event: Events.LICENCIADOR_UPDATE_CUSTOMER,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.LICENCIADOR_UPDATE_CUSTOMER) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.LICENCIADOR_UPDATE_CUSTOMER);
    }
  }

  public async billPaid(): Promise<void> {
    if (!this.data.event.data.bill.subscription.code) {
      return; // Fatura Avulsa não atualiza status no licenciador
    }
    const subscription = await SubscriptionRepository.findById(
      this.data.event.data.bill.subscription.code
    );
    // @ts-ignore
    const { customerId } = subscription;
    const updateData = {
      status: 'bill_paid',
      endAt: new Date(this.data.event.data.bill.period.end_at.slice(0, -6)),
    };
    // const errData = await errorInterfaceRepository.findOne({
    //   value: customerId,
    //   field: 'related_id',
    // });
    const customer = await CustomerRepository.findById(customerId);

    let { codeLicenciador } = customer;
    let subscriptionCodeLicenciador = subscription.codeLicenciador;

    if (!codeLicenciador || !subscriptionCodeLicenciador) {
      const getData = await (await licenciadorAPI()).get(
        `/client/subscription?document=${customer.registryCode}`
      );
      codeLicenciador = getData.data.id;
      const activeSubscription = await getData.data.subscriptions.filter(
        (item: any) => {
          return (
            item.status !== 'subscription_canceled' ||
            item.status !== 'scheduled_canceled'
          );
        }
      );
      subscriptionCodeLicenciador = activeSubscription[0].id;
    }
    // try {
    //   // const actualEndDate = new Date(activeSubscription[0].endAt);
    //   // const billEndDate = new Date(updateData.endAt);
    //   // updateData.endAt = subscription.migrated ? actualEndDate : billEndDate;
    await (await licenciadorAPI())
      .put(
        `/client/${codeLicenciador}/subscription/${subscriptionCodeLicenciador}`,
        updateData
      )
      .then(async response => {
        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: customerId,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_BILL_PAID,
            field: 'event',
          },
        ]);
        if (errData.length > 0) {
          console.log(
            `ERROR REPROCESSING: customer_id: ${customerId} - ${Events.LICENCIADOR_BILL_PAID}`
          );
          for await (const err of errData) {
            await LicenciadorErrorsRepository.remove(err.id);
          }
        }
        await EventsRepository.create({
          codeEvent: Events.LICENCIADOR_BILL_PAID,
          relatedId: customerId,
          payload: updateData,
          status: 'success',
        });
      })
      .catch(async error => {
        const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
          error.response.status
        );
        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: customerId,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_BILL_PAID,
            field: 'event',
          },
        ]);
        if (errData.length === 0) {
          await LicenciadorErrorsRepository.create({
            event: Events.LICENCIADOR_BILL_PAID,
            action: typeAction ? 'retry' : 'call_IT',
            // @ts-ignore
            payload: updateData,
            response: error.response.data,
            customerId,
            queueMessage: this.data,
          });
        } else {
          await LicenciadorErrorsRepository.update(errData[0].id, {
            action: typeAction ? 'retry' : 'call_IT',
            httpCode: error.response.status,
            response: error.response.data,
          });
        }
      });

    // } catch (error) {
    //   console.log(error);
    //   const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
    //     error.response.status || 999
    //   );
    //   if (!errData || errData.event !== Events.LICENCIADOR_BILL_PAID) {
    //     await errorInterfaceRepository.create({
    //       relatedId: this.data.event.data.bill.customer.code,
    //       level: 'HIGH',
    //       system: 'LICENCIADOR',
    //       action: typeAction ? 'retry' : 'call_IT',
    //       message: error.message,
    //       event: Events.LICENCIADOR_BILL_PAID,
    //       httpCode: error.response.status || 999,
    //       queueMessage: JSON.stringify(this.data),
    //     });
    //   } else if (errData.event === Events.LICENCIADOR_BILL_PAID) {
    //     await errorInterfaceRepository.update(errData.id, {
    //       action: typeAction ? 'retry' : 'call_IT',
    //       httpCode: error.response.status || 999,
    //     });
    //   }
    //   throw new Error(Events.LICENCIADOR_BILL_PAID);
    // }
  }

  public async subscriptionCanceled(): Promise<void> {
    const subscription = await SubscriptionRepository.findById(
      this.data.event.data.subscription.code
    );
    // @ts-ignore
    const { customerId } = subscription;
    // const errData = await errorInterfaceRepository.findOne({
    //   value: customerId,
    //   field: 'related_id',
    // });
    const customer = await CustomerRepository.findById(customerId);

    let { codeLicenciador } = customer;
    let subscriptionCodeLicenciador = subscription.codeLicenciador;

    function isActive(value: { status: string }) {
      const [, base] = value.status.split('_');
      return base !== 'canceled';
    }

    const getData: AxiosResponse<SubscriptionLicenciador> = await (
      await licenciadorAPI()
    ).get(`/client/subscription?document=${customer.registryCode}`);

    if (!codeLicenciador) {
      codeLicenciador = getData.data.id;
    }

    const activeSubscription = getData.data.subscriptions.filter(
      isActive
      // (item: any) => {
      //   return (
      //     item.status !== 'subscription_canceled' ||
      //     item.status !== 'scheduled_canceled'
      //   );
      // }
    );

    if (activeSubscription.length === 0) {
      console.log('Cancelamento já efetuado anteriormente');
      return;
    }
    subscriptionCodeLicenciador = activeSubscription[0].id;

    await (await licenciadorAPI())
      .delete(
        `/client/${codeLicenciador}/subscription/${subscriptionCodeLicenciador}`
      )
      .then(async response => {
        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: customerId,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_SUBSCRIPTION_CANCELED,
            field: 'event',
          },
        ]);
        if (errData.length > 0) {
          console.log(
            `ERROR REPROCESSING: customer_id: ${customerId} - ${Events.LICENCIADOR_SUBSCRIPTION_CANCELED}`
          );
          for await (const err of errData) {
            await LicenciadorErrorsRepository.remove(err.id);
          }
        }
        await EventsRepository.create({
          codeEvent: Events.LICENCIADOR_SUBSCRIPTION_CANCELED,
          relatedId: customerId,
          payload: { subscription },
          status: 'success',
        });
      })
      .catch(async error => {
        const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
          error.response.status
        );
        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: customerId,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_SUBSCRIPTION_CANCELED,
            field: 'event',
          },
        ]);
        if (errData.length === 0) {
          await LicenciadorErrorsRepository.create({
            event: Events.LICENCIADOR_SUBSCRIPTION_CANCELED,
            action: typeAction ? 'retry' : 'call_IT',
            // @ts-ignore
            payload: { subscription },
            response: error.response.data,
            customerId,
            queueMessage: this.data,
          });
        } else {
          await LicenciadorErrorsRepository.update(errData[0].id, {
            action: typeAction ? 'retry' : 'call_IT',
            httpCode: error.response.status,
            response: error.response.data,
          });
        }
      });
  }

  public async updatePaymentMethod(): Promise<void> {
    const subscription = await subscriptionfindById(this.data.id);
    // @ts-ignore
    const { customerId, codeLicenciador } = subscription;
    const errData = await errorInterfaceRepository.findOne({
      value: customerId,
      field: 'related_id',
    });
    const customer = await customerfindById(customerId);
    const updateData = {
      paymentMethod: this.data.paymentMethod,
    };
    try {
      const getData = await (await licenciadorAPI()).get(
        `/client/subscription?document=${customer.registryCode}`
      );
      const activeSubscription = getData.data.subscriptions.filter(
        (item: any) => {
          return (
            item.status !== 'subscription_canceled' ||
            item.status !== 'scheduled_canceled'
          );
        }
      );
      const response = await (await licenciadorAPI()).put(
        `/client/${getData.data.id}/subscription/${activeSubscription[0].id}`,
        updateData
      );
      if (response.status > 201) {
        throw new Error(response.data.errorMessage || response.data);
      }
      if (
        errData &&
        errData.event === Events.LICENCIADOR_UPDATE_PAYMENT_METHOD
      ) {
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
        codeEvent: Events.LICENCIADOR_UPDATE_PAYMENT_METHOD,
        relatedId: customerId,
        payload: updateData,
        status: 'success',
      });
    } catch (error) {
      console.log(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (
        !errData ||
        errData.event !== Events.LICENCIADOR_UPDATE_PAYMENT_METHOD
      ) {
        await errorInterfaceRepository.create({
          relatedId: customerId,
          level: 'MEDIUM',
          system: 'LICENCIADOR',
          action: typeAction ? 'retry' : 'call_IT',
          message: error.message,
          event: Events.LICENCIADOR_UPDATE_PAYMENT_METHOD,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.LICENCIADOR_UPDATE_PAYMENT_METHOD) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.LICENCIADOR_UPDATE_PAYMENT_METHOD);
    }
  }

  public async addSubscription(): Promise<void> {
    // @ts-ignore
    const newSubscription: NewSubscriptionInterface = this.data;

    let recurrence = 1;
    switch (newSubscription.planCode) {
      case 'TOTVSMENSAL':
        recurrence = Recurrence.MENSAL;
        break;
      case 'TOTVSBIMESTRAL':
        recurrence = Recurrence.BIMESTRAL;
        break;
      case 'TOTVSTRIMESTRAL':
        recurrence = Recurrence.TRIMESTRAL;
        break;
      case 'TOTVSQUADRIMESTRAL':
        recurrence = Recurrence.QUADRIMESTRAL;
        break;
      case 'TOTVSSEMESTRAL':
        recurrence = Recurrence.SEMESTRAL;
        break;
      case 'TOTVSANUAL':
        recurrence = Recurrence.ANUAL;
        break;
      default:
        break;
    }
    // @ts-ignore
    let data;
    if (newSubscription.paymentMethod === 'online_bank_slip') {
      newSubscription.paymentMethod = 'bank_slip';
    }
    if (newSubscription.discount) {
      data = {
        paymentMethod: newSubscription.paymentMethod,
        recurrenceMonths: recurrence,
        charge: newSubscription.price,
        status: 'subscription_created',
        startAt: new Date(),
        endAt: this.data.periodEndAt
          ? new Date(this.data.periodEndAt)
          : addDays(new Date(), 5),
        offers: newSubscription.offers,
        vouchers: [
          {
            value: newSubscription.discount.amount,
            validUntil: addMonths(new Date(), newSubscription.discount.cycles),
          },
        ],
      };
    } else {
      data = {
        paymentMethod: newSubscription.paymentMethod,
        recurrenceMonths: recurrence,
        charge: newSubscription.price,
        status: 'subscription_created',
        startAt: new Date(),
        endAt: this.data.periodEndAt
          ? new Date(this.data.periodEndAt)
          : addDays(new Date(), 5),
        offers: newSubscription.offers,
      };
    }

    const customer = await CustomerRepository.findById(
      newSubscription.customerId
    );
    let { codeLicenciador } = customer;
    if (!customer.codeLicenciador) {
      const getData = await (await licenciadorAPI()).get(
        `/client/subscription?document=${customer.registryCode}`
      );
      codeLicenciador = getData.data.id;
    }

    await (await licenciadorAPI())
      .post(`/client/${codeLicenciador}/subscription`, data)
      .then(async response => {
        // Prepare Error Handling
        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: this.data.customerId,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_NEW_SUBSCRIPTION,
            field: 'event',
          },
        ]);
        if (errData.length > 0) {
          console.log(
            `ERROR REPROCESSING: customer_id: ${this.data.id} - ${Events.LICENCIADOR_NEW_SUBSCRIPTION}`
          );
          for await (const err of errData) {
            await LicenciadorErrorsRepository.remove(err.id);
          }
        }
        await EventsRepository.create({
          codeEvent: Events.LICENCIADOR_NEW_SUBSCRIPTION,
          relatedId: newSubscription.customerId,
          // @ts-ignore
          payload: data,
          status: 'success',
        });
        await updateFieldsSubscriptionToLicenciador(
          newSubscription.id,
          response.data.id
        );
      })
      .catch(async error => {
        const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
          error.response.status
        );
        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: this.data.customerId,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_NEW_SUBSCRIPTION,
            field: 'event',
          },
        ]);
        if (errData.length === 0) {
          await LicenciadorErrorsRepository.create({
            event: Events.LICENCIADOR_NEW_SUBSCRIPTION,
            action: typeAction ? 'retry' : 'call_IT',
            // @ts-ignore
            payload: data,
            response: error.response.data,
            customerId: newSubscription.customerId,
            queueMessage: this.data,
          });
        } else {
          await LicenciadorErrorsRepository.update(errData[0].id, {
            action: typeAction ? 'retry' : 'call_IT',
            httpCode: error.response.status,
            response: error.response.data,
          });
        }
      });
  }

  public async addOffers(): Promise<void> {
    const errData = await errorInterfaceRepository.findOne({
      value: this.data.customer.id,
      field: 'related_id',
    });
    const customer = await customerfindById(this.data.customer.id);
    try {
      const getData = await (await licenciadorAPI()).get(
        `/client/subscription?document=${customer.registryCode}`
      );
      const activeSubscription = getData.data.subscriptions.filter(
        (item: any) => {
          return (
            item.status !== 'subscription_canceled' ||
            item.status !== 'scheduled_canceled'
          );
        }
      );

      const purchase = await pendingPurchaseRepository.findById(this.data.code);

      const data = {
        offers: purchase.offers,
      };
      const response = await (await licenciadorAPI()).put(
        `/client/${getData.data.id}/subscription/${activeSubscription[0].id}`,
        data
      );
      if (response.status > 201) {
        throw new Error(response.data.errorMessage || response.data);
      }
      if (errData && errData.event === Events.LICENCIADOR_ADD_OFFERS) {
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
        codeEvent: Events.LICENCIADOR_ADD_OFFERS,
        relatedId: this.data.customer.id,
        payload: data,
        status: 'success',
      });
    } catch (error) {
      console.log(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (!errData || errData.event !== Events.LICENCIADOR_ADD_OFFERS) {
        await errorInterfaceRepository.create({
          relatedId: this.data.customer.id,
          level: 'HIGH',
          system: 'LICENCIADOR',
          action: typeAction ? 'retry' : 'call_IT',
          message: error.message,
          event: Events.LICENCIADOR_ADD_OFFERS,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.LICENCIADOR_ADD_OFFERS) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.LICENCIADOR_ADD_OFFERS);
    }
  }

  public async updatePrice(): Promise<void> {
    const errData = await errorInterfaceRepository.findOne({
      value: this.data.customer.id,
      field: 'related_id',
    });
    const customer = await customerfindById(this.data.customer.id);
    try {
      const getData = await (await licenciadorAPI()).get(
        `/client/subscription?document=${customer.registryCode}`
      );
      const activeSubscription = getData.data.subscriptions.filter(
        (item: any) => {
          return (
            item.status !== 'subscription_canceled' ||
            item.status !== 'scheduled_canceled'
          );
        }
      );
      let data;
      if (this.data.discount) {
        data = {
          charge: this.data.newPrice,
          vouchers: [
            {
              value: this.data.discount.amount,
              validUntil: addMonths(new Date(), this.data.discount.cycles),
            },
          ],
        };
      } else {
        data = {
          charge: this.data.newPrice,
        };
      }

      const response = await (await licenciadorAPI()).put(
        `/client/${getData.data.id}/subscription/${activeSubscription[0].id}`,
        data
      );
      if (response.status > 201) {
        throw new Error(response.data.errorMessage || response.data);
      }
      if (errData && errData.event === Events.LICENCIADOR_UPDATE_PRICE) {
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
        codeEvent: Events.LICENCIADOR_UPDATE_PRICE,
        relatedId: this.data.customer.id,
        payload: data,
        status: 'success',
      });
    } catch (error) {
      console.log(error);
      const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
        error.response.status || 999
      );
      if (!errData || errData.event !== Events.LICENCIADOR_UPDATE_PRICE) {
        await errorInterfaceRepository.create({
          relatedId: this.data.customer.id,
          level: 'HIGH',
          system: 'LICENCIADOR',
          action: typeAction ? 'retry' : 'call_IT',
          message: error.message,
          event: Events.LICENCIADOR_UPDATE_PRICE,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.LICENCIADOR_UPDATE_PRICE) {
        await errorInterfaceRepository.update(errData.id, {
          action: typeAction ? 'retry' : 'call_IT',
          httpCode: error.response.status || 999,
        });
      }
      throw new Error(Events.LICENCIADOR_UPDATE_PRICE);
    }
  }

  public async addDiscount(): Promise<void> {
    const data = {
      vouchers: [
        {
          value: this.data.discount.amount,
          validUntil: addMonths(new Date(), this.data.discount.cycles),
        },
      ],
    };

    await (await licenciadorAPI())
      .put(
        `/client/${this.data.licenseManager.clientId}/subscription/${this.data.licenseManager.subscriptionId}`,
        data
      )
      .then(async response => {
        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: this.data.customer.id,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_ADD_DISCOUNT,
            field: 'event',
          },
        ]);

        if (errData.length > 0) {
          console.log(
            `SUCCESS REPROCESSING: customer_id: ${this.data.customer.id} - ${Events.LICENCIADOR_ADD_DISCOUNT}`
          );

          for await (const err of errData) {
            await LicenciadorErrorsRepository.remove(err.id);
          }
        }

        await EventsRepository.create({
          codeEvent: Events.LICENCIADOR_ADD_DISCOUNT,
          relatedId: this.data.customer.id,
          // @ts-ignore
          payload: data,
          status: 'success',
        });
      })
      .catch(async error => {
        console.error(
          'An error occurred while trying to create a new discount.',
          error
        );
        const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
          error.response.status
        );

        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: this.data.customer.id,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_ADD_DISCOUNT,
            field: 'event',
          },
        ]);

        if (errData.length === 0) {
          await LicenciadorErrorsRepository.create({
            event: Events.LICENCIADOR_ADD_DISCOUNT,
            action: typeAction ? 'retry' : 'call_IT',
            // @ts-ignore
            payload: data,
            response: error.response.data,
            customerId: this.data.customer.id,
            queueMessage: this.data,
          });
        } else {
          await LicenciadorErrorsRepository.update(errData[0].id, {
            action: typeAction ? 'retry' : 'call_IT',
            httpCode: error.response.status,
          });
        }
      });
  }

  public async changePrice(): Promise<void> {
    const data = {
      charge: this.data.newPrice,
    };

    await (await licenciadorAPI())
      .put(
        `/client/${this.data.licenciador.customerId}/subscription/${this.data.licenciador.subscriptionId}`,
        data
      )
      .then(async response => {
        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: this.data.customerId,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_CHANGE_PRICE,
            field: 'event',
          },
        ]);

        if (errData.length > 0) {
          console.log(
            `SUCCESS REPROCESSING: customer_id: ${this.data.customerId} - ${Events.LICENCIADOR_CHANGE_PRICE}`
          );

          for await (const err of errData) {
            await LicenciadorErrorsRepository.remove(err.id);
          }
        }

        await EventsRepository.create({
          codeEvent: Events.LICENCIADOR_CHANGE_PRICE,
          relatedId: this.data.customerId,
          // @ts-ignore
          payload: data,
          status: 'success',
        });
      })
      .catch(async error => {
        console.error(
          'An error occurred while trying to change subscription price.',
          error
        );
        const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
          error.response.status
        );

        const errData = await LicenciadorErrorsRepository.findByManyParameters([
          {
            value: this.data.customerId,
            field: 'customer_id',
          },
          {
            value: Events.LICENCIADOR_CHANGE_PRICE,
            field: 'event',
          },
        ]);

        if (errData.length === 0) {
          await LicenciadorErrorsRepository.create({
            event: Events.LICENCIADOR_CHANGE_PRICE,
            action: typeAction ? 'retry' : 'call_IT',
            // @ts-ignore
            payload: data,
            response: error.response.data,
            customerId: this.data.customerId,
            queueMessage: this.data,
          });
        } else {
          await LicenciadorErrorsRepository.update(errData[0].id, {
            action: typeAction ? 'retry' : 'call_IT',
            httpCode: error.response.status,
          });
        }
      });
  }
}

/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { vindiAPI } from '../../../common/lib/external_apis';
import {
  updateFieldsCustomerToVindi,
  customerfindById,
  findCustomerPhoneByParameters,
} from '../../../repositories/CustomersRepository';
import EventsRepository from '../../../repositories/EventsRepository';
import { Events } from '../../internal-processes/interfaces/common-enums';
import errorInterfaceRepository from '../../../repositories/ErrorInterfaceRepository';
import errorArchiveRepository from '../../../repositories/ErrorArchiveRepository';
import { ERROR_CODE_INTERNAL_RETRY } from '../../internal-processes/interfaces/constants';
import { sendToQueue } from '../../../common/lib/sqs';
import {
  updateFieldsSubscriptionToVindi,
  subscriptionfindByCustomerId,
  update,
  setReasonToCancelSubscription,
  subscriptionfindById,
  addDiscount,
} from '../../../repositories/SubscriptionsRepository';
import NewSubscriptionInterface from '../interfaces/new-subscription.interface';
import pendingPurchaseRepository from '../../../repositories/PendingPurchaseRepository';
import CustomerRepository from '../../../repositories/v2/CustomerRepository';
import VindiErrorsRepository from '../../../repositories/VindiErrorsRepository';
import SubscriptionRepository from '../../../repositories/v2/SubscriptionRepository';

export default class VindiService {
  private data: Record<string, any>;

  private errorCode: number;

  constructor(record: string) {
    this.data = JSON.parse(record);
  }

  private async shareNewCustomerToSystems(): Promise<void> {
    // Store
    await sendToQueue(
      JSON.stringify({
        ...this.data,
        key: Events.STORE_NEW_CUSTOMER,
      }),
      `${process.env.EVENTS_STORE_QUEUE}`
    );
    // Licenciador
    await sendToQueue(
      JSON.stringify({
        ...this.data,
        key: Events.LICENCIADOR_ADD_CUSTOMER,
      }),
      `${process.env.EVENTS_LICENCIADOR_QUEUE}`
    );
    // Protheus
    await sendToQueue(
      JSON.stringify({
        ...this.data,
        key: Events.PROTHEUS_ADD_CUSTOMER,
      }),
      `${process.env.EVENTS_PROTHEUS_QUEUE}`
    );
  }

  private async shareUpdateCustomerToSystems(): Promise<void> {
    // Licenciador
    await sendToQueue(
      JSON.stringify({
        ...this.data,
        key: Events.LICENCIADOR_UPDATE_CUSTOMER,
      }),
      `${process.env.EVENTS_LICENCIADOR_QUEUE}`
    );
  }

  private async shareNewSubscritionToSystems(): Promise<void> {
    // Licenciador
    await sendToQueue(
      JSON.stringify({
        ...this.data,
        key: Events.LICENCIADOR_NEW_SUBSCRIPTION,
      }),
      `${process.env.EVENTS_LICENCIADOR_QUEUE}`
    );
  }

  private async shareUpdatePaymentToSystems(id: string): Promise<void> {
    // Licenciador
    await sendToQueue(
      JSON.stringify({
        ...this.data,
        key: Events.LICENCIADOR_UPDATE_PAYMENT_METHOD,
        id,
      }),
      `${process.env.EVENTS_LICENCIADOR_QUEUE}`
    );
  }

  public async addCustomer(): Promise<void> {
    const event = Events.VINDI_NEWCUSTOMER;
    const data = {
      name: this.data.name,
      email: this.data.email,
      registry_code: this.data.registryCode,
      code: this.data.id,
      notes: this.data.notes,
      metadata: '',
      address: {
        street: this.data.address.street,
        number: this.data.address.number,
        additional_details: this.data.address.additionalDetails,
        zipcode: this.data.address.zipcode,
        neighborhood: this.data.address.neighborhood,
        city: this.data.address.city,
        state: `${this.data.address.state}`,
        country: 'BR',
      },
      phones: this.data.phones.map(
        (item: {
          phoneType: any;
          phone: { country: any; area: any; number: any; extension: any };
        }) => {
          return {
            phone_type: item.phoneType,
            number: `${item.phone.country}${item.phone.area}${item.phone.number}`,
            extension: item.phone.extension,
          };
        }
      ),
    };

    await (await vindiAPI())
      .post('/customers', data)
      .then(async response => {
        console.log({
          action: 'sent-customer-vindi',
          status: response.status,
          description: response.statusText,
          customer: response.data.customer,
        });

        this.checkReprocessing(this.data.id, event);

        await updateFieldsCustomerToVindi(
          this.data.id,
          response.data.customer.id
        );

        await EventsRepository.create({
          codeEvent: event,
          relatedId: this.data.id,
          payload: this.data,
          status: 'success',
        });
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao enviar o cliente ${this.data.id} para a Vindi`,
          error
        );
        await this.catchError(error, this.data.id, data, this.data, event);
      });
  }

  public async updateCustomer(): Promise<void> {
    const event = Events.VINDI_UPDATECUSTOMER;
    const reponseGetCustomer = await (await vindiAPI()).get(
      `/customers?query=code:${this.data.id}`
    );
    const phones = await findCustomerPhoneByParameters(
      { value: this.data.id, field: 'customer_id' },
      { value: true, field: 'default' }
    );
    const data = {
      name: this.data.name,
      email: this.data.email,
      registry_code: this.data.registryCode,
      code: this.data.id,
      notes: this.data.notes,
      metadata: '',
      address: {
        street: this.data.address.street,
        number: this.data.address.number,
        additional_details: this.data.address.additionalDetails,
        zipcode: this.data.address.zipcode,
        neighborhood: this.data.address.neighborhood,
        city: this.data.address.city,
        state: `${this.data.address.state}`,
        country: 'BR',
      },
      phones: [
        {
          // @ts-ignore
          id: reponseGetCustomer.data.customers[0].phones[0].id,
          phone_type: phones[0].type,
          number: phones[0].number,
          extension: phones[0].extension,
        },
      ],
    };

    await (await vindiAPI())
      .put(`/customers/${this.data.vindiCode}`, data)
      .then(async response => {
        console.log({
          action: 'update-customer-vindi',
          status: response.status,
          description: response.statusText,
          customer: response.data.customer,
        });

        await this.checkReprocessing(this.data.id, event);

        await EventsRepository.create({
          codeEvent: event,
          relatedId: this.data.id,
          payload: this.data,
          status: 'success',
        });

        await this.shareUpdateCustomerToSystems();
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao atualizar o cliente ${this.data.id} na Vindi`,
          error
        );
        await this.catchError(error, this.data.id, data, this.data, event);
      });
  }

  public async addSubscription(): Promise<void> {
    // @ts-ignore
    const newSubscription: NewSubscriptionInterface = this.data;
    let { paymentMethod } = newSubscription;
    let data: any;

    if (newSubscription.paymentMethod === 'paypal') {
      paymentMethod = 'offsite';
    }

    if (!newSubscription.vindiCustomerCode) {
      const reponseGetCustomer = await (await vindiAPI()).get(
        `/customers?query=code:${newSubscription.customerId}`
      );
      newSubscription.vindiCustomerCode =
        reponseGetCustomer.data.customers[0].id;
    }

    if (newSubscription.billingAt) {
      const discounts = newSubscription.discount
        ? [
            {
              discount_type: 'amount',
              amount:
                parseFloat(newSubscription.price) -
                parseFloat(newSubscription.discount.amount),
              cycles: '1',
            },
            {
              discount_type: 'amount',
              amount: newSubscription.discount.amount,
              cycles: (newSubscription.discount.cycles || 0) + 1,
            },
          ]
        : [
            {
              discount_type: 'amount',
              amount: newSubscription.price,
              cycles: '1',
            },
          ];

      data = {
        start_at: newSubscription.startAt || null,
        plan_id: newSubscription.planId,
        customer_id: newSubscription.vindiCustomerCode,
        code: newSubscription.id,
        payment_method_code: paymentMethod,
        installments: newSubscription.installments
          ? newSubscription.installments
          : 1,
        product_items: [
          {
            product_id: `${process.env.PRODUCTID_VINDI}`,
            pricing_schema: {
              price: newSubscription.price,
              schema_type: 'flat',
            },
            discounts,
          },
        ],
      };
    } else if (newSubscription.discount) {
      data = {
        start_at: newSubscription.startAt || null,
        plan_id: newSubscription.planId,
        customer_id: newSubscription.vindiCustomerCode,
        code: newSubscription.id,
        payment_method_code: paymentMethod,
        installments: newSubscription.installments
          ? newSubscription.installments
          : 1,
        product_items: [
          {
            product_id: `${process.env.PRODUCTID_VINDI}`,
            pricing_schema: {
              price: newSubscription.price,
              schema_type: 'flat',
            },
            discounts: [
              {
                discount_type: 'amount',
                amount: newSubscription.discount.amount,
                cycles: newSubscription.discount.cycles || '1',
              },
            ],
          },
        ],
      };
    } else {
      data = {
        start_at: newSubscription.startAt || null,
        plan_id: newSubscription.planId,
        customer_id: newSubscription.vindiCustomerCode,
        code: newSubscription.id,
        payment_method_code: newSubscription.paymentMethod,
        installments: newSubscription.installments
          ? newSubscription.installments
          : 1,
        product_items: [
          {
            product_id: `${process.env.PRODUCTID_VINDI}`,
            pricing_schema: {
              price: newSubscription.price,
              schema_type: 'flat',
            },
          },
        ],
      };
    }

    await (await vindiAPI())
      .post('/subscriptions', data)
      .then(async response => {
        console.log({
          action: 'new-subscription-vindi',
          status: response.status,
          description: response.statusText,
          data: response.data,
        });

        await this.checkReprocessing(
          newSubscription.customerId,
          Events.VINDI_NEWSUBSCRIPTION
        );

        await EventsRepository.create({
          codeEvent: Events.VINDI_NEWSUBSCRIPTION,
          relatedId: newSubscription.customerId,
          // @ts-ignore
          payload: data,
          status: 'success',
          migrated: !!this.data.billingAt,
        });

        await updateFieldsSubscriptionToVindi(
          newSubscription.id,
          response.data.subscription.id
        );
        if (newSubscription.billingAt) {
          await sendToQueue(
            JSON.stringify({
              ...this.data,
              periodId: response.data.subscription.current_period.id,
              periodEndAt: new Date(this.data.billingAt),
              key: Events.VINDI_MIGRATION_PERIOD,
            }),
            `${process.env.EVENTS_VINDI_QUEUE}`
          );

          await sendToQueue(
            JSON.stringify({
              ...this.data,
              key: Events.STORE_SUBSCRIPTION_MIGRATED,
            }),
            `${process.env.EVENTS_STORE_QUEUE}`
          );
        }
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao criar a assinatura na Vindi para o cliente ${newSubscription.customerId}`,
          error
        );
        await this.catchError(
          error,
          newSubscription.customerId,
          data,
          this.data,
          Events.VINDI_NEWSUBSCRIPTION
        );
      });
  }

  public async updatePaymentMethod(): Promise<void> {
    const event = Events.VINDI_UPDATE_PAYMENT_METHOD;
    // @ts-ignore
    const updatePaymentData: {
      customerId: string;
      paymentMethod: string;
    } = this.data;
    const data = {
      payment_method_code: updatePaymentData.paymentMethod,
    };
    const subscription = await subscriptionfindByCustomerId(
      updatePaymentData.customerId
    );
    const customer = await customerfindById(updatePaymentData.customerId);

    try {
      if (
        subscription[0].paymentMethod === 'credit_card' &&
        updatePaymentData.paymentMethod === 'credit_card'
      ) {
        const profile = await (await vindiAPI()).get(
          `/payment_profiles?query=customer_id:${customer.vindiCode}`
        );
        await (await vindiAPI()).delete(
          `/payment_profiles/${profile.data.payment_profiles[0].id}`
        );
      }
    } catch (error) {
      console.warn(
        `Ocorreu um erro ao buscar os perfis de pagamento do cliente ${updatePaymentData.customerId} na Vindi`,
        error
      );
    }

    if (
      process.env.ENV === 'prod' &&
      updatePaymentData.paymentMethod === 'bank_slip'
    ) {
      data.payment_method_code = 'online_bank_slip';
    }

    await (await vindiAPI())
      .put(`/subscriptions/${subscription[0].vindiId}`, data)
      .then(async response => {
        console.log({
          action: 'update-payment-method-vindi',
          status: response.status,
          description: response.statusText,
          data: response.data.subscription,
        });

        await this.checkReprocessing(updatePaymentData.customerId, event);

        await update(subscription[0].id, {
          paymentMethod: updatePaymentData.paymentMethod,
        });

        await EventsRepository.create({
          codeEvent: Events.VINDI_UPDATE_PAYMENT_METHOD,
          relatedId: updatePaymentData.customerId,
          payload: updatePaymentData,
          status: 'success',
        });
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao atualizar o método de pagamento na Vindi para o cliente ${updatePaymentData.customerId}`,
          error
        );
        await this.catchError(
          error,
          updatePaymentData.customerId,
          data,
          this.data,
          event
        );
      });
  }

  public async cancelSubscription(): Promise<void> {
    const event = Events.VINDI_CANCELSUBSCRIPTION;
    // @ts-ignore
    const cancelData: {
      id: string;
      customerId: string;
      reason: Record<string, any>;
    } = this.data;

    await (await vindiAPI())
      .delete(`/subscriptions/${cancelData.id}`)
      .then(async response => {
        console.log({
          action: 'cancel-subscription-vindi',
          status: response.status,
          description: response.statusText,
          data: response.data,
        });

        this.checkReprocessing(cancelData.customerId, event);

        await EventsRepository.create({
          codeEvent: Events.VINDI_CANCELSUBSCRIPTION,
          relatedId: cancelData.customerId,
          payload: cancelData,
          status: 'success',
        });
        const subscription = await SubscriptionRepository.findOne({
          value: cancelData.id,
          field: 'vindi_id',
        });

        await SubscriptionRepository.update(subscription.id, {
          reason: cancelData.reason,
        });
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao cancelar a subscrição do cliente ${cancelData.customerId} na Vindi`,
          error
        );
        await this.catchError(
          error,
          cancelData.customerId,
          cancelData,
          this.data,
          event
        );
      });
  }

  public async newBill(): Promise<void> {
    const event = Events.VINDI_NEWITEM_BILL;
    const data = {
      customer_id: this.data.customer.vindi_id,
      code: this.data.code,
      installments: this.data.installments || 1,
      payment_method_code: this.data.payment_method_code,
      bill_items: [
        {
          product_id: `${process.env.PRODUCTID_RECOMPRA}`,
          amount: this.data.bill_price,
        },
      ],
    };

    await (await vindiAPI())
      .post(`/bills`, data)
      .then(async response => {
        console.log({
          action: 'new-bill-vindi',
          status: response.status,
          description: response.statusText,
          data: response.data.subscription,
        });

        await this.checkReprocessing(this.data.customer.id, event);

        await pendingPurchaseRepository.update(data.code, {
          billId: response.data.id,
          chargeId: response.data.bill.charges[0].id,
        });

        await EventsRepository.create({
          codeEvent: event,
          relatedId: this.data.customer.id,
          payload: this.data,
          status: 'success',
        });
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao criar a fatura do cliente ${this.data.customer.id} na Vindi`,
          error
        );
        await this.catchError(
          error,
          this.data.customer.id,
          data,
          this.data,
          event
        );
      });
  }

  public async updatePrice(): Promise<void> {
    const purchase = await pendingPurchaseRepository.findById(
      this.data.purchase
    );
    const subscription = await subscriptionfindById(this.data.subscription);

    const newPrice = (
      parseFloat(subscription!.price) + parseFloat(purchase.price)
    ).toFixed(2);

    const data = {
      status: 'active',
      pricing_schema: {
        price: newPrice,
        schema_type: 'flat',
      },
    };

    const reponseSubscription = await (await vindiAPI()).get(
      `/subscriptions/${subscription?.vindiId}`
    );

    await (await vindiAPI())
      .put(
        `/product_items/${reponseSubscription.data.subscription.product_items[0].id}`,
        data
      )
      .then(async response => {
        console.log({
          action: 'update-price-vindi',
          status: response.status,
          description: response.statusText,
          data: response.data.subscription,
        });

        await this.checkReprocessing(
          this.data.customer,
          Events.VINDI_UPDATE_PRICE
        );

        if (purchase.discount) {
          await sendToQueue(
            JSON.stringify({
              customer: {
                id: this.data.customer,
                subscription: this.data.subscription,
              },
              discount: {
                amount: purchase.discount.amount,
                cycles: purchase.discount.cycles,
              },
              product_id:
                reponseSubscription.data.subscription.product_items[0].id,
              key: Events.VINDI_ADD_DISCOUNT,
            }),
            `${process.env.EVENTS_VINDI_QUEUE}`
          );
        }

        await update(this.data.subscription, {
          price: newPrice,
        });

        await pendingPurchaseRepository.remove(purchase.id);

        await sendToQueue(
          JSON.stringify({
            customer: {
              id: this.data.customer,
            },
            discount: purchase.discount,
            newPrice,
            key: Events.LICENCIADOR_UPDATE_PRICE,
          }),
          `${process.env.EVENTS_LICENCIADOR_QUEUE}`
        );

        await EventsRepository.create({
          codeEvent: Events.VINDI_UPDATE_PRICE,
          relatedId: this.data.customer,
          payload: this.data,
          status: 'success',
        });
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao atualizar o preço da subscrição do cliente ${this.data.customer} na Vindi`,
          error
        );
        await this.catchError(
          error,
          this.data.customer,
          data,
          this.data,
          Events.VINDI_UPDATE_PRICE
        );
      });
  }

  public async changePrice(): Promise<void> {
    const event = Events.VINDI_CHANGE_PRICE;
    const data = {
      status: 'active',
      pricing_schema: {
        price: this.data.newPrice,
        schema_type: 'flat',
      },
    };

    await (await vindiAPI())
      .put(`/product_items/${this.data.productItemId}`, data)
      .then(async response => {
        console.log({
          action: 'change-price-vindi',
          status: response.status,
          description: response.statusText,
          data: response.data,
        });

        await this.checkReprocessing(this.data.customerId, event);

        await EventsRepository.create({
          codeEvent: event,
          relatedId: this.data.customer,
          payload: data,
          status: 'success',
        });
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao trocar o preço da subscrição do cliente ${this.data.customer} na Vindi`,
          error
        );
        await this.catchError(
          error,
          this.data.customer,
          data,
          this.data,
          event
        );
      });
  }

  public async addDiscount(): Promise<void> {
    const event = Events.VINDI_ADD_DISCOUNT;

    const data = {
      product_item_id: this.data.product_id,
      discount_type: 'amount',
      amount: this.data.discount.amount,
      cycles: this.data.discount.cycles || 1,
    };

    await (await vindiAPI())
      .post(`/discounts`, data)
      .then(async response => {
        console.log({
          action: 'add-discount-vindi',
          status: response.status,
          description: response.statusText,
          data: response.data,
        });

        await this.checkReprocessing(this.data.customer.id, event);

        await addDiscount(this.data.customer.subscription, this.data.discount);

        await EventsRepository.create({
          codeEvent: event,
          relatedId: this.data.customer.id,
          payload: this.data,
          status: 'success',
        });
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao incluir o desconto na subscrição para o cliente ${this.data.customer.id}`,
          error
        );
        await this.catchError(
          error,
          this.data.customer.id,
          data,
          this.data,
          event
        );
      });
  }

  public async changePeriod(): Promise<void> {
    const event = Events.VINDI_MIGRATION_PERIOD;
    const data = {
      end_at: new Date(this.data.periodEndAt),
    };

    await (await vindiAPI())
      .put(`/periods/${this.data.periodId}`, data)
      .then(async response => {
        console.log({
          action: 'update-period-vindi',
          status: response.status,
          description: response.statusText,
          data: response.data.subscription,
        });

        this.checkReprocessing(this.data.customerId, event);

        await EventsRepository.create({
          codeEvent: event,
          relatedId: this.data.customerId,
          payload: this.data,
          status: 'success',
        });
      })
      .catch(async error => {
        console.error(
          `Ocorreu um erro ao atualizar o período da subscrição para o cliente ${this.data.customerId}`,
          error
        );
        await this.catchError(
          error,
          this.data.customerId,
          data,
          this.data,
          event
        );
      });
  }

  private async checkReprocessing(
    customerId: string,
    event: Events
  ): Promise<void> {
    const errData = await VindiErrorsRepository.findByManyParameters([
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
      console.log(
        `SUCCESS REPROCESSING: customer_id: ${customerId} - ${event}`
      );

      for await (const err of errData) {
        await VindiErrorsRepository.remove(err.id);
      }
    }
  }

  private async catchError(
    error: any,
    customerId: string,
    payload: any,
    queueMessage: any,
    event: Events
  ): Promise<void> {
    const typeAction = ERROR_CODE_INTERNAL_RETRY.includes(
      error.response.status
    );

    const errData = await VindiErrorsRepository.findByManyParameters([
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
      await VindiErrorsRepository.create({
        event,
        action: typeAction ? 'retry' : 'call_IT',
        payload,
        response: error.response.data,
        customerId,
        queueMessage,
      });
    } else {
      await VindiErrorsRepository.update(errData[0].id, {
        action: typeAction ? 'retry' : 'call_IT',
        httpCode: error.response.status,
      });
    }
  }
}

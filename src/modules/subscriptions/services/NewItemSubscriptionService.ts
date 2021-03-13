/* eslint-disable @typescript-eslint/camelcase */
import * as Joi from '@hapi/joi';
import NewItemRequestInterface from '../interfaces/new-item-request.interface';
import { subscriptionfindByCustomerDocument } from '../../../repositories/SubscriptionsRepository';
import { Events } from '../../internal-processes/interfaces/common-enums';
import { customerfindByRegistryCode } from '../../../repositories/CustomersRepository';
import { sendToQueue } from '../../../common/lib/sqs';
import pendingPurchaseRepository from '../../../repositories/PendingPurchaseRepository';
import billRepository from '../../../repositories/BillRepository';
import subscriptionRepository from '../../../repositories/v2/SubscriptionRepository';
import {
  getSubscriptionByDoc,
  getVindiData,
} from '../../queries/services/subscription-service';

const schema = Joi.object({
  paymentMethod: Joi.string()
    .valid('credit_card', 'bank_slip', 'paypal', 'online_bank_slip')
    .required(), // adicionar na documentacao
  salesOrder: Joi.string().required(),
  planCode: Joi.string().required(),
  price: Joi.number().required(),
  billPrice: Joi.number().optional(), // adicionar na documentacao
  offers: Joi.array()
    .items(
      Joi.object({
        code: Joi.string().required(),
        quantity: Joi.number().required(),
        resellerProtheusId: Joi.string().optional(),
      })
    )
    .required(),
  installments: Joi.number().optional(), // adicionar na documentacao
  discount: Joi.object({
    amount: Joi.number().required(),
    cycles: Joi.number().required(),
  }).optional(),
});

export default class NewItemSubscriptionService {
  private body: NewItemRequestInterface;

  constructor(body: string | null) {
    if (!body) {
      throw new Error('Invalid Request');
    }
    this.body = JSON.parse(body);
    const { error } = schema.validate(this.body);
    if (error) {
      console.log(error);
      const resultError = error.details.map(err => err.message);
      throw new Error(resultError.toString());
    }
  }

  public async run(
    document: string
  ): Promise<{ status: string; request: string }> {
    await getVindiData(document);
    const subscriptions = await subscriptionfindByCustomerDocument(document);
    if (subscriptions.length === 0) {
      throw new Error('Subscription not found for this customer');
    }
    const existsOrder = await subscriptionRepository.find({
      value: this.body.salesOrder,
      field: 'sales_order',
    });
    if (existsOrder.length > 0) {
      throw new Error('Sales order already added previously');
    }
    const subscription = subscriptions.filter(item => {
      return item.status === 'ativa' || item.status === 'em processamento';
    });
    const bills = await billRepository.find({
      value: subscription[0].id,
      field: 'subscription_id',
    });
    const customer = await customerfindByRegistryCode(document);
    if (subscription[0].paymentMethod !== this.body.paymentMethod) {
      throw new Error(
        'Payment method must be the same as the current subscription.'
      );
    }
    const filterBills = bills.filter(item => {
      return item.status === 'pending';
    });

    if (filterBills.length > 0) {
      throw new Error(
        'Repurchase cannot be carried out with previous invoices pending.'
      );
    }
    if (subscription[0].status !== 'ativa') {
      throw new Error(
        'The current status of the subscription does not allow adding new items.'
      );
    }
    if (this.body.planCode !== subscription[0].planCode) {
      throw new Error('Plan code (recurrence) must be equal the subscription');
    }
    const purchase = await pendingPurchaseRepository.create({
      price: this.body.price,
      salesOrder: this.body.salesOrder,
      offers: this.body.offers,
      discount: this.body.discount,
    });
    const data = {
      code: purchase.id,
      installments: this.body.installments,
      customer: {
        id: customer[0].id,
        vindi_id: customer[0].vindiCode,
      },
      payment_method_code: this.body.paymentMethod,
      bill_price: this.body.billPrice,
    };
    if (process.env.ENV === 'prod' && this.body.paymentMethod === 'bank_slip') {
      this.body.paymentMethod = 'online_bank_slip';
    }
    await sendToQueue(
      JSON.stringify({
        ...data,
        key: Events.VINDI_NEWITEM_BILL,
      }),
      `${process.env.EVENTS_VINDI_QUEUE}`
    );
    await sendToQueue(
      JSON.stringify({
        ...data,
        key: Events.LICENCIADOR_ADD_OFFERS,
      }),
      `${process.env.EVENTS_LICENCIADOR_QUEUE}`
    );
    return {
      status: 'processing',
      request: 'NEW_PURCHASE',
    };
  }
}

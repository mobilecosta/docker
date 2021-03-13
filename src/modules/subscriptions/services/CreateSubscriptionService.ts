/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable @typescript-eslint/camelcase */
/**
 * Date: 03/09/20
 * Developer: Adalton L Goncalves - tp.adalton.goncalves@totvs.com.br
 * Subject: Migraçao de Contratos
 * Description: Adicionado a chamada de assinatura billingAt para migracao.
 */
import * as Joi from '@hapi/joi';

import { setDay, setMonth, setYear } from 'date-fns';
import RequestInterface from '../interfaces/request.interface';
import { customerfindById } from '../../../repositories/CustomersRepository';
import {
  subscriptionfindByCustomerId,
  StatusSubscription,
} from '../../../repositories/SubscriptionsRepository';
import {
  planFindByCode,
  createPlan,
} from '../../../repositories/PlansRepository';
import { sendToQueue } from '../../../common/lib/sqs';
import Plan from '../../../models/Plan';
import { uuid } from '../../../common/lib/uuid';
import { vindiAPI } from '../../../common/lib/external_apis';

import subscriptionRepository from '../../../repositories/v2/SubscriptionRepository';
import CustomerRepository from '../../../repositories/v2/CustomerRepository';

const schema = Joi.object({
  startAt: Joi.date().allow(null).optional(),
  billingAt: Joi.date().allow(null).optional(),
  customerId: Joi.string().required(),
  paymentMethod: Joi.string()
    .valid('credit_card', 'bank_slip', 'paypal', 'online_bank_slip')
    .required(),
  salesOrder: Joi.string().required(),
  planCode: Joi.string().required(),
  price: Joi.number().required(),
  offers: Joi.array()
    .items(
      Joi.object({
        code: Joi.string().required(),
        quantity: Joi.number().required(),
        resellerProtheusId: Joi.string().optional(),
      })
    )
    .required(),
  installments: Joi.number().optional(),
  discount: Joi.object({
    amount: Joi.number().required(),
    cycles: Joi.number().required(),
  }).optional(),
});

const creditCardPlan = {
  TOTVSMENSAL: 'MENSALONLINE',
  TOTVSBIMESTRAL: 'BIMESTRALONLINE',
  TOTVSTRIMESTRAL: 'TRIMESTRALONLINE',
  TOTVSQUADRIMESTRAL: 'QUADRIMESTRALONLINE',
  TOTVSSEMESTRAL: 'SEMESTRALONLINE',
  TOTVSANUAL: 'ANUALONLINE',
};

class CreateSubscriptionService {
  private body: RequestInterface;

  private vindiPlanId: string;

  private customerVindiId: string;

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

  // @ts-ignore
  // eslint-disable-next-line consistent-return
  public async run(): Promise<{
    status: string;
    request: string;
    customerId: string;
  }> {
    try {
      if (this.body.billingAt) {
        const customer = await CustomerRepository.findById(
          this.body.customerId
        );
        const code = customer.codeT || customer.id;
        this.body.salesOrder = `MIG${code}`;
      }
      const valid: boolean = await this.isValid(this.body);
      if (!valid) {
        throw new Error('Processing Error');
      }
      const data = {
        ...this.body,
        migrated: !!this.body.billingAt,
        id: uuid(),
        planId: this.vindiPlanId,
        vindiCustomerCode: this.customerVindiId,
      };
      if (process.env.ENV === 'prod' && data.paymentMethod === 'bank_slip') {
        data.paymentMethod = 'online_bank_slip';
      }
      await sendToQueue(
        JSON.stringify(data),
        `${process.env.SUBSCRIPTIONS_QUEUE}`
      );
      return {
        status: 'Processing Started',
        request: 'NEW_SUBSCRIPTION',
        customerId: this.body.customerId,
      };
    } catch (error) {
      throw new Error(error);
    }
  }

  private async isValid({
    customerId,
    planCode,
  }: RequestInterface): Promise<boolean> {
    const customer = await customerfindById(customerId);
    if (!customer) {
      throw new Error('Customer Not Found');
    }
    this.customerVindiId = customer.vindiCode;
    const subscription = await subscriptionfindByCustomerId(customerId);
    const existsOrder = await subscriptionRepository.find({
      value: this.body.salesOrder,
      field: 'sales_order',
    });
    if (existsOrder.length > 0) {
      throw new Error('Sales order already added previously');
    }

    // Verifica se existe assinatura com status valido (ativa ou processando)
    const isExists = subscription.filter(
      item =>
        item.status === StatusSubscription.ACTIVE ||
        item.status === StatusSubscription.PROCESSING
    );
    if (isExists.length > 0) {
      throw new Error(
        `Subscription found for this customer. Subscription: ${isExists[0].id} | Status: ${isExists[0].status}`
      );
    }

    let planId =
      this.body.paymentMethod === 'credit_card' ||
      this.body.paymentMethod === 'paypal'
        ? await planFindByCode(creditCardPlan[planCode])
        : await planFindByCode(planCode);

    if (planId.length === 0) {
      const response = await (await vindiAPI()).get('/plans');
      if (response.status > 200) {
        throw new Error('Unable to connect to the payment system');
      }
      response.data.plans.map(async (item: any) => {
        const plan: Plan = {
          id: uuid(),
          planId: item.id,
          planCode: item.code || 'UNDEFINED',
        };
        await createPlan(plan);
      });

      planId =
        this.body.paymentMethod === 'credit_card' ||
        this.body.paymentMethod === 'paypal'
          ? await planFindByCode(creditCardPlan[planCode])
          : await planFindByCode(planCode);

      this.vindiPlanId = planId[0].planId;
      if (planId.length === 0) {
        throw new Error(
          'The requested plan is not registered in the payment system'
        );
      }
    } else {
      this.vindiPlanId = planId[0].planId;
    }
    return true;
  }
}

export default CreateSubscriptionService;

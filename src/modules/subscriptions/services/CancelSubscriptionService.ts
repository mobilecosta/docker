/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/ban-ts-ignore */
import {
  InternalService,
  ServiceResponse,
} from '../../../common/classes/Service';
import { StatusSubscription } from '../../../repositories/SubscriptionsRepository';
import { sendToQueue } from '../../../common/lib/sqs';
import Subscription from '../../../models/Subscription';
import { vindiAPI } from '../../../common/lib/external_apis';
import SubscriptionRepository from '../../../repositories/v2/SubscriptionRepository';
import CustomerRepository from '../../../repositories/v2/CustomerRepository';
import Joi from '@hapi/joi';

interface BillsInterface {
  id: number;
  status: string;
  due_at: string;
  subscription: {
    id: string;
    code: string;
  };
}

interface SubscriptionsInterface {
  id: number;
  status: string;
}

interface ICancelSubscription {
  customerId: string;
  reason: {
    main: string;
    sub: string;
    details: string;
  }
  type: string;
}

const schema = Joi.object({
  customerId: Joi.string().required(),
  reason: Joi.object({
    main: Joi.string().required(),
    sub: Joi.string().required(),
    details: Joi.string().required()
  }),
  type: Joi.string().optional().allow(null, '')
});

class CancelSubscriptionService extends InternalService {
  private data: {
    customerId: string;
    reason: Record<string, any>;
    type: string;
  };

  private id: string | undefined;

  private cancelSubscriptionData: ICancelSubscription;

  constructor(body: string) {
    super();

    if (!body) {
      throw new Error('Invalid Request');
    }

    this.cancelSubscriptionData = JSON.parse(body);
    this.data = JSON.parse(body);

    const { error } = schema.validate(this.cancelSubscriptionData);
    if (error) {
      console.log('Payload para cancelamento inválido', error);
      const resultError = error.details.map(err => err.message);
      throw new Error(resultError.toString());
    }
  }

  public async run(): Promise<ServiceResponse> {
    const validate = await this.validate();
    if (!validate) {
      throw new Error('Invalid Request');
    }

    await sendToQueue(
      JSON.stringify({
        id: this.id,
        customerId: this.data.customerId,
        reason: this.data.reason,
      }),
      `${process.env.CANCEL_SUBSCRIPTION_QUEUE}`
    );
    return {
      status: 'processing',
      description: `Canceling Subscription. Customer: ${this.data.customerId}`,
      action: 'CANCEL_SUBSCRIPTION',
    };
  }

  private async validate(): Promise<boolean> {
    const customer = await CustomerRepository.findById(this.data.customerId);
    const subscription = await SubscriptionRepository.find({
      value: this.data.customerId,
      field: 'customer_id',
    });
    if (subscription.length === 0) {
      throw new Error('Subscription is not valid or customer does not exist');
    }

    const activeSubscrition = subscription.map((item: Subscription) => {
      if (item.status !== StatusSubscription.CANCELED) {
        return item;
      }
    });

    if (activeSubscrition.length === 0) {
      throw new Error('no active subscriptions found for this customer');
    }

    if (this.data.type === 'NOPAYMENT') {
      const subs = await (await vindiAPI()).get(
        `/subscriptions?query=customer_id:${customer.vindiCode}`
      );

      const allSubscriptions: Array<SubscriptionsInterface> =
        subs.data.subscriptions;

      allSubscriptions.sort((a, b) => {
        if (a.id < b.id) {
          return 1;
        }
        if (a.id > b.id) {
          return -1;
        }
        return 0;
      });

      if (allSubscriptions[0].status === 'canceled') {
        await sendToQueue(
          JSON.stringify({
            event: {
              type: 'subscription_canceled',
              created_at: new Date(),
              data: {
                subscription: allSubscriptions[0],
              },
            },
            key: 'licenciador_subscription_canceled',
          }),
          `${process.env.EVENTS_LICENCIADOR_QUEUE}`
        );
        return false;
      }

      const response = await (await vindiAPI()).get(
        `/bills?query=customer_id:${customer.vindiCode}`
      );

      const allBills: Array<BillsInterface> = response.data.bills;
      allBills.sort((a, b) => {
        if (a.id < b.id) {
          return 1;
        }
        if (a.id > b.id) {
          return -1;
        }
        return 0;
      });

      if (allBills[0].status === 'paid') {
        await sendToQueue(
          JSON.stringify({
            event: {
              type: 'bill_paid',
              created_at: new Date(),
              data: {
                bill: allBills[0],
              },
            },
            key: 'licenciador_bill_paid',
          }),
          `${process.env.EVENTS_LICENCIADOR_QUEUE}`
        );
        return false;
      }

      if (allBills.length > 1 && allBills[1].status === 'pending') {
        this.id = allBills[0].subscription.id;
        return true;
      }

      this.id = allBills[0].subscription.id;
    }

    this.id = activeSubscrition[0]?.vindiId?.toString();
    return true;
  }
}

export default CancelSubscriptionService;

/* eslint-disable @typescript-eslint/camelcase */
import * as Joi from '@hapi/joi';
import { vindiAPI } from '../../../common/lib/external_apis';
import {
  subscriptionfindByCustomerId,
  update,
  addDiscount,
} from '../../../repositories/SubscriptionsRepository';
import { sendToQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';
import { customerfindById } from '../../../repositories/CustomersRepository';

const schemaPM = Joi.object({
  paymentMethod: Joi.string().valid('credit_card', 'bank_slip').required(),
});

const schemaPrice = Joi.object({
  price: Joi.number().optional(),
  offers: Joi.array()
    .items(
      Joi.object({
        code: Joi.string().required(),
        quantity: Joi.number().required(),
        resellerProtheusId: Joi.string().optional(),
      })
    )
    .required(),
  discount: Joi.object({
    amount: Joi.number().required(),
    cycles: Joi.number().required(),
  }).optional(),
});
export default class UpdateSubscriptionService {
  private paymentMethod: string;

  private data: any;

  private customerId: string;

  constructor(customerId: string, body: string) {
    const data = JSON.parse(body);
    this.customerId = customerId;
    if (data.paymentMethod) {
      this.paymentMethod = data.paymentMethod;
      const { error } = schemaPM.validate({
        paymentMethod: data.paymentMethod,
      });
      if (error) {
        console.log(error);
        const resultError = error.details.map(err => err.message);
        throw new Error(resultError.toString());
      }
    } else {
      this.data = data;
      const { error } = schemaPrice.validate(this.data);
      if (error) {
        console.log(error);
        const resultError = error.details.map(err => err.message);
        throw new Error(resultError.toString());
      }
    }
  }

  public async runPaymentMethod(): Promise<void> {
    await sendToQueue(
      JSON.stringify({
        ...{ customerId: this.customerId, paymentMethod: this.paymentMethod },
        key: Events.VINDI_UPDATE_PAYMENT_METHOD,
      }),
      `${process.env.EVENTS_VINDI_QUEUE}`
    );
    // const data = {
    //   payment_method_code: this.paymentMethod,
    // };
    // const subscription = await subscriptionfindByCustomerId(this.customerId);
    // const customer = await customerfindById(this.customerId);
    // try {
    //   if (
    //     subscription[0].paymentMethod === 'credit_card' &&
    //     this.paymentMethod === 'credit_card'
    //   ) {
    //     const profile = await (await vindiAPI()).get(
    //       `/payment_profiles?query=customer_id:${customer.vindiCode}`
    //     );
    //     await (await vindiAPI()).delete(
    //       `/payment_profiles/${profile.data.payment_profiles[0].id}`
    //     );
    //   }
    // } catch (error) {
    //   console.log(error);
    // }
    // if (process.env.ENV === 'prod' && this.paymentMethod === 'bank_slip') {
    //   data.payment_method_code = 'online_bank_slip';
    // }
    // try {
    //   const response = await (await vindiAPI()).put(
    //     `/subscriptions/${subscription[0].vindiId}`,
    //     data
    //   );
    //   if (response.status > 201) {
    //     throw new Error(response.data);
    //   }
    //   console.log({
    //     status: response.status,
    //     description: response.statusText,
    //     data: response.data.subscription,
    //   });
    //   await update(subscription[0].id, { paymentMethod: this.paymentMethod });
    //   await sendToQueue(
    //     JSON.stringify({
    //       paymentMethod: this.paymentMethod,
    //       key: Events.LICENCIADOR_UPDATE_PAYMENT_METHOD,
    //       id: subscription[0].id,
    //     }),
    //     `${process.env.EVENTS_LICENCIADOR_QUEUE}`
    //   );
    // } catch (error) {
    //   console.log(error);
    //   throw new Error(error.message);
    // }
  }

  // public async runPrice(): Promise<void> {
  //   const subscription = await subscriptionfindByCustomerId(this.customerId);
  //   try {
  //     const response = await (await vindiAPI()).get(
  //       `/subscriptions/${subscription[0].vindiId}`
  //     );
  //     if (response.status > 200) {
  //       throw new Error(response.data);
  //     }
  //     console.log({
  //       status: response.status,
  //       description: response.statusText,
  //       data: response.data.subscription,
  //     });
  //     if (this.data.price) {
  //       const data = {
  //         status: 'active',
  //         pricing_schema: {
  //           price: this.data.price,
  //           schema_type: 'flat',
  //         },
  //       };

  //       const responsePut = await (await vindiAPI()).put(
  //         `/product_items/${response.data.subscription.product_items[0].id}`,
  //         data
  //       );
  //       if (responsePut.status > 201) {
  //         throw new Error(responsePut.data);
  //       }
  //       console.log({
  //         status: responsePut.status,
  //         description: responsePut.statusText,
  //         data: responsePut.data,
  //       });
  //       await update(subscription[0].id, { price: this.data.price });
  //     }

  //     if (this.data.discount) {
  //       const dataDiscount = {
  //         product_item_id: response.data.subscription.product_items[0].id,
  //         discount_type: 'amount',
  //         amount: this.data.discount.amount,
  //         cycles: this.data.cycles || 1,
  //       };
  //       const discount = await (await vindiAPI()).post(
  //         '/discounts',
  //         dataDiscount
  //       );
  //       if (response.status > 201) {
  //         throw new Error(discount.data);
  //       }
  //       console.log({
  //         status: discount.status,
  //         description: discount.statusText,
  //         data: discount.data,
  //       });
  //       await addDiscount(subscription[0].id, {
  //         amount: dataDiscount.amount,
  //         cycles: dataDiscount.cycles,
  //       });
  //     }
  //     // await sendToQueue(
  //     //   JSON.stringify(this.data),
  //     //   `${process.env.UPDATE_SUBSCRIPTIONS_QUEUE}`
  //     // );
  //   } catch (error) {
  //     console.log(error);
  //     throw new Error(error.message);
  //   }
  // }
}

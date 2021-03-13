/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { InvocationResponse } from 'aws-sdk/clients/lambda';
import { WebhookRequestInterface } from '../interfaces/WebhookRequestInterface';
import InvokeLambda from '../../../common/lib/lambdaAdapter';
import { createVindiData } from '../../../repositories/VindiWebhookRepository';

class ReceiveVindiDataService {
  private request: WebhookRequestInterface;

  constructor(data: string | null) {
    if (!data) {
      throw new Error('Invalid Request');
    }
    this.request = JSON.parse(data);
  }

  public async run(): Promise<void> {
    try {
      await this.setWorkflowType(this.request.event.type);
    } catch (error) {
      throw new Error(error);
    }
  }

  private async setEventToTable(customerId: string): Promise<void> {
    await createVindiData({
      type: this.request.event.type,
      data: this.request.event.data,
      customerId,
    });
  }

  private setWorkflowType(type: string): Promise<any> {
    console.log(`Webhook Type: ${type}`);
    const workflows = {
      subscription_canceled: (): Promise<[void, InvocationResponse]> => {
        const subscriptionCanceledWorker = `${process.env.APPNAME}-${process.env.ENV}-subscriptionCanceledWorker`;
        return Promise.all([
          this.setEventToTable(
            this.request.event.data.subscription.customer.code
          ),
          InvokeLambda.invokeEvent(
            subscriptionCanceledWorker,
            JSON.stringify(this.request)
          ),
        ]);
      },
      subscription_created: (): Promise<[void, InvocationResponse]> => {
        const subscriptionCreatedWorker = `${process.env.APPNAME}-${process.env.ENV}-subscriptionCreatedWorker`;
        return Promise.all([
          this.setEventToTable(
            this.request.event.data.subscription.customer.code
          ),
          InvokeLambda.invokeEvent(
            subscriptionCreatedWorker,
            JSON.stringify(this.request)
          ),
        ]);
      },
      charge_created: (): Promise<[void, InvocationResponse]> => {
        const chargeCreatedWorker = `${process.env.APPNAME}-${process.env.ENV}-chargeCreatedWorker`;
        return Promise.all([
          this.setEventToTable(this.request.event.data.charge.customer.code),
          InvokeLambda.invokeEvent(
            chargeCreatedWorker,
            JSON.stringify(this.request)
          ),
        ]);
      },
      charge_rejected: (): Promise<[void, InvocationResponse]> => {
        const chargeRejectedWorker = `${process.env.APPNAME}-${process.env.ENV}-chargeRejectedWorker`;
        return Promise.all([
          this.setEventToTable(this.request.event.data.charge.customer.code),
          InvokeLambda.invokeEvent(
            chargeRejectedWorker,
            JSON.stringify(this.request)
          ),
        ]);
      },
      bill_created: (): Promise<[void, InvocationResponse]> => {
        const billCreatedWorker = `${process.env.APPNAME}-${process.env.ENV}-billCreatedWorker`;
        return Promise.all([
          this.setEventToTable(this.request.event.data.bill.customer.code),
          InvokeLambda.invokeEvent(
            billCreatedWorker,
            JSON.stringify(this.request)
          ),
        ]);
      },
      bill_paid: (): Promise<[void, InvocationResponse]> => {
        const billPaidWorker = `${process.env.APPNAME}-${process.env.ENV}-billPaidWorker`;
        return Promise.all([
          this.setEventToTable(this.request.event.data.bill.customer.code),
          InvokeLambda.invokeEvent(
            billPaidWorker,
            JSON.stringify(this.request)
          ),
        ]);
      },
      bill_canceled: (): Promise<[void, InvocationResponse]> => {
        const billCanceledWorker = `${process.env.APPNAME}-${process.env.ENV}-billCanceledWorker`;
        return Promise.all([
          this.setEventToTable(this.request.event.data.bill.customer.code),
          InvokeLambda.invokeEvent(
            billCanceledWorker,
            JSON.stringify(this.request)
          ),
        ]);
      },
      payment_profile_created: (): Promise<[void, InvocationResponse]> => {
        const paymentProfileWorker = `${process.env.APPNAME}-${process.env.ENV}-paymentProfileWorker`;
        return Promise.all([
          this.setEventToTable(
            this.request.event.data.payment_profile.customer.code
          ),
          InvokeLambda.invokeEvent(
            paymentProfileWorker,
            JSON.stringify(this.request)
          ),
        ]);
      },
      subscription_reactivated: (): Promise<any> => {
        const subscriptionReactivatedWorker = `${process.env.APPNAME}-${process.env.ENV}-subscriptionReactivatedWorker`;
        return Promise.all([
          this.setEventToTable(this.request.event.data.bill.customer.code),
          InvokeLambda.invokeEvent(
            subscriptionReactivatedWorker,
            JSON.stringify(this.request)
          ),
        ]);
      },
      default: (): Promise<void[]> => {
        return Promise.all([
          console.log(
            `Method: ${type} received, but without any defined processing.`
          ),
        ]);
      },
    };
    // @ts-ignore
    return (workflows[type] || workflows.default)();
  }
}

export default ReceiveVindiDataService;

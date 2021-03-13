import '../../../common/lib/bootstrap';
import { Handler } from 'aws-lambda';
import BillInterface from '../interfaces/bill.interface';
import BillRepository from '../../../repositories/BillRepository';
import SubscriptionRepository from '../../../repositories/v2/SubscriptionRepository';
import Bill from '../../../models/Bill';

const functionWithPromise = (item: Bill) => {
  // a function that returns a promise
  return Promise.resolve(BillRepository.remove(item.id));
};

const anAsyncFunction = async (item: Bill) => {
  return functionWithPromise(item);
};

const dispatch = {
  feedSelf: async (data: BillInterface): Promise<void> => {
    const bills = await BillRepository.find({
      value: data.event.data.bill.id,
      field: 'id_vindi',
    });

    const subscription = await SubscriptionRepository.find({
      value: data.event.data.bill.customer.code,
      field: 'customer_id',
    });

    if (bills.length > 0) {
      const controlData = async () => {
        return Promise.all(bills.map(item => anAsyncFunction(item)));
      };
      controlData().then(item => {
        console.log(item);
      });
    }
    await BillRepository.create({
      idVindi: data.event.data.bill.id,
      amount: data.event.data.bill.amount,
      installments: data.event.data.bill.installments,
      status: data.event.data.bill.status,
      dueAt: data.event.data.bill.due_at
        ? new Date(data.event.data.bill.due_at.slice(0, -6))
        : new Date(),
      url: data.event.data.bill.url,
      subscriptionId: subscription[0].id,
    });
  },
  feedQueues: async (data: BillInterface): Promise<void> => {
    await Promise.all([]);
  },
};

export const handler: Handler = async (event: any) => {
  const data: BillInterface = JSON.parse(event);
  await Promise.all([dispatch.feedSelf(data)]);
};

/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/camelcase */
import '../../../common/lib/bootstrap';
import { Handler } from 'aws-lambda';
import BillInterface from '../interfaces/bill.interface';
import { sendToQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';
import BillRepository from '../../../repositories/BillRepository';
import SubscriptionRepository from '../../../repositories/v2/SubscriptionRepository';
import PendingPurchaseRepository from '../../../repositories/PendingPurchaseRepository';
import BankSlipRepository from '../../../repositories/BankSlipRepository';
import PeriodRepository from '../../../repositories/PeriodRepository';
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

    const boletoByEnvironment =
      process.env.ENV === 'prod' ? 'online_bank_slip' : 'bank_slip';

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

    if (!data.event.data.bill.code) {
      await PeriodRepository.create({
        idVindi: data.event.data.bill.period.id,
        startAt: new Date(data.event.data.bill.period.start_at.slice(0, -6)),
        endAt: new Date(data.event.data.bill.period.end_at.slice(0, -6)),
        cycle: data.event.data.bill.period.cycle,
        subscriptionId: data.event.data.bill.subscription.code,
      });
    }

    if (parseInt(data.event.data.bill.amount, 10) != 0) {
      const { charges } = data.event.data.bill;
      charges.sort((a, b) => {
        if (a.id < b.id) {
          return 1;
        }
        if (a.id > b.id) {
          return -1;
        }
        return 0;
      });

      if (charges[0].payment_method.code === boletoByEnvironment) {
        await BankSlipRepository.create({
          customerId: data.event.data.bill.customer.code,
          vindiBill: data.event.data.bill.id.toString(),
          barcode: charges[0].last_transaction.gateway_response_fields.barcode,
          typeableBarcode:
            charges[0].last_transaction.gateway_response_fields
              .typeable_barcode,
          slipTransactionId:
            charges[0].last_transaction.gateway_response_fields
              .slip_transaction_id,
          url: data.event.data.bill.charges[0].print_url || 'empty',
        });
      }
    }
  },
  feedQueues: async (data: BillInterface): Promise<void> => {
    const subscription = await SubscriptionRepository.find({
      value: data.event.data.bill.customer.code,
      field: 'customer_id',
    });

    const request = {
      event: {
        ...data.event,
        order: subscription[0].salesOrder,
      },
    };

    if (data.event.data.bill.code) {
      const purchase = await PendingPurchaseRepository.findById(
        data.event.data.bill.code
      );
      request.event.order = purchase.salesOrder;
    }

    if (parseInt(data.event.data.bill.amount, 10) != 0) {
      await sendToQueue(
        JSON.stringify({ ...request, key: Events.SMS_BILL_CREATED }),
        `${process.env.EVENTS_MESSAGE_QUEUE}`
      );
    }

    await Promise.all([
      await sendToQueue(
        JSON.stringify({ ...request, key: Events.STORE_BILL_CREATED }),
        `${process.env.EVENTS_STORE_QUEUE}`
      ),
    ]);
  },
};

export const handler: Handler = (event: any) => {
  const data: BillInterface = JSON.parse(event);
  Promise.all([dispatch.feedSelf(data), dispatch.feedQueues(data)]);
};

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
import { uuid } from '../../../common/lib/uuid';
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
    const subscription = await SubscriptionRepository.find({
      value: data.event.data.bill.customer.code,
      field: 'customer_id',
    });

    const boletoByEnvironment =
      process.env.ENV === 'prod' ? 'online_bank_slip' : 'bank_slip';

    let boletoInfo;
    const { charges } = data.event.data.bill;
    if (parseInt(data.event.data.bill.amount, 10) != 0) {
      charges.sort((a, b) => {
        if (a.id < b.id) {
          return 1;
        }
        if (a.id > b.id) {
          return -1;
        }
        return 0;
      });
      if (charges[0].payment_method) {
        if (charges[0].payment_method.code === boletoByEnvironment) {
          boletoInfo = await BankSlipRepository.findOne({
            value: `${data.event.data.bill.id}`,
            field: 'vindi_bill',
          });
          if (boletoInfo) {
            BankSlipRepository.remove(boletoInfo.id);
          }
        }
      }
    }

    const request = {
      event: {
        ...data.event,
        order: subscription[0].salesOrder,
      },
    };

    if (data.event.data.bill.code) {
      const requestRecompra = {
        purchase: data.event.data.bill.code,
        subscription: subscription[0].id,
        customer: data.event.data.bill.customer.code,
      };

      const purchase = await PendingPurchaseRepository.findById(
        data.event.data.bill.code
      );
      request.event.order = purchase.salesOrder;

      await Promise.all([
        await sendToQueue(
          JSON.stringify({
            ...requestRecompra,
            key: Events.VINDI_UPDATE_PRICE,
          }),
          `${process.env.EVENTS_VINDI_QUEUE}`
        ),
      ]);
    } else {
      await Promise.all([
        await sendToQueue(
          JSON.stringify({ ...request, key: Events.LICENCIADOR_BILL_PAID }),
          `${process.env.EVENTS_LICENCIADOR_QUEUE}`
        ),
        300,
      ]);
    }
    if (parseInt(data.event.data.bill.amount, 10) != 0) {
      await sendToQueue(
        JSON.stringify({
          ...request,
          key: Events.PROTHEUS_BILL_PAID,
          barcode: boletoInfo?.barcode,
          typable_barcode: boletoInfo?.typeableBarcode,
        }),
        `${process.env.EVENTS_PROTHEUS_QUEUE}`
      );
    }
    const transaction = `BPW-${uuid()}`;
    await Promise.all([
      await sendToQueue(
        JSON.stringify({ ...request, key: Events.STORE_BILL_PAID }),
        `${process.env.EVENTS_STORE_QUEUE}`
      ),
      await sendToQueue(
        JSON.stringify({
          ...request,
          key: Events.EMPODERA_ADD_CONTRACT,
          transaction,
        }),
        `${process.env.EVENTS_EMPODERA_QUEUE}`
      ),
      await sendToQueue(
        JSON.stringify({ ...request, key: Events.SMS_BILL_PAID }),
        `${process.env.EVENTS_MESSAGE_QUEUE}`
      ),
    ]);
    // Confirmacao se os eventos foram executados com sucesso
    // await sendToQueue(
    //   JSON.stringify({
    //     ...request,
    //     key: 'bill_paid',
    //     transaction,
    //   }),
    //   `${process.env.VERIFY_EVENTS_QUEUE}`,
    //   300
    // );
  },
};

export const handler: Handler = async (event: any) => {
  const data: BillInterface = JSON.parse(event);
  await Promise.all([dispatch.feedSelf(data), dispatch.feedQueues(data)]);
};

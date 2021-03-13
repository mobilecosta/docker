/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { parseISO, getDate, getMonth, getYear } from 'date-fns';
import EventsRepository from '../../../repositories/EventsRepository';
import errorInterfaceRepository from '../../../repositories/ErrorInterfaceRepository';
import errorArchiveRepository from '../../../repositories/ErrorArchiveRepository';
import { Events } from '../../internal-processes/interfaces/common-enums';
import {
  customerfindById,
  getMobilePhonesByCustomer,
} from '../../../repositories/CustomersRepository';
import { sendSMS } from '../../../common/lib/zenvia';
import { messages } from '../../../common/lib/messages';

export default class MessageService {
  private data: Record<string, any>;

  private boletoByEnvironment: string;

  constructor(record: string) {
    this.data = JSON.parse(record);
    this.boletoByEnvironment =
      process.env.ENV === 'prod' ? 'online_bank_slip' : 'bank_slip';
  }

  public async smsBillCreated(): Promise<void> {
    const errData = await errorInterfaceRepository.findOne({
      value: this.data.event.data.bill.customer.code,
      field: 'related_id',
    });
    const customerId = this.data.event.data.bill.customer.code;
    const { amount } = this.data.event.data.bill;
    const customer = await customerfindById(customerId);
    const phone = await getMobilePhonesByCustomer(customerId);
    const dueAt = parseISO(this.data.event.data.bill.charges[0].due_at);
    const date = getDate(dueAt) - 1;
    const month = getMonth(dueAt) + 1;
    const year = getYear(dueAt);
    const paymentMethod = this.data.event.data.bill.charges[0].payment_method
      .code;
    const details =
      paymentMethod === this.boletoByEnvironment
        ? this.data.event.data.bill.charges[0].print_url
        : this.data.event.data.bill.url;
    let name;
    if (!customer.isLegalEntity) {
      name = customer.name
        .split(' ')
        .slice(0, -(customer.name.split(' ').length - 1))
        .join(' ');
    } else {
      name = customer.name;
    }

    try {
      if (
        paymentMethod === this.boletoByEnvironment &&
        phone.number !== undefined
      ) {
        await sendSMS(
          `${phone.number}`,
          messages.sms.billCreated(
            name,
            {
              dia: date.toString(),
              mes: month.toString(),
              ano: year.toString(),
            },
            amount,
            paymentMethod,
            // @ts-ignore
            details
          )
        );
      }
      if (errData && errData.event === Events.SMS_BILL_CREATED) {
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
        action: 'sms-bill-created',
        status: 'sended',
        description: `SMS Sended with succes to: ${phone.number}`,
        customer: this.data.event.data.bill.customer.code,
      });

      await EventsRepository.create({
        codeEvent: Events.SMS_BILL_CREATED,
        relatedId: this.data.event.data.bill.customer.code,
        payload: { success: 'ok' },
        status: 'success',
      });
    } catch (error) {
      console.error(error);
      if (!errData || errData.event !== Events.SMS_BILL_CREATED) {
        await errorInterfaceRepository.create({
          relatedId: this.data.event.data.bill.customer.code,
          level: 'LOW',
          system: 'ZENVIA',
          action: 'retry',
          message: error.message,
          event: Events.SMS_BILL_CREATED,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.SMS_BILL_CREATED) {
        await errorInterfaceRepository.update(errData.id, {
          action: 'retry',
          httpCode: 'error',
        });
      }
      throw new Error(Events.SMS_BILL_CREATED);
    }
  }

  public async smsBillPaid(): Promise<void> {
    const errData = await errorInterfaceRepository.findOne({
      value: this.data.event.data.bill.customer.code,
      field: 'related_id',
    });
    const customerId = this.data.event.data.bill.customer.code;
    const customer = await customerfindById(customerId);
    const phone = await getMobilePhonesByCustomer(customerId);
    const dueAt = parseISO(this.data.event.data.bill.charges[0].due_at);
    const date = getDate(dueAt);
    const month = getMonth(dueAt) + 1;
    const year = getYear(dueAt);
    let name;
    if (!customer.isLegalEntity) {
      name = customer.name
        .split(' ')
        .slice(0, -(customer.name.split(' ').length - 1))
        .join(' ');
    } else {
      name = customer.name;
    }
    try {
      await sendSMS(
        `${phone.number}`,
        messages.sms.billPaid(name, {
          dia: date.toString(),
          mes: month.toString(),
          ano: year.toString(),
        })
      );
      if (errData && errData.event === Events.SMS_BILL_PAID) {
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
        action: 'sms-bill-paid',
        status: 'sended',
        description: `SMS Sended with succes to: ${phone.number}`,
        customer: this.data.event.data.bill.customer.code,
      });

      await EventsRepository.create({
        codeEvent: Events.SMS_BILL_PAID,
        relatedId: this.data.event.data.bill.customer.code,
        payload: { success: 'ok' },
        status: 'success',
      });
    } catch (error) {
      console.error(error);
      if (!errData || errData.event !== Events.SMS_BILL_PAID) {
        await errorInterfaceRepository.create({
          relatedId: this.data.event.data.bill.customer.code,
          level: 'LOW',
          system: 'ZENVIA',
          action: 'retry',
          message: error.message,
          event: Events.SMS_BILL_CREATED,
          httpCode: error.response.status || 999,
          queueMessage: JSON.stringify(this.data),
        });
      } else if (errData.event === Events.SMS_BILL_PAID) {
        await errorInterfaceRepository.update(errData.id, {
          action: 'retry',
          httpCode: 'error',
        });
      }
      throw new Error(Events.SMS_BILL_PAID);
    }
  }
}

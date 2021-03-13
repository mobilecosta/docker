/* eslint-disable @typescript-eslint/camelcase */
import { APIGatewayProxyEvent } from 'aws-lambda';
// import { query } from 'gql-query-builder';
// import InvokeLambda from '../../../common/lib/lambdaAdapter';
import { vindiAPI } from '../../../common/lib/external_apis';
import { customerfindByRegistryCode } from '../../../repositories/CustomersRepository';
import billRepository from '../../../repositories/BillRepository';
import periodRepository from '../../../repositories/PeriodRepository';
import SubscriptionRepository from '../../../repositories/v2/SubscriptionRepository';
import Bill from '../../../models/Bill';
import CustomerRepository from '../../../repositories/v2/CustomerRepository';

const functionWithPromise = (item: Bill) => {
  // a function that returns a promise
  return Promise.resolve(billRepository.remove(item.id));
};

const anAsyncFunction = async (item: Bill) => {
  return functionWithPromise(item);
};
interface Result {
  body: string;
  statusCode: number;
}

export const getVindiData = async (document: string): Promise<void> => {
  const customer = await customerfindByRegistryCode(document);
  const subscription = await SubscriptionRepository.find({
    value: customer[0].id,
    field: 'customer_id',
  });
  const vindiId = customer[0].vindiCode;
  const response = await (await vindiAPI()).get(
    `/bills?query=customer_id:${vindiId}&sort_by=created_at&sort_order=desc`
  );
  const info = response.data;
  for await (const bill of info.bills) {
    const bills = await billRepository.find({
      value: bill.id,
      field: 'id_vindi',
    });
    if (bills.length > 0) {
      const controlData = async () => {
        return Promise.all(bills.map(item => anAsyncFunction(item)));
      };
      controlData().then(item => {
        console.log(item);
      });
    }
    try {
      await billRepository.create({
        idVindi: bill.id,
        amount: bill.amount,
        installments: bill.installments,
        status: bill.status,
        dueAt: new Date(bill.due_at) || new Date(),
        url: bill.url,
        subscriptionId: subscription[0].id,
      });
      await periodRepository.create({
        idVindi: bill.period.id,
        startAt: new Date(bill.period.start_at),
        endAt: new Date(bill.period.end_at),
        cycle: bill.period.cycle,
        subscriptionId: subscription[0].id,
      });
    } catch (error) {
      console.log(error);
    }
  }
};

export const getSubscriptionByDoc = async (
  document: string,
  event: APIGatewayProxyEvent,
  awsRequestId: string
): Promise<Result> => {
  // await getVindiData(document);
  // const functionName = `${process.env.APPNAME}-${process.env.ENV}-graphql`;
  // const getSubscription = event;
  const result: Result = {
    body: '',
    statusCode: 200,
  };
  const customer = await CustomerRepository.findOne({
    value: document,
    field: 'registry_code',
  });
  if (!customer) {
    result.body = JSON.stringify({
      subscription: 'customer not found',
      transaction: awsRequestId,
    });
    return result;
  }

  const subscription = await SubscriptionRepository.findOne({
    value: customer.id,
    field: 'customer_id',
  });
  if (!subscription) {
    result.body = JSON.stringify({
      subscription: 'not found',
      transaction: awsRequestId,
    });
    return result;
  }

  // getSubscription.body = JSON.stringify(
  //   query({
  //     operation: 'subscriptionByDocument',
  //     variables: { document: { value: document, required: true } },
  //     fields: [
  //       'id',
  //       'vindi_id',
  //       {
  //         customer: ['id', 'name', 'email', 'registry_code'],
  //       },
  //       'sales_order',
  //       'plan_code',
  //       'payment_method_code',
  //       'price',
  //       'status',
  //       'vindi_sent_at',
  //       'licenciador_sent_at',
  //       'code_licenciador',
  //       { last_transaction: ['status', 'installments', 'due_at', 'url'] },
  //       { last_period: ['start_at', 'end_at', 'cycle'] },
  //       'created_at',
  //       'updated_at',
  //     ],
  //   })
  // );
  // const result: Result = {
  //   body: '',
  //   statusCode: 200,
  // };
  // const documentResponse = await InvokeLambda.invoke(
  //   functionName,
  //   getSubscription
  // );
  // const payload = JSON.parse(documentResponse.Payload as string);
  // const body = JSON.parse(payload.body);
  // if (payload.statusCode > 200) {
  //   result.body = JSON.stringify({
  //     status: 'error',
  //     error: body.errors[0].message,
  //     transaction: awsRequestId,
  //   });
  // } else if (!body.data.subscriptionByDocument) {
  //   result.statusCode = 200;
  //   result.body = JSON.stringify({
  //     subscription: 'not found',
  //     transaction: awsRequestId,
  //   });
  // } else {
  const bill = await billRepository.findOne({
    value: subscription.id,
    field: 'subscription_id',
  });

  if (!bill) {
    await getVindiData(document);
  }
  const period = await periodRepository.findOne({
    value: subscription.id,
    field: 'subscription_id',
  });
  result.body = JSON.stringify({
    subscription: {
      id: subscription.id,
      vindiId: subscription.vindiId,
      codeLicenciador: subscription.codeLicenciador,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        registryCode: customer.registryCode,
      },
      lastTransaction: {
        status: bill.status,
        dueAt: bill.dueAt,
        billUrl: bill.url,
        installments: bill.installments,
      },
      lastPeriod: {
        startAt: period.startAt,
        endAt: period.endAt,
        cycle: period.cycle,
      },
      salesOrder: subscription.salesOrder,
      planCode: subscription.planCode,
      paymentMethod: subscription.paymentMethod,
      price: subscription.price,
      status: subscription.status,
      installments: subscription.installments,
      vindiSentAt: subscription.vindiSentAt,
      licenciadorSentAt: subscription.licenciadorSentAt,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    },
    transaction: awsRequestId,
  });
  // }
  return result;
};

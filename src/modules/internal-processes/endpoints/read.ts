/* eslint-disable @typescript-eslint/ban-ts-ignore */
import '../../../common/lib/bootstrap';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { sendToQueue } from '../../../common/lib/sqs';
import { vindiAPI } from '../../../common/lib/external_apis';
import billRepository from '../../../repositories/BillRepository';
import periodRepository from '../../../repositories/PeriodRepository';

const functionWithPromise = (item: any) => {
  // a function that returns a promise
  return Promise.resolve('ok');
};

const anAsyncFunction = async (item: any) => {
  return functionWithPromise(item);
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  let response: APIGatewayProxyResult = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '',
  };
  try {
    // if (!event.pathParameters) {
    //   throw new Error('cep parameter is required for this request');
    // }
    // // @ts-ignore
    // const params: { cep: string } = event.pathParameters;

    // const { cep } = params;

    const data = await (await vindiAPI()).get(
      '/bills?sort_by=created_at&sort_order=asc'
    );
    const info = data.data;
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
          subscriptionId: bill.subscription.code,
        });
        await periodRepository.create({
          idVindi: bill.period.id,
          startAt: new Date(bill.period.start_at),
          endAt: new Date(bill.period.end_at),
          cycle: bill.period.cycle,
          subscriptionId: bill.subscription.code,
        });
      } catch (error) {
        console.log(error);
      }
    }
    // info.bills.forEach(async (bill: any) => {
    //   try {
    //     await billRepository.create({
    //       idVindi: bill.id,
    //       amount: bill.amount,
    //       installments: bill.installments,
    //       status: bill.status,
    //       dueAt: new Date(bill.due_at) || new Date(),
    //       url: bill.url,
    //       subscriptionId: bill.subscription.code,
    //     });
    //     await periodRepository.create({
    //       idVindi: bill.period.id,
    //       startAt: new Date(bill.period.start_at),
    //       endAt: new Date(bill.period.end_at),
    //       cycle: bill.period.cycle,
    //       subscriptionId: bill.subscription.code,
    //     });
    //   } catch (error) {
    //     console.log(error);
    //   }
    // });
    response.body = 'success';
  } catch (error) {
    console.error(error);
    response = {
      statusCode: 400,
      body: JSON.stringify({
        error: error.message,
        transaction: context.awsRequestId,
      }),
    };
  }
  await sendToQueue(
    JSON.stringify({
      method: event.httpMethod,
      url: event.path,
      origin: event.headers['User-Agent'],
      identity: event.requestContext.identity,
      payload: JSON.parse(event.body!) || { body: 'no body' },
      response: {
        body: JSON.parse(response.body),
        statusCode: response.statusCode,
      },
    }),
    `${process.env.PAYLOAD_QUEUE}`
  );
  return response;
};

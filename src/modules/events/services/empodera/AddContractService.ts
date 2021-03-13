/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { format } from 'date-fns';
import { empoderaAPI } from '../../../../common/lib/external_apis';
import { sendToQueue } from '../../../../common/lib/sqs';
import { uuid } from '../../../../common/lib/uuid';
import EventsRepository from '../../../../repositories/EventsRepository';
import CustomerRepository from '../../../../repositories/v2/CustomerRepository';
import SubscriptionService from '../../../../services/SubscriptionService';
import { Events } from '../../../internal-processes/interfaces/common-enums';
import EmpoderaErrorsService from './EmpoderaErrorsService';

interface IBillInterfaceDTO {
  event: {
    created_at: string;
    data: {
      bill: {
        id: number;
        code?: string;
        amount: string;
        due_at: string;
        customer: {
          code: string;
        };
        period: {
          end_at: string;
        };
        subscription?: {
          code?: string
        };
      };
    };
  };
  transaction: string;
}

interface IEmpoderaContract {
  COD_CLIENTE: string;
  CONTRATO: string;
  ITEM: string;
  PLAN_FINAN: string;
  NOME_CLIENTE: string;
  CPF_CNPJ: string;
  STATUS_CONTRATO: string;
  QUANTIDADE: number;
  RECORRENTE: string;
  PERIODICIDADE: string;
  COD_AGRUPAMENTO: string;
  AGRUPAMENTO: string;
  DATA_ASSINATURA: string;
  COD_GRUPO: string;
  DESC_GRUPO: string;
  VENCIMENTO: string;
  MODALIDADE: string;
  MUNICIPIO: string;
  UF: string;
  PROPOSTA: string;
  COD_SEGMENTO: string;
  SEGMENTO: string;
  VALOR_TOTAL_CONTRATO: number;
  VALOR_UNITARIO: number;
  VALOR_TOTAL_BRUTO: number;
  SETOR_PUBLICO: string;
}

class AddContractService {
  private bill: IBillInterfaceDTO;

  public async execute(message: string): Promise<void> {
    this.bill = JSON.parse(message);

    const event = Events.EMPODERA_ADD_CONTRACT;
    const customer = await CustomerRepository.findById(
      this.bill.event.data.bill.customer.code
    );

    const subscription = await SubscriptionService.GetSubscriptionByBillPaidEvent(JSON.parse(message));
    if (!subscription) {
      await EmpoderaErrorsService.businessError('Nenhuma subscrição encontrada para esse cliente/fatura', customer.id, message, event);
      return;
    }

    let toInsert = false;

    await empoderaAPI().get(`/contracts/${customer.registryCode}/${subscription.salesOrder}/001/${subscription.planCode}`)
      .catch(async error => {
        console.log(`Não foi encontrato nenhum contrato no empodera para o cliente ${customer.id} com a chave 
                  ${customer.registryCode}/${subscription.salesOrder}/001/${subscription.planCode}`);
        toInsert = true;
      });

    const transaction = `EMP-${uuid()}`;

    if (!toInsert) {
      await sendToQueue(
        JSON.stringify({
          ...{ event: this.bill.event },
          key: Events.EMPODERA_ADD_BILL,
          transaction
        }),
        `${process.env.EVENTS_EMPODERA_QUEUE}`,
        30
      );

      await sendToQueue(
        JSON.stringify({
          ...{ event: this.bill.event },
          key: Events.EMPODERA_ADD_CUSTOM,
          transaction
        }),
        `${process.env.EVENTS_EMPODERA_QUEUE}`
      );
      
      return;
    }

    let periodicidade = '00 - Mensal';
    switch (subscription.planCode) {
      case 'TOTVSMENSAL':
        periodicidade = '00 - Mensal';
        break;
      case 'TOTVSBIMESTRAL':
        periodicidade = '01 - Bimestral';
        break;
      case 'TOTVSTRIMESTRAL':
        periodicidade = '02 - Trimestral';
        break;
      case 'TOTVSQUADRIMESTRAL':
        periodicidade = '03 - Quadrimestral';
        break;
      case 'TOTVSSEMESTRAL':
        periodicidade = '05 - Semestral';
        break;
      case 'TOTVSANUAL':
        periodicidade = '11 - Anual';
        break;
      default:
        break;
    }

    const data: IEmpoderaContract = {
      COD_CLIENTE: customer.registryCode,
      CONTRATO: subscription.salesOrder!,
      ITEM: '001',
      PLAN_FINAN: subscription.planCode,
      NOME_CLIENTE: customer.name,
      CPF_CNPJ: customer.registryCode,
      STATUS_CONTRATO: 'ATIVO',
      QUANTIDADE: 1,
      RECORRENTE: 'SIM',
      PERIODICIDADE: periodicidade,
      COD_AGRUPAMENTO: '001',
      AGRUPAMENTO: 'SAAS MPN',
      DATA_ASSINATURA: format(subscription.createdAt, 'yyyyMMdd'),
      COD_GRUPO: '001',
      DESC_GRUPO: 'ELEVE',
      VENCIMENTO: format(
        new Date(this.bill.event.data.bill.period.end_at),
        'yyyyMMdd'
      ),
      MODALIDADE: 'ASSINATURA',
      MUNICIPIO: customer.address.city,
      UF: customer.address.state,
      PROPOSTA: subscription.salesOrder!,
      COD_SEGMENTO: '001',
      SEGMENTO: 'SOFTWARE',
      VALOR_TOTAL_CONTRATO: parseFloat(subscription.price),
      VALOR_UNITARIO: parseFloat(subscription.price),
      VALOR_TOTAL_BRUTO: parseFloat(subscription.price),
      SETOR_PUBLICO: 'NAO',
    };

    await empoderaAPI().post(`/contracts`, data)
    .then(async response => {
      console.log({
        action: `sent-contract-empodera`,
        status: response.status,
        description: response.statusText,
        customer: customer.id,
        response: response.data,
      });

      await EmpoderaErrorsService.checkReprocessing(customer.id, event);

      await Promise.all([
        await sendToQueue(
          JSON.stringify({
            ...{ event: this.bill.event },
            key: Events.EMPODERA_ADD_CUSTOMER,
            transaction,
          }),
          `${process.env.EVENTS_EMPODERA_QUEUE}`,
          30
        ),

        await sendToQueue(
          JSON.stringify({
            ...{ event: this.bill.event },
            key: Events.EMPODERA_ADD_BILL,
            transaction,
          }),
          `${process.env.EVENTS_EMPODERA_QUEUE}`,
          60
        ),

        await sendToQueue(
          JSON.stringify({
            ...{ event: this.bill.event },
            key: Events.EMPODERA_ADD_CONTACT,
            transaction,
          }),
          `${process.env.EVENTS_EMPODERA_QUEUE}`,
          90
        )
      ]);

      await EventsRepository.create({
        codeEvent: event,
        relatedId: customer.id,
        payload: data,
        status: 'success',
        transaction: this.bill.transaction,
      });
    })
    .catch(async error => {
      console.error(`Ocorreu um erro ao enviar o contrato do cliente ${customer.id} para o empodera. 
                    Chave ${customer.registryCode}/${subscription.salesOrder}/001/${subscription.planCode}`, error);
      await EmpoderaErrorsService.catchError(error, customer.id, data, message, event);
    });
  }
}

export default new AddContractService();

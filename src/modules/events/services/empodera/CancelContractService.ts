/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { AxiosResponse } from 'axios';
import { format } from 'date-fns';
import { empoderaAPI } from '../../../../common/lib/external_apis';
import { sendToQueue } from '../../../../common/lib/sqs';
import { uuid } from '../../../../common/lib/uuid';
import EventsRepository from '../../../../repositories/EventsRepository';
import CustomerRepository from '../../../../repositories/v2/CustomerRepository';
import SubscriptionRepository from '../../../../repositories/v2/SubscriptionRepository';
import { Events } from '../../../internal-processes/interfaces/common-enums';
import EmpoderaErrorsService from './EmpoderaErrorsService';

interface ISubscriptionInterfaceDTO {
  event: {
    created_at: string;
    data: {
      subscription: {
        id: number;
        code: string;
        customer: {
          code: string;
        };
        current_period: {
          end_at: string;
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
  STATUS_CANCELAMENTO: string;
  DATA_CANCELAMENTO: string;
}

class CancelContractService {
  private subscription: ISubscriptionInterfaceDTO;

  public async execute(message: string): Promise<void> {
    this.subscription = JSON.parse(message);
    const customer = await CustomerRepository.findById(
      this.subscription.event.data.subscription.customer.code
    );
    const subscriptions = await SubscriptionRepository.findById(
      this.subscription.event.data.subscription.code
    );
    const event = Events.EMPODERA_CANCEL_CONTRACT;
    const transaction = `EMP-${uuid()}`;

    let toInsert = false;

    await empoderaAPI().get(`/contracts/${customer.registryCode}/${subscriptions.salesOrder}/001/${subscriptions.planCode}`)
      .catch(async error => {
        toInsert = true;
        console.log(`Contrato não localizado para o cliente ${customer.id} no Empodera com a chave: ${customer.registryCode}/${subscriptions.salesOrder}/001/${subscriptions.planCode}`, error);
      });

    let periodicidade = '00 - Mensal';
    switch (subscriptions.planCode) {
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
      CONTRATO: subscriptions.salesOrder!,
      ITEM: '001',
      PLAN_FINAN: subscriptions.planCode,
      NOME_CLIENTE: customer.name,
      CPF_CNPJ: customer.registryCode,
      STATUS_CONTRATO: 'CANCELADO',
      QUANTIDADE: 1,
      RECORRENTE: 'SIM',
      PERIODICIDADE: periodicidade,
      COD_AGRUPAMENTO: '001',
      AGRUPAMENTO: 'SAAS MPN',
      DATA_ASSINATURA: format(subscriptions.createdAt, 'yyyyMMdd'),
      COD_GRUPO: '001',
      DESC_GRUPO: 'ELEVE',
      VENCIMENTO: format(
        new Date(
          this.subscription.event.data.subscription.current_period.end_at
        ),
        'yyyyMMdd'
      ),
      MODALIDADE: 'ASSINATURA',
      MUNICIPIO: customer.address.city,
      UF: customer.address.state,
      PROPOSTA: subscriptions.salesOrder!,
      COD_SEGMENTO: '001',
      SEGMENTO: 'SOFTWARE',
      VALOR_TOTAL_CONTRATO: parseFloat(subscriptions.price),
      VALOR_UNITARIO: parseFloat(subscriptions.price),
      VALOR_TOTAL_BRUTO: parseFloat(subscriptions.price),
      SETOR_PUBLICO: 'NAO',
      STATUS_CANCELAMENTO: 'CANCELADO',
      DATA_CANCELAMENTO: format(
        new Date(this.subscription.event.created_at),
        'yyyyMMdd'
      ),
    };

    await this.CallEmpodera(data, toInsert)
      .then(async response => {
        console.log({
          action: `cancel-contract-empodera`,
          status: response.status,
          description: response.statusText,
          response: response.data,
        });

        if (toInsert) {
          await sendToQueue(
            JSON.stringify({
              ...{
                event: {
                  created_at: this.subscription.event.created_at,
                  data: {
                    bill: {
                      customer: this.subscription.event.data.subscription
                        .customer,
                    },
                  },
                },
              },
              key: Events.EMPODERA_ADD_CUSTOMER,
              transaction,
            }),
            `${process.env.EVENTS_EMPODERA_QUEUE}`,
            30
          );
        }

        await sendToQueue(
          JSON.stringify({
            ...{ event: this.subscription.event },
            key: Events.EMPODERA_CANCELED_CUSTOM,
            transaction,
          }),
          `${process.env.EVENTS_EMPODERA_QUEUE}`,
          60
        );

        await EmpoderaErrorsService.checkReprocessing(customer.id, event);

        await EventsRepository.create({
          codeEvent: event,
          relatedId: customer.id,
          payload: data,
          status: 'success',
          transaction: this.subscription.transaction,
        });
      })
      .catch(async error => {
        console.error(`Ocorreu um erro ao ${toInsert ? 'criar' : 'atualizar'} a solicitação de cancelamento do contrato do cliente ${customer.id} no Empodera`, error);
        await EmpoderaErrorsService.catchError(error, customer.id, data, this.subscription, event);
      });
  }

  private CallEmpodera(data: IEmpoderaContract, isPost: boolean): Promise<AxiosResponse<any>> {
    return isPost ? empoderaAPI().post(`/contracts`, data) : empoderaAPI().put(`/contracts`, data);
  }
}

export default new CancelContractService();

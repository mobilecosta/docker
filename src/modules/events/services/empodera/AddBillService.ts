/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { AxiosResponse } from 'axios';
import { format } from 'date-fns';
import { empoderaAPI } from '../../../../common/lib/external_apis';
import EventsRepository from '../../../../repositories/EventsRepository';
import CustomerRepository from '../../../../repositories/v2/CustomerRepository';
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
        subscription?: {
          code?: string
        };
      };
    };
  };
  transaction: string;
}

interface IEmpoderaBill {
  EMPRESA: string;
  FILIAL: string;
  PREFIXO: string;
  NUMERO: string;
  CLIENTE: string;
  LOJA: string;
  VALOR: string;
  SALDO: string;
  BAIXA: string;
  EMISSAO: string;
  VENCIMENTO: string;
  VENCIMENTO_REAL: string;
}

class AddBillService {
  private bill: IBillInterfaceDTO;

  public async execute(message: string): Promise<void> {
    this.bill = JSON.parse(message);
    const customer = await CustomerRepository.findById(
      this.bill.event.data.bill.customer.code
    );
    const event = Events.EMPODERA_ADD_BILL;

    let toInsert = false;

    await empoderaAPI().get(`/bill/00/01/UNE/${this.bill.event.data.bill.id}/${customer.registryCode}/00`)
    .catch(async error => {
      console.log(`Fatura de número ${this.bill.event.data.bill.id} não encontrada no empodera para o cliente ${customer.id}`, error);
      toInsert = true;
    });

    const data: IEmpoderaBill = {
      EMPRESA: '00',
      FILIAL: '01',
      PREFIXO: 'UNE',
      NUMERO: this.bill.event.data.bill.id.toString(),
      CLIENTE: customer.registryCode,
      LOJA: '00',
      VALOR: parseFloat(this.bill.event.data.bill.amount).toString(),
      SALDO: '0',
      BAIXA: 'SIM',
      EMISSAO: format(new Date(this.bill.event.created_at), 'yyyMMdd'),
      VENCIMENTO: format(
        new Date(this.bill.event.data.bill.due_at),
        'yyyyMMdd'
      ),
      VENCIMENTO_REAL: format(
        new Date(this.bill.event.data.bill.due_at),
        'yyyyMMdd'
      ),
    };

    await this.CallEmpodera(data, toInsert)
    .then(async response => {
      console.log({
        action: `${toInsert ? 'sent' : 'update'}-bill-empodera`,
        status: response.status,
        description: response.statusText,
        customer: customer.id,
        response: response.data,
      });

      await EmpoderaErrorsService.checkReprocessing(customer.id, event);

      await EventsRepository.create({
        codeEvent: event,
        relatedId: customer.id,
        payload: data,
        status: 'success',
        transaction: this.bill.transaction,
      });
    })
    .catch(async error => {
      console.error(`Ocorreu um erro ao ${toInsert ? 'enviar' : 'atualizar'} a fatura de número ${this.bill.event.data.bill.id} 
                    para o cliente ${customer.id} no Empodera`, error);
      await EmpoderaErrorsService.catchError(error, customer.id, data, this.bill, event);
    });
  }

  private CallEmpodera(data: IEmpoderaBill, isPost: boolean): Promise<AxiosResponse<any>> {
    return isPost ? empoderaAPI().post(`/bill`, data) : empoderaAPI().put(`/bill`, data);
  }
}

export default new AddBillService();

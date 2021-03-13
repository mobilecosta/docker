/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { empoderaAPI } from '../../../../common/lib/external_apis';
import CustomersPhoneRepository from '../../../../repositories/CustomersPhoneRepository';
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

interface IEmpoderaCustomerContact {
  type: string;
  category: string;
  name: string;
  email: string;
  phones: Array<{
    number: string;
  }>;
}

class AddCustomerContactService {
  private bill: IBillInterfaceDTO;

  public async execute(message: string): Promise<void> {
    this.bill = JSON.parse(message);
    const customer = await CustomerRepository.findById(
      this.bill.event.data.bill.customer.code
    );
    const event = Events.EMPODERA_ADD_CONTACT;

    const phones = await CustomersPhoneRepository.find({
      value: customer.id,
      field: 'customer_id',
    });

    const data: Array<IEmpoderaCustomerContact> = [
      {
        type: 'Sponsor',
        category: 'Externo',
        name: customer.contactPerson ? customer.contactPerson : customer.name,
        email: customer.email,
        phones: phones.map((item: any) => {
          return {
            number: `(${item.number.substr(2, 2)}) ${item.number.substr(
              4,
              5
            )}-${item.number.substr(9, 4)}`,
          };
        }),
      },
    ];

    await empoderaAPI().put(`/customers/${customer.registryCode}/contacts/override`, data)
    .then(async response => {
      console.log({
        action: `sent-customer-contact-empodera`,
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
      console.error(`Ocorreu um erro ao enviar o contato do cliente ${customer.id} para o Empodera`, error);
      await EmpoderaErrorsService.catchError(error, customer.id, data, this.bill, event);
    });
  }
}

export default new AddCustomerContactService();

import { empoderaAPI } from "../../../../common/lib/external_apis";
import EventsRepository from "../../../../repositories/EventsRepository";
import { Events } from "../../../internal-processes/interfaces/common-enums";
import EmpoderaErrorsService from "./EmpoderaErrorsService";

interface IInactivateCustomer {
    customer: {
        registryCode: string;
        id: string;
    }
}

class InactivateCustomerService {

    private inactivateCustomer: IInactivateCustomer;

    private isActive: boolean;

    public async execute(message: string): Promise<void> {
        this.inactivateCustomer = JSON.parse(message);
        const event = Events.EMPODERA_INACTIVATE_CUSTOMER;

        await empoderaAPI().get(`/customers/codt/${this.inactivateCustomer.customer.registryCode}`)
            .then(async response => {
                if (response.data.active === true) {
                    this.isActive = true;
                }
            })
            .catch(async error => {
                console.error(`Ocorreu um erro ao recuperar o cliente ${this.inactivateCustomer.customer.registryCode} no Empodera para verificar o status atual antes de inativar o cliente`, error);
                await EmpoderaErrorsService.catchError(error, this.inactivateCustomer.customer.id, this.inactivateCustomer, this.inactivateCustomer, event);
                this.isActive = true;
            });

        if (!this.isActive) {
            console.log(`O cliente ${this.inactivateCustomer.customer.id} já está inativo`);
            return;
        }

        await empoderaAPI().put(`/customers/${this.inactivateCustomer.customer.registryCode}/inactivate`)
            .then(async response => {
                console.log({
                    action: `inactive-customer-empodera`,
                    status: response.status,
                    description: response.statusText,
                    customer: this.inactivateCustomer.customer.id,
                    response: response.data,
                });

                await EmpoderaErrorsService.checkReprocessing(this.inactivateCustomer.customer.id, event);

                await EventsRepository.create({
                    codeEvent: event,
                    relatedId: this.inactivateCustomer.customer.id,
                    payload: this.inactivateCustomer,
                    status: 'success',
                    transaction: this.inactivateCustomer.customer.registryCode,
                  });
            })
            .catch(async error => {
                console.error(`Ocorreu um erro ao inativar o cliente ${this.inactivateCustomer.customer.id} no Empodera`, error);
                await EmpoderaErrorsService.catchError(error, this.inactivateCustomer.customer.id, this.inactivateCustomer, this.inactivateCustomer, event);
            });
    }

}

export default new InactivateCustomerService();
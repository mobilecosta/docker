import { empoderaAPI } from "../../../../common/lib/external_apis";
import EventsRepository from "../../../../repositories/EventsRepository";
import { Events } from "../../../internal-processes/interfaces/common-enums";
import EmpoderaErrorsService from "./EmpoderaErrorsService";

interface IActivateCustomer {
    customer: {
        registryCode: string;
        id: string;
    }
}

class ActivateCustomerService {

    private activateCustomer: IActivateCustomer;

    private isActive: boolean;

    public async execute(message: string): Promise<void> {
        this.activateCustomer = JSON.parse(message);
        const event = Events.EMPODERA_ACTIVATE_CUSTOMER;

        await empoderaAPI().get(`/customers/codt/${this.activateCustomer.customer.registryCode}`)
            .then(async response => {
                if (response.data.active === true) {
                    this.isActive = true;
                }
            })
            .catch(async error => {
                console.error(`Ocorreu um erro ao recuperar o cliente ${this.activateCustomer.customer.registryCode} no Empodera para verificar o status atual antes de ativar o cliente`, error);
                await EmpoderaErrorsService.catchError(error, this.activateCustomer.customer.id, this.activateCustomer, this.activateCustomer, event);
                this.isActive = true;
            });

        if (this.isActive) {
            console.log(`O cliente ${this.activateCustomer.customer.id} já está ativo`);
            return;
        }

        await empoderaAPI().put(`/customers/${this.activateCustomer.customer.registryCode}/activate`)
            .then(async response => {
                console.log({
                    action: `active-customer-empodera`,
                    status: response.status,
                    description: response.statusText,
                    customer: this.activateCustomer.customer.id,
                    response: response.data,
                });

                await EmpoderaErrorsService.checkReprocessing(this.activateCustomer.customer.id, event);

                await EventsRepository.create({
                    codeEvent: event,
                    relatedId: this.activateCustomer.customer.id,
                    payload: this.activateCustomer,
                    status: 'success',
                    transaction: this.activateCustomer.customer.registryCode,
                  });
            })
            .catch(async error => {
                console.error(`Ocorreu um erro ao ativar o cliente ${this.activateCustomer.customer.id} no Empodera`, error);
                await EmpoderaErrorsService.catchError(error, this.activateCustomer.customer.id, this.activateCustomer, this.activateCustomer, event);
            });
    }

}

export default new ActivateCustomerService();
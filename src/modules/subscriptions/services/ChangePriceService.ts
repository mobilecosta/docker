import Joi from "@hapi/joi";
import CustomerRepository from "../../../repositories/v2/CustomerRepository";
import { subscriptionfindByCustomerId, update } from '../../../repositories/SubscriptionsRepository';
import { ChangePriceRequestInterface } from "../interfaces/changePrice-request.interface";
import { vindiAPI } from "../../../common/lib/external_apis";
import { ChangePriceResponseInterface } from "../interfaces/changePrice-response.interface";
import { sendToQueue } from "../../../common/lib/sqs";
import { Events } from "../../internal-processes/interfaces/common-enums";

const schema = Joi.object({
    customerId: Joi.string().required(),
    newPrice: Joi.number().required()
});

class ChangePriceService {
    private body: ChangePriceRequestInterface;

    private subscriptionId: string;

    private vindiProductItemId: any;

    private licenciadorCustomerId: any;
    private licenciadorSubscriptionId: any;

    constructor(body: string | null) {
        if (!body) {
            throw new Error('Invalid Request');
        }

        this.body = JSON.parse(body);
        const { error } = schema.validate(this.body);

        if (error) {
            console.error('Invalid Request for ChangePrice API', error);
            const resultError = error.details.map(err => err.message);
            throw new Error(resultError.toString());
        }
    }

    public async run(): Promise<ChangePriceResponseInterface> {
        await this.isValid();

        await update(this.subscriptionId, { price: this.body.newPrice });

        await sendToQueue(
            JSON.stringify({
                customerId: this.body.customerId,
                newPrice: this.body.newPrice,
                productItemId: this.vindiProductItemId,
                key: Events.VINDI_CHANGE_PRICE,
            }),
            `${process.env.EVENTS_VINDI_QUEUE}`
        );

        await sendToQueue(
            JSON.stringify({
                customerId: this.body.customerId,
                licenciador: {
                    customerId: this.licenciadorCustomerId,
                    subscriptionId: this.licenciadorSubscriptionId
                },
                newPrice: this.body.newPrice,
                key: Events.LICENCIADOR_CHANGE_PRICE,
            }),
            `${process.env.EVENTS_LICENCIADOR_QUEUE}`
        );

        let result: ChangePriceResponseInterface = {
            customerId: this.body.customerId,
            subscriptionId: this.subscriptionId,
            request: 'CHANGE_PRICE',
            status: 'Processing Started'
        };

        return result;
    }

    private async isValid(): Promise<boolean> {
        if (this.body.newPrice <= 0) {
            throw new Error('Price must be greater than 0!');
        }

        const customer = await CustomerRepository.findById(this.body.customerId);

        if (!customer) {
            throw new Error('Customer Not Found!');
        }

        if (!customer.codeLicenciador) {
            throw new Error('License Manager - Customer Not Found!');
        }

        const subscriptions = await subscriptionfindByCustomerId(this.body.customerId);

        if (!subscriptions) {
            throw new Error('Subscriptions Not Found!');
        }

        const activeSubscription = subscriptions.find(x => x.status === 'ativa');

        if (!activeSubscription) {
            throw new Error('There is no active subscription for this customer!');
        }

        if (!activeSubscription.codeLicenciador){
            throw new Error('License Manager - Subscription Not Found!');
        }

        const vindiSubscriptions = await (await vindiAPI()).get(`/subscriptions?query=id:${activeSubscription.vindiId}`);

        if (!vindiSubscriptions || !vindiSubscriptions.data || !vindiSubscriptions.data.subscriptions) {
            throw new Error('Vindi - Subscription Not Found!');
        }

        const vindiSubscription = vindiSubscriptions.data.subscriptions[0];

        if (vindiSubscription.product_items && vindiSubscription.product_items[0].discounts) {
            const product = vindiSubscription.product_items[0];

            let totalDiscount: number = 0;
            for (const i in product.discounts) {
                totalDiscount += parseFloat(product.discounts[i].amount);
            }

            totalDiscount = parseFloat(totalDiscount.toFixed(2));

            if (totalDiscount > this.body.newPrice) {
                throw new Error(`New Price must be greater than the sum of discounts (${totalDiscount})!`);
            }
        }

        this.subscriptionId = activeSubscription.id;
        this.vindiProductItemId = vindiSubscriptions.data.subscriptions[0].product_items[0].id;

        this.licenciadorCustomerId = customer.codeLicenciador;
        this.licenciadorSubscriptionId = activeSubscription.codeLicenciador;

        return true;
    }
}

export default ChangePriceService;
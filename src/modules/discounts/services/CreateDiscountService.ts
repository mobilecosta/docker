import * as Joi from '@hapi/joi';
import { licenciadorAPI, vindiAPI } from '../../../common/lib/external_apis';
import { subscriptionfindByCustomerId } from '../../../repositories/SubscriptionsRepository';
import CustomerRepository from '../../../repositories/v2/CustomerRepository';
import DiscountRepository from '../../../repositories/v2/DiscountRepository';
import CreateDiscountResultInterface from '../interfaces/CreateDiscountResultInterface';
import CreateDiscountRequestInterface from '../interfaces/CreateDiscountRequestInterface';
import { sendToQueue } from '../../../common/lib/sqs';
import { Events } from '../../internal-processes/interfaces/common-enums';

const schema = Joi.object({
    customerId: Joi.string().required(),
    amount: Joi.number().required(),
    cycles: Joi.number().required(),
    actionType: Joi.string()
});

class CreateDiscountService {
    private body: CreateDiscountRequestInterface;

    private vindiProductId: any;
    private subscriptionId: string;
    private licenseManagerCustomerId: string;
    private licenseManagerSubscriptionId: string;


    constructor(body: string | null) {
        if (!body) {
            throw new Error('Invalid Request');
        }

        this.body = JSON.parse(body);
        const { error } = schema.validate(this.body);

        if (error) {
            console.error('Invalid Request for CreateDiscount API', error);
            const resultError = error.details.map(err => err.message);
            throw new Error(resultError.toString());
        }
    }

    public async run(): Promise<CreateDiscountResultInterface> {
        const valid: boolean = await this.isValid();

        const newDiscount = await DiscountRepository.create({
            amount: this.body.amount.toString(),
            cycles: this.body.cycles.toString(),
            subscriptionId: this.subscriptionId,
            type: this.body.actionType || 'DISCOUNT_API'
        });

        await sendToQueue(
            JSON.stringify({
                customer: {
                    id: this.body.customerId,
                    subscription: this.subscriptionId,
                },
                discount: {
                    amount: this.body.amount,
                    cycles: this.body.cycles,
                },
                product_id: this.vindiProductId,
                key: Events.VINDI_ADD_DISCOUNT,
            }),
            `${process.env.EVENTS_VINDI_QUEUE}`
        );

        await sendToQueue(
            JSON.stringify({
                customer: {
                    id: this.body.customerId,
                },
                discount: {
                    amount: this.body.amount,
                    cycles: this.body.cycles,
                },
                licenseManager: {
                    clientId: this.licenseManagerCustomerId,
                    subscriptionId: this.licenseManagerSubscriptionId
                },
                key: Events.LICENCIADOR_ADD_DISCOUNT,
            }),
            `${process.env.EVENTS_LICENCIADOR_QUEUE}`
        );

        let result: CreateDiscountResultInterface = {
            customerId: this.body.customerId,
            discountId: newDiscount.id,
            request: 'NEW_DISCOUNT',
            status: 'Processing Started'
        };

        return result;
    }

    private async isValid(): Promise<boolean> {
        if (this.body.amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        if (this.body.cycles <= 0) {
            throw new Error('Cycles must be greater than 0');
        }

        const customer = await CustomerRepository.findById(this.body.customerId);

        if (!customer) {
            throw new Error('Customer Not Found!');
        }

        const subscriptions = await subscriptionfindByCustomerId(this.body.customerId);
        if (!subscriptions) {
            throw new Error('Subscriptions Not Found!');
        }

        const activeSubscription = subscriptions.find(x => x.status === 'ativa');

        if (!activeSubscription) {
            throw new Error('There is no active subscription for this customer!');
        }

        const vindiSubscriptions = await (await vindiAPI()).get(`/subscriptions?query=id:${activeSubscription.vindiId}`);

        if (!vindiSubscriptions || !vindiSubscriptions.data || !vindiSubscriptions.data.subscriptions) {
            throw new Error('Vindi Subscription Not Found!');
        }

        if (!activeSubscription.codeLicenciador) {
            throw new Error('Eleve (Licenciador) Subscription Not Found!');
        }

        if (!customer.codeLicenciador) {
            throw new Error('Eleve (Licenciador) customer Not Found!');
        }

        const vindiSubscription = vindiSubscriptions.data.subscriptions[0];

        if (vindiSubscription.product_items && vindiSubscription.product_items[0].discounts) {
            const product = vindiSubscription.product_items[0];

            let totalDiscount: number = 0;
            for (const i in product.discounts) {
                totalDiscount += parseFloat(product.discounts[i].amount);
            }

            totalDiscount += this.body.amount;

            totalDiscount = parseFloat(totalDiscount.toFixed(2));

            if (totalDiscount > product.pricing_schema.price) {
                throw new Error('Discount can not be greater than subscription price!');
            }
        }

        this.subscriptionId = activeSubscription.id;
        this.vindiProductId = vindiSubscriptions.data.subscriptions[0].product_items[0].id;
        this.licenseManagerSubscriptionId = activeSubscription.codeLicenciador || '';
        this.licenseManagerCustomerId = customer.codeLicenciador || '';

        return true;
    }
}

export default CreateDiscountService;

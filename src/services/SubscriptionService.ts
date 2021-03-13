import Subscription from "../models/Subscription";
import SubscriptionRepository from "../repositories/v2/SubscriptionRepository";

export interface IBillPaidEvent {
    event: {
        data: {
            bill: {
                customer: {
                    code: string
                },
                subscription?: {
                    code: string
                }
            }
        }
    }
}
class SubscriptionService {

    public async GetSubscriptionByBillPaidEvent(billPaidEvent: IBillPaidEvent): Promise<Subscription | undefined> {

        if (billPaidEvent.event.data.bill.subscription && billPaidEvent.event.data.bill.subscription.code) {
            let subscription = SubscriptionRepository.findById(billPaidEvent.event.data.bill.subscription.code);

            if (subscription) {
                return subscription;
            }
        }

        const subscriptions = await SubscriptionRepository.find({
            value: billPaidEvent.event.data.bill.customer.code,
            field: 'customer_id',
        });

        if (!subscriptions || subscriptions.length === 0) {
            return undefined;
        }

        const activeSubscription = subscriptions.find(x => x.status === 'ativa');

        if (activeSubscription) {
            return activeSubscription;
        }

        return subscriptions.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))[0];
    }
}

export default new SubscriptionService();
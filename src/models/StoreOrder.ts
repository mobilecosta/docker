import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('store_orders')
class StoreOrder {
  @hashKey()
  order_id: string;

  @attribute()
  type: string;

  @attribute({ attributeName: 'subscription_id' })
  subscriptionId: string;

  @attribute({ attributeName: 'customer_id' })
  customerId: string;

  @attribute({ attributeName: 'created_at' })
  createdAt: Date;
}

export default StoreOrder;

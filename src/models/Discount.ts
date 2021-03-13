import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('discounts')
class Discount {
  @hashKey()
  id: string;

  @attribute()
  subscriptionId: string;

  @attribute()
  amount: string;

  @attribute()
  cycles: string;

  @attribute()
  type: string;

  @attribute({ attributeName: 'sales_order' })
  salesOrder?: string;

  @attribute({ attributeName: 'created_at' })
  createdAt?: Date;
}

export default Discount;

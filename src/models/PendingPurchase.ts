import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

class Offers {
  @attribute()
  code: string;

  @attribute()
  quantity: number;

  @attribute({ attributeName: 'reseller_protheus_id' })
  resellerProtheusId?: string;
}

class Discount {
  @attribute()
  amount: string;

  @attribute()
  cycles: number;
}

@table('pending_purchase')
export default class PendingPurchase {
  @hashKey()
  id: string;

  @attribute({ attributeName: 'customer_id' })
  customerId: string;

  @attribute()
  price: string;

  @attribute({ attributeName: 'sales_order' })
  salesOrder: string;

  @attribute()
  offers: Array<Offers>;

  @attribute()
  discount?: Discount;

  @attribute({ attributeName: 'bill_id' })
  billId?: number;

  @attribute({ attributeName: 'charge_id' })
  chargeId?: number;

  @attribute({ attributeName: 'updated_at' })
  updatedAt?: Date;

  @attribute({ attributeName: 'created_at' })
  createdAt?: Date;
}

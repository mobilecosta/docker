import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('subscriptions')
class Subscription {
  @hashKey()
  id: string;

  @attribute({ attributeName: 'vindi_id' })
  vindiId?: string;

  @attribute({ attributeName: 'customer_id' })
  customerId: string;

  @attribute({ attributeName: 'sales_order' })
  salesOrder?: string;

  @attribute({ attributeName: 'plan_code' })
  planCode: string;

  @attribute({ attributeName: 'payment_method_code' })
  paymentMethod: string;

  @attribute()
  migrated?: boolean;

  @attribute()
  price: string;

  @attribute()
  status: string;

  @attribute()
  installments: number;

  @attribute({ attributeName: 'vindi_sent_at' })
  vindiSentAt?: Date;

  @attribute({ attributeName: 'licenciador_sent_at' })
  licenciadorSentAt?: Date;

  @attribute({ attributeName: 'code_licenciador' })
  codeLicenciador?: string;

  @attribute({ attributeName: 'created_at' })
  createdAt: Date;

  @attribute({ attributeName: 'updated_at' })
  updatedAt: Date;

  @attribute()
  reason?: Record<string, any>;
}

export default Subscription;

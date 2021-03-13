import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('bills')
class Bill {
  @hashKey()
  id: string;

  @attribute({ attributeName: 'id_vindi' })
  idVindi: number;

  @attribute()
  amount: string;

  @attribute()
  installments: number;

  @attribute()
  status: string;

  @attribute({ attributeName: 'due_at' })
  dueAt?: Date;

  @attribute()
  url: string;

  @attribute({ attributeName: 'subscription_id' })
  subscriptionId: string;

  @attribute({ attributeName: 'updated_at' })
  updatedAt: Date;

  @attribute({ attributeName: 'created_at' })
  createdAt: Date;
}

export default Bill;

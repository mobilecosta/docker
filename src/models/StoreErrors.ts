import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('store_errors')
class StoreErrors {
  @hashKey()
  id: string;

  @attribute()
  event: string;

  @attribute()
  action: string;

  @attribute()
  payload: Record<string, any>;

  @attribute()
  response: Record<string, any>;

  @attribute({ attributeName: 'customer_id' })
  customerId?: string;

  @attribute({ attributeName: 'queue_message' })
  queueMessage: Record<string, any>;

  @attribute()
  retries: number;

  @attribute({ attributeName: 'updated_at' })
  updatedAt: Date;

  @attribute({ attributeName: 'created_at' })
  createdAt: Date;
}

export default StoreErrors;
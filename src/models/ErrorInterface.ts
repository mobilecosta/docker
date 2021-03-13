import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('errors_interfaces')
class ErrorInterface {
  @hashKey()
  id: string;

  @attribute({ attributeName: 'related_id' })
  relatedId: string;

  @attribute()
  level: string;

  @attribute()
  system: string;

  @attribute()
  event: string;

  @attribute()
  action: string;

  @attribute({ attributeName: 'http_code' })
  httpCode?: number;

  @attribute()
  message?: string;

  @attribute({ attributeName: 'customer_id' })
  customerId?: string;

  @attribute({ attributeName: 'queue_message' })
  queueMessage: string;

  @attribute()
  retries: number;

  @attribute({ attributeName: 'updated_at' })
  updatedAt: Date;

  @attribute({ attributeName: 'created_at' })
  createdAt: Date;
}

export default ErrorInterface;

import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('vindi_webhook')
class VindiWebhook {
  @hashKey()
  id: string;

  @attribute()
  type: string;

  @attribute()
  data: Record<string, any>;

  @attribute({ attributeName: 'customer_id' })
  customerId: string;

  @attribute({ attributeName: 'created_at' })
  createdAt: Date;
}

export default VindiWebhook;

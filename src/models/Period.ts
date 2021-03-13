import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('periods')
class Period {
  @hashKey()
  id: string;

  @attribute({ attributeName: 'id_vindi' })
  idVindi: number;

  @attribute({ attributeName: 'start_at' })
  startAt: Date;

  @attribute({ attributeName: 'end_at' })
  endAt: Date;

  @attribute({ attributeName: 'subscription_id' })
  subscriptionId: string;

  @attribute()
  cycle: number;

  @attribute({ attributeName: 'updated_at' })
  updatedAt: Date;

  @attribute({ attributeName: 'created_at' })
  createdAt: Date;
}

export default Period;

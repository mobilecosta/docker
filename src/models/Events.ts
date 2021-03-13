import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('events')
class Events {
  @hashKey()
  id: string;

  @attribute({ attributeName: 'code_event' })
  codeEvent: string;

  @attribute({ attributeName: 'related_id' })
  relatedId: string;

  @attribute()
  payload: Record<string, any>;

  @attribute()
  status: string;

  @attribute()
  transaction?: string;

  @attribute()
  migrated?: boolean;

  @attribute({ attributeName: 'created_at' })
  createdAt?: Date;
}

export default Events;

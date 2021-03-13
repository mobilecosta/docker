import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('payloads')
class Payload {
  @hashKey()
  id: string;

  @attribute()
  method: string;

  @attribute()
  url: string;

  @attribute()
  origin: string;

  @attribute()
  identity: Record<string, any>;

  @attribute()
  payload: Record<string, any>;

  @attribute()
  response: Record<string, any>;

  @attribute({ attributeName: 'created_at' })
  createdAt?: Date;
}

export default Payload;

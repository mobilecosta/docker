import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('plans')
class Plan {
  @hashKey()
  id: string;

  @attribute({ attributeName: 'plan_id' })
  planId: string;

  @attribute({ attributeName: 'plan_code' })
  planCode?: string;

  @attribute({ attributeName: 'created_at' })
  createdAt?: Date;

  @attribute({ attributeName: 'updated_at' })
  updatedAt?: Date;
}

export default Plan;

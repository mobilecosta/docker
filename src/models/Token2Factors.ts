import {
  attribute,
  hashKey,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

export enum TypeToken {
  EMAIL = 'email',
  SMS = 'sms',
}

@table('token_twofactors')
class Token2Factors {
  @hashKey()
  id: string;

  @attribute({ attributeName: 'customer_id' })
  customerId: string;

  @attribute()
  type: TypeToken;

  @attribute()
  token: string;

  @attribute()
  validatedAt?: Date;

  @attribute()
  createdAt: Date;
}

export default Token2Factors;

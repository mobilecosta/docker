import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

export enum PhoneType {
  MOBILE = 'mobile',
  LANDLINE = 'landline',
}

export class AuthorizedMessages {
  @attribute({ attributeName: 'accepted_receive' })
  acceptedReceive: boolean;

  @attribute({ attributeName: 'acceptance_date' })
  acceptanceDate: Date;
}

@table('customers_phone')
class CustomerPhone {
  @hashKey()
  id!: string;

  @attribute()
  number!: string;

  @attribute({ attributeName: 'customer_id' })
  customerId!: string;

  @attribute()
  type!: PhoneType;

  @attribute()
  extension?: '';

  @attribute()
  sms: AuthorizedMessages;

  @attribute()
  whatsapp: AuthorizedMessages;

  @attribute()
  validated: boolean;

  @attribute()
  default: boolean;

  @attribute({ attributeName: 'validation_date' })
  validationDate?: Date;

  @attribute({ attributeName: 'created_at' })
  createdAt?: Date;

  @attribute({ attributeName: 'updated_at' })
  updatedAt?: Date;
}

export default CustomerPhone;

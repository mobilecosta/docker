import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';
// import { embed } from '@aws/dynamodb-data-mapper';

class Address {
  @attribute()
  street!: string;

  @attribute()
  number!: string;

  @attribute({ attributeName: 'additional_details' })
  additionalDetails?: string;

  @attribute()
  zipcode!: string;

  @attribute()
  neighborhood: string;

  @attribute()
  city!: string;

  @attribute()
  state!: string;
}
class Over16Metadata {
  @attribute()
  ip!: string;

  @attribute()
  details!: string;
}
@table('customers')
class Customer {
  @hashKey()
  id!: string;

  @attribute()
  name!: string;

  @attribute()
  trade?: string;

  @attribute()
  email!: string;

  @attribute({ attributeName: 'is_legal_entity' })
  isLegalEntity!: boolean;

  @attribute({ attributeName: 'registry_code' })
  registryCode!: string;

  @attribute({ attributeName: 'registry_state_code' })
  registryStateCode!: string;

  @attribute()
  cnae?: string;

  @attribute()
  notes?: string;

  @attribute({ attributeName: 'contact_person' })
  contactPerson?: string;

  @attribute()
  website?: string;

  @attribute()
  address!: Address;

  @attribute({ attributeName: 'is_over_16' })
  isOver16?: boolean;

  @attribute({
    attributeName: 'over_16_metadata',
  })
  over16Metadata?: Over16Metadata;

  @attribute({ attributeName: 'email_confirmed_at' })
  emailConfirmedAt?: Date;

  @attribute({ attributeName: 'vindi_sent_at' })
  vindiSentAt?: Date;

  @attribute({ attributeName: 'store_sent_at' })
  storeSentAt?: Date;

  @attribute({ attributeName: 'protheus_sent_at' })
  protheusSentAt?: Date;

  @attribute({ attributeName: 'licenciador_sent_at' })
  licenciadorSentAt?: Date;

  @attribute({ attributeName: 'code_licenciador' })
  codeLicenciador?: string;

  @attribute({ attributeName: 'code_t' })
  codeT?: string;

  @attribute({ attributeName: 'vindi_code' })
  vindiCode?: string;

  @attribute({ attributeName: 'created_at' })
  createdAt?: Date;

  @attribute({ attributeName: 'updated_at' })
  updatedAt?: Date;
}

export default Customer;

import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

class Address {
  @attribute()
  street: string;

  @attribute()
  zipcode: string;

  @attribute()
  neighborhood: string;

  @attribute()
  city: string;

  @attribute()
  state: string;
}

class Phone {
  @attribute()
  area: string;

  @attribute()
  number: string;
}

class CellPhone {
  @attribute()
  area: string;

  @attribute()
  number: string;
}

@table('resellers')
class Reseller {
  @hashKey({ attributeName: 'reseller_id' })
  resellerId: string;

  @attribute()
  name: string;

  @attribute()
  address: Address;

  @attribute()
  phone: Phone;

  @attribute()
  cnpjCpf: string;

  @attribute()
  stateRegistryCode: string;

  @attribute()
  municipalRegistryCode: string;

  @attribute()
  office: string;

  @attribute()
  cellphone: CellPhone;

  @attribute()
  agn: string;

  @attribute()
  costCenter: string;

  @attribute()
  login: string;

  @attribute()
  email: string;

  @attribute({ attributeName: 'sent_to_protheus' })
  sentToProtheus: boolean;

  @attribute({ attributeName: 'updated_at' })
  updatedAt: Date;

  @attribute({ attributeName: 'created_at' })
  createdAt: Date;
}

export default Reseller;

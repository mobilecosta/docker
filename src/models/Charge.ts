import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('charges')
class Charge {
  @hashKey()
  id: string;

  @attribute({ attributeName: 'id_vindi' })
  idVindi: number;

  @attribute({ attributeName: 'bill_id' })
  billId: number;

  @attribute()
  status: string;

  @attribute({ attributeName: 'due_at' })
  dueAt: Date;

  @attribute()
  url?: string;

  @attribute({ attributeName: 'typable_barcode' })
  typableBarcode?: string;

  @attribute({ attributeName: 'typable_barcode' })
  barcode?: string;

  @attribute({ attributeName: 'card_company' })
  cardCompany?: string;

  @attribute({ attributeName: 'card_expiration' })
  cardExpiration?: string;

  @attribute({ attributeName: 'card_number_first_six' })
  cardNumberFirstSix?: string;

  @attribute({ attributeName: 'card_number_last_four' })
  cardNumberLastFour?: string;

  @attribute()
  nsu?: string;

  @attribute({ attributeName: 'gateway_authorization' })
  gatewayAuthorization?: string;

  @attribute({ attributeName: 'payment_method' })
  paymentMethod: string;

  @attribute({ attributeName: 'updated_at' })
  updatedAt: Date;

  @attribute({ attributeName: 'created_at' })
  createdAt: Date;
}

export default Charge;

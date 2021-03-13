import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

@table('bank_slip')
class BankSlip {
  @hashKey()
  id: string;

  @attribute({ attributeName: 'customer_id' })
  customerId: string;

  @attribute({ attributeName: 'vindi_bill' })
  vindiBill: string;

  @attribute()
  barcode: string;

  @attribute({ attributeName: 'typeable_barcode' })
  typeableBarcode: string;

  @attribute({ attributeName: 'slip_transaction_id' })
  slipTransactionId: string;

  @attribute()
  url: string;

  @attribute({ attributeName: 'created_at' })
  createdAt?: Date;
}

export default BankSlip;

import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

export enum InvoiceStatus {
  VALID = 'valida',
  INVALID = 'invalida',
}

@table('invoices')
class Invoice {
  @hashKey()
  id: string;

  @attribute({ attributeName: 'customer_id' })
  customerId: string;

  @attribute()
  number: number;

  @attribute()
  serie: number;

  @attribute()
  url: string;

  @attribute()
  hash: string;

  @attribute()
  order: string;

  @attribute()
  status: InvoiceStatus;

  @attribute({ attributeName: 'created_at' })
  createdAt?: Date;

  @attribute({ attributeName: 'updated_at' })
  updatedAt?: Date;
}

export default Invoice;

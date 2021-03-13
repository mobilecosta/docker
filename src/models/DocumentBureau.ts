import {
  hashKey,
  attribute,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

export enum DocumentType {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
}

@table('documents_bureau')
class DocumentsBureau {
  @hashKey()
  id!: string;

  @attribute()
  type!: DocumentType;

  @attribute()
  document!: string;

  @attribute()
  code!: string;

  @attribute()
  description!: string;

  @attribute()
  details?: Record<string, any>;

  @attribute()
  consulted: number;

  @attribute()
  updatedAt: Date;

  @attribute()
  createdAt: Date;
}

export default DocumentsBureau;

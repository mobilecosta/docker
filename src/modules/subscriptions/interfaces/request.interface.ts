export default interface RequestInterface {
  startAt?: Date;
  billingAt?: Date;
  customerId: string;
  salesOrder?: string;
  planCode: PlanCode;
  paymentMethod: string;
  price: string;
  offers: Array<{
    code: string;
    quantity: number;
    resellerProtheusId?: string;
  }>;
  installments?: number;
  discount?: {
    amount: string;
    cycles: number;
    isProRata: boolean;
  };
}

export enum PlanCode {
  MENSAL = 'TOTVSMENSAL',
  BIMESTRAL = 'TOTVSBIMESTRAL',
  TRIMESTRAL = 'TOTVSTRIMESTRAL',
  QUADRIMESTRAL = 'TOTVSQUADRIMESTRAL',
  SEMESTRAL = 'TOTVSSEMESTRAL',
  ANUAL = 'TOTVSANUAL',
}

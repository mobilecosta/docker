import { PlanCode } from './request.interface';

export default interface NewItemRequestInterface {
  salesOrder: string;
  planCode: PlanCode;
  paymentMethod: string;
  price: string;
  billPrice?: string;
  offers: Array<{
    code: string;
    quantity: number;
    resellerProtheusId?: string;
  }>;
  installments?: number;
  discount?: {
    amount: string;
    cycles: number;
  };
}

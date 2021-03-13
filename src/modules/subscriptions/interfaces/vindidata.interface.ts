export default interface VindiData {
  id: string;
  customerId: string;
  vindiCustomerCode: string;
  startAt?: string;
  salesOrder: string;
  planCode: string;
  planId: string;
  paymentMethod: string;
  price: string;
  installments: number;
  offers: Array<{
    code: string;
    quantity: number;
    resellerProtheusId?: string;
  }>;
  discount: {
    amount: string;
    cycles: number;
    isProRata: boolean;
  };
}

interface Reason {
  main: string;
  sub: string;
  details: string;
}
export interface SubscriptionInterface {
  id: string;
  vindi_id?: string;
  customer_id: string;
  sales_order?: string;
  plan_code: string;
  payment_method_code: string;
  price: string;
  status: string;
  installments: number;
  vindi_sent_at?: number;
  licenciador_sent_at?: number;
  code_licenciador?: string;
  created_at: number;
  updated_at: number;
  reason?: Reason;
}

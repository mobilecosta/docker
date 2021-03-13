export interface BillInterface {
  id: string;
  id_vindi: number;
  amount: string;
  installments: number;
  status: string;
  due_at: Date;
  url: string;
  subscription_id: string;
  updated_at: Date;
  created_at: Date;
}

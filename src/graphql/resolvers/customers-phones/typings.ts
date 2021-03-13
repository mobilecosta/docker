interface AuthorizedMessages {
  accepted_receive: boolean;
  acceptance_date: number;
}

export interface CustomerPhoneInterface {
  id: string;
  number: string;
  customer_id: string;
  type: string;
  extension?: string;
  sms: AuthorizedMessages;
  whatsapp: AuthorizedMessages;
  was_validated?: boolean;
  validation_date?: number;
  created_at?: number;
  updated_at?: number;
}

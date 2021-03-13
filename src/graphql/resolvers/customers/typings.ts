interface Address {
  street: string;
  number: string;
  additional_details?: string;
  zipcode: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface Over16Metadata {
  ip: string;
  details: string;
}

export interface CustomerInterface {
  id: string;
  name: string;
  trade?: string;
  email: string;
  is_legal_entity: boolean;
  registry_code: string;
  registry_state_code?: string;
  cnae?: string;
  notes?: string;
  contact_person?: string;
  website?: string;
  address: Address;
  is_over_16?: boolean;
  over_16_metadata?: Over16Metadata;
  email_confirmed_at?: number;
  vindi_sent_at?: number;
  store_sent_at?: number;
  protheus_sent_at?: number;
  licenciador_sent_at?: number;
  code_licenciador?: string;
  code_t?: string;
  vindi_code?: string;
  created_at?: number;
  updated_at?: number;
}

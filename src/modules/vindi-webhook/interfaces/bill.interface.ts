export default interface BillCanceledInterface {
  event: {
    id: string;
    type: string;
    created_at: string;
    data: {
      bill: {
        id: number;
        code?: string;
        amount: string;
        installments: number;
        status: string;
        seen_at?: string;
        billing_at?: string;
        due_at: string;
        url: string;
        created_at: string;
        updated_at: string;
        bill_items: Array<{
          id: number;
          amount: string;
          quantity: number;
          pricing_range_id?: string;
          description?: string;
          pricing_schema: {
            id: number;
            short_format: string;
            price: string;
            minimum_price?: string;
            schema_type: string;
            pricing_ranges: [];
            created_at: string;
          };
          product: {
            id: number;
            name: string;
            code?: string;
          };
          product_item: {
            id: number;
            product: {
              id: number;
              name: string;
              code?: string;
            };
          };
          discount?: any;
        }>;
        charges: Array<{
          id: number;
          amount: string;
          status: string;
          due_at: string;
          paid_at: string;
          installments: number;
          attempt_count: number;
          next_attempt?: string;
          print_url?: string;
          created_at: string;
          updated_at: string;
          last_transaction: {
            id: number;
            transaction_type: string;
            status: string;
            amount: string;
            installments?: number;
            gateway_message: string;
            gateway_response_code?: string;
            gateway_authorization: string;
            gateway_transaction_id: string;
            gateway_response_fields: Record<string, any>;
            fraud_detector_score?: string;
            fraud_detector_status?: string;
            fraud_detector_id?: string;
            created_at: string;
            gateway: {
              id: number;
              connector: string;
            };
            payment_profile?: {
              id: number;
              holder_name: string;
              registry_code?: string;
              bank_branch?: string;
              bank_account?: string;
              card_expiration?: string;
              card_number_first_six?: string;
              card_number_last_four?: string;
              token: string;
              created_at: string;
              payment_company: {
                id: number;
                name: string;
                code: string;
              };
            };
          };
          payment_method: {
            id: number;
            public_name: string;
            name: string;
            code: string;
            type: string;
          };
        }>;
        customer: {
          id: number;
          name: string;
          email: string;
          code: string;
        };
        period: {
          id: number;
          billing_at: string;
          cycle: number;
          start_at: string;
          end_at: string;
          duration: number;
        };
        subscription: {
          id: number;
          code: string;
          plan: {
            id: number;
            name: string;
            code: string;
          };
          customer: {
            id: number;
            name: string;
            email: string;
            code: string;
          };
        };
        metadata: {};
        payment_profile?: Record<string, any>;
        payment_condition?: any;
      };
    };
  };
}

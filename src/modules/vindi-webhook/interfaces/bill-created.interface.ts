export default interface BillCreatedInterface {
  event: {
    order: string;
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
        bill_items: [
          {
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
          }
        ];
        charges: [
          {
            id: number;
            amount: string;
            status: string;
            due_at: string;
            paid_at?: string;
            installments: number;
            attempt_count: number;
            next_attempt?: string;
            print_url?: string;
            created_at: string;
            updated_at: string;
            last_transaction?: Record<string, any>;
            payment_method: {
              id: number;
              public_name: string;
              name: string;
              code: string;
              type: string;
            };
          }
        ];
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

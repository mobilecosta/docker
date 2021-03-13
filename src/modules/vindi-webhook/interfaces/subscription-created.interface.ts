export default interface SubscriptionCreatedInterface {
  event: {
    type: string;
    created_at: string;
    data: {
      subscription: {
        id: number;
        status: string;
        start_at: string;
        end_at?: string;
        next_billing_at: string;
        overdue_since?: string;
        code: string;
        cancel_at?: string;
        interval: string;
        interval_count: number;
        billing_trigger_type: string;
        billing_trigger_day: number;
        billing_cycles?: number;
        installments: number;
        created_at: string;
        updated_at: string;
        customer: {
          id: number;
          name: string;
          email: string;
          code: string;
        };
        plan: {
          id: number;
          name: string;
          code: string;
        };
        product_items: [
          {
            id: number;
            status: string;
            uses: number;
            cycles: null;
            quantity: number;
            created_at: string;
            updated_at: string;
            product: {
              id: number;
              name: string;
              code?: string;
            };
            pricing_schema: {
              id: number;
              short_format: string;
              price: string;
              minimum_price?: string;
              schema_type: string;
              pricing_ranges: Array<any>;
              created_at: string;
            };
            discounts: Array<any>;
          }
        ];
        payment_method: {
          id: number;
          public_name: string;
          name: string;
          code: string;
          type: string;
        };
        current_period: {
          id: number;
          billing_at: string;
          cycle: number;
          start_at: string;
          end_at: string;
          duration: string;
        };
        metadata: Record<string, any>;
        payment_profile?: any;
        invoice_split: string;
      };
    };
  };
}

export default interface PaymentProfileInterface {
  event: {
    type: string;
    data: {
      payment_profile: {
        id: number;
        customer: {
          id: number;
          code: string;
        };
      };
    };
  };
}

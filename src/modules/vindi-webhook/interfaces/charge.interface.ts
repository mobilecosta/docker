export default interface ChargeInterface {
  event: {
    type: string;
    data: {
      charge: {
        id: number;
        amount: string;
        status: string;
        bill: {
          id: number;
          code: string;
        };
        customer: {
          id: number;
          code: string;
        };
      };
    };
  };
}

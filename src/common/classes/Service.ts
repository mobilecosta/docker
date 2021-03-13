export interface ServiceResponse {
  status: string;
  description: string;
  action: string;
}

export abstract class InternalService {
  abstract run(): Promise<ServiceResponse>;
}

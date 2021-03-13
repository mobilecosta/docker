export interface WebhookRequestInterface {
  event: WebhookEventInterface;
}

interface WebhookEventInterface {
  type: string;
  created_at: string;
  data: any;
}

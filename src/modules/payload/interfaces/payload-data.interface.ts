export default interface PayloadData {
  method: string;
  url: string;
  origin: string;
  identity: Record<string, any>;
  payload: Record<string, any>;
  response: Record<string, any>;
}

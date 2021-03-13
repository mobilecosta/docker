export default interface Repository {
  create(params: any): Promise<any>;
  update(id: string, field: Record<string, any>): Promise<any>;
  remove(id: string): Promise<boolean>;
  findById(id: any): Promise<any>;
  findOne(params: { value: any; field: string }): Promise<any>;
  find(params: { value: any; field: string }): Promise<any[]>;
  getAll(): Promise<Array<any>>;
}

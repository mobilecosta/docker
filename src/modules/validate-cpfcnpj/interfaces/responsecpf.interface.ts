export interface ResponseCPFInterface {
  ni: string;
  nome: string;
  situacao: SituacaoCpf;
}

export interface SituacaoCpf {
  codigo: string;
  descricao: string;
}

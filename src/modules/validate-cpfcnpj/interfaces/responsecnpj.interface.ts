export interface ResponseCNPJInterface {
  ni: string;
  data_abertura: string;
  nome_empresarial: string;
  nome_fantasia: string;
  cnae_principal: CnaePrincipal;
  natureza_juridica: NaturezaJuridica;
  endereco: Endereco;
  situacao_especial: string;
  situacao_cadastral: SituacaoCadastral;
  orgao: string;
  tipo_estabelecimento: string;
  correio_eletronico: string;
  capital_social: number;
  porte: string;
  telefones: Telefone[];
  nome_orgao: string;
  ente_federativo: string;
}

export interface CnaePrincipal {
  codigo: string;
  descricao: string;
}

export interface NaturezaJuridica {
  codigo: string;
  descricao: string;
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento: string;
  cep: string;
  bairro: string;
  municipio: string;
  uf: string;
}

export interface SituacaoCadastral {
  codigo: string;
  data: string;
  motivo: string;
}

export interface Telefone {
  ddd: string;
  numero: string;
}

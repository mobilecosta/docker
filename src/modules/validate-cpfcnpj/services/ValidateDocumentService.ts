/* eslint-disable no-plusplus */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/ban-ts-ignore  test*/
import { differenceInDays } from 'date-fns';
import {
  InternalService,
  ServiceResponse,
} from '../../../common/classes/Service';
import {
  findByDocument,
  create,
  update,
} from '../../../repositories/DocumentsBureauRepository';
import DocumentsBureau, { DocumentType } from '../../../models/DocumentBureau';
import { RequestInterface } from '../interfaces/request.interface';

import { cpfAPI, cnpjAPI } from '../../../common/lib/external_apis';
import { ResponseCPFInterface } from '../interfaces/responsecpf.interface';
import { ResponseCNPJInterface } from '../interfaces/responsecnpj.interface';

enum SituacaoCadastralCPF {
  REGULAR = '0',
  SUSPENSA = '2',
  TITULAR_FALECIDO = '3',
  PENDENTE_DE_REGULARIZACAO = '4',
  CANCELADA_POR_MULTIPLICIDADE = '5',
  NULA = '8',
  CANCELADA_DE_OFICIO = '9',
}

enum SituacaoCadastralCNPJ {
  NULA = '1',
  ATIVA = '2',
  SUSPENSA = '3',
  INAPTA = '4',
  BAIXADA = '5',
}
class ValidateDocumentService extends InternalService {
  private document: RequestInterface;

  private alreadyExists = false;

  private isCPF = false;

  private qtyConsult = 0;

  private cpfcnpj: DocumentsBureau;

  constructor(document: string | null) {
    super();
    if (!document) {
      throw new Error('Invalid Request');
    }
    this.document = JSON.parse(document);
    if (!this.document.cpf && !this.document.cnpj) {
      throw new Error('Document not specified');
    }
  }

  // @ts-ignore
  // eslint-disable-next-line consistent-return
  async run(): Promise<ServiceResponse> {
    if (this.document.cpf) {
      this.isCPF = true;
      const document = this.sanitize(this.document.cpf);
      if (!this.validateCPFNumber(document)) {
        throw new Error('Invalid Document');
      }
      if (process.env.ENV === 'prod') {
        const data = await this.wasConsultedLast3Days(document);

        if (!data) {
          const serproData = await this.verifyCPFinSERPRO(document);
          return {
            status: serproData.status,
            action: 'VALIDATE_CPF',
            description: serproData.description,
          };
        }
      }
      return {
        status: process.env.ENV === 'prod' ? this.cpfcnpj.code : '0',
        action: 'VALIDATE_CPF',
        description:
          process.env.ENV === 'prod' ? this.cpfcnpj.description : 'ok',
      };
    }
    if (this.document.cnpj) {
      const document = this.sanitize(this.document.cnpj);
      if (!this.validateCNPJNumber(document)) {
        throw new Error('Invalid Document');
      }
      if (process.env.ENV === 'prod') {
        const data = await this.wasConsultedLast3Days(document);

        if (!data) {
          const serproData = await this.verifyCNPJinSERPRO(document);
          return {
            status: serproData.status,
            action: 'VALIDATE_CNPJ',
            description: serproData.description,
          };
        }
      }
      return {
        status: process.env.ENV === 'prod' ? this.cpfcnpj.code : '0',
        action: 'VALIDATE_CNPJ',
        description:
          process.env.ENV === 'prod' ? this.cpfcnpj.description : 'ok',
      };
    }
  }

  private sanitize(str: string): string {
    return str.replace(/([^0-9])/g, '');
  }

  private validateCPFNumber(cpf: string): boolean {
    let soma = 0;
    let resto;
    const blacklist = [
      '00000000000',
      '11111111111',
      '22222222222',
      '33333333333',
      '44444444444',
      '55555555555',
      '66666666666',
      '77777777777',
      '88888888888',
      '99999999999',
      '12345678909',
      '01234567890',
    ];
    const inputCPF = cpf;
    if (blacklist.includes(cpf)) return false;
    for (let i = 1; i <= 9; i += 1)
      soma += parseInt(inputCPF.substring(i - 1, i), 10) * (11 - i);
    resto = (soma * 10) % 11;

    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(inputCPF.substring(9, 10), 10)) return false;

    soma = 0;
    for (let i = 1; i <= 10; i += 1)
      soma += parseInt(inputCPF.substring(i - 1, i), 10) * (12 - i);
    resto = (soma * 10) % 11;

    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(inputCPF.substring(10, 11), 10)) return false;
    return true;
  }

  private validateCNPJNumber(document: string): boolean {
    if (!document) {
      return true;
    }
    const cnpj = document.replace(/[^\d]+/g, '');

    // Valida a quantidade de caracteres
    if (cnpj.length !== 14) return false;

    // Elimina inválidos com todos os caracteres iguais
    if (/^(\d)\1+$/.test(cnpj)) return false;

    // Cáculo de validação
    const t = cnpj.length - 2;
    const d = cnpj.substring(t);
    const d1 = parseInt(d.charAt(0), 10);
    const d2 = parseInt(d.charAt(1), 10);
    const calc = (x: number) => {
      const n = cnpj.substring(0, x);
      let y = x - 7;
      let s = 0;
      let r = 0;

      for (let i: number = x; i >= 1; i--) {
        s += parseInt(n.charAt(x - i), 10) * y--;
        if (y < 2) y = 9;
      }

      r = 11 - (s % 11);
      return r > 9 ? 0 : r;
    };

    if (calc(t) === d1 && calc(t + 1) === d2) {
      return true;
    }
    return false;
  }

  private async wasConsultedLast3Days(
    document: string
  ): Promise<DocumentsBureau | null> {
    try {
      const result = await findByDocument(document);
      if (!result[0]) return null;
      // eslint-disable-next-line prefer-destructuring
      this.cpfcnpj = result[0];
      this.qtyConsult = this.cpfcnpj.consulted;
      this.alreadyExists = true;
      const lastConsult = differenceInDays(new Date(), result[0].updatedAt);
      console.info(`last consult: ${lastConsult} days later`);
      if (lastConsult > 3) return null;
      if (this.isCPF) {
        return result[0].code !== SituacaoCadastralCPF.REGULAR
          ? null
          : result[0];
      }
      return result[0].code !== SituacaoCadastralCNPJ.ATIVA ? null : result[0];
    } catch (error) {
      throw new Error(`[get-document]: ${error.message}`);
    }
  }

  private async verifyCPFinSERPRO(
    document: string
  ): Promise<{ status: string; description: string }> {
    try {
      const response = await (await cpfAPI()).get(`/${document}`);
      if (response.status === 404) {
        throw new Error('Invalid Document');
      }
      const responseCPF: ResponseCPFInterface = response.data;
      // @ts-ignore
      const data: DocumentsBureau = {
        type: DocumentType.CPF,
        document: responseCPF.ni,
        code: responseCPF.situacao.codigo,
        description: responseCPF.situacao.descricao,
        details: { nome_empresarial: responseCPF.nome },
        consulted: this.qtyConsult + 1,
      };
      if (this.alreadyExists) {
        await update(this.cpfcnpj.id, data);
      } else {
        await create(data);
      }

      if (data.code !== SituacaoCadastralCPF.REGULAR) {
        throw new Error(`Irregular Document. Status: ${data.description}`);
      }
      return {
        status: `${data.code}`,
        description: `${data.description}`,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  private async verifyCNPJinSERPRO(
    document: string
  ): Promise<{ status: string; description: string }> {
    try {
      const response = await (await cnpjAPI()).get(`/${document}`);
      if (response.status === 404) {
        throw new Error('Invalid Document');
      }
      const {
        ni,
        data_abertura,
        nome_empresarial,
        nome_fantasia,
        cnae_principal,
        natureza_juridica,
        endereco,
        situacao_cadastral,
        situacao_especial,
        orgao,
        tipo_estabelecimento,
        correio_eletronico,
        capital_social,
        porte,
        telefones,
        nome_orgao,
        ente_federativo,
      }: ResponseCNPJInterface = response.data;
      let reasonDescription;
      switch (situacao_cadastral.codigo) {
        case SituacaoCadastralCNPJ.ATIVA:
          reasonDescription = situacao_cadastral.motivo || 'ativa';
          break;
        case SituacaoCadastralCNPJ.BAIXADA:
          reasonDescription = situacao_cadastral.motivo || 'baixada';
          break;
        case SituacaoCadastralCNPJ.INAPTA:
          reasonDescription = situacao_cadastral.motivo || 'inapta';
          break;
        case SituacaoCadastralCNPJ.NULA:
          reasonDescription = situacao_cadastral.motivo || 'nula';
          break;
        case SituacaoCadastralCNPJ.SUSPENSA:
          reasonDescription = situacao_cadastral.motivo || 'suspensa';
          break;
        default:
          break;
      }
      // @ts-ignore
      const data: DocumentsBureau = {
        type: DocumentType.CNPJ,
        document: ni,
        code: situacao_cadastral.codigo,
        description: reasonDescription || '',
        details: {
          data_abertura,
          nome_empresarial,
          nome_fantasia,
          cnae_principal,
          natureza_juridica,
          endereco,
          situacao_especial,
          orgao,
          tipo_estabelecimento,
          correio_eletronico,
          capital_social,
          porte,
          telefones,
          nome_orgao,
          ente_federativo,
          situacao_cadastral: situacao_cadastral.data,
        },
        consulted: this.qtyConsult + 1,
      };
      if (this.alreadyExists) {
        await update(this.cpfcnpj.id, data);
      } else {
        await create(data);
      }

      if (data.code !== SituacaoCadastralCNPJ.ATIVA) {
        throw new Error(`Irregular Document. Status: ${data.description}`);
      }
      return {
        status: `${data.code}`,
        description: `${data.description}`,
      };
    } catch (error) {
      throw new Error(error);
    }
  }
}

export default ValidateDocumentService;

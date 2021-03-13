import { protheusAPI } from '../../../../common/lib/external_apis';
import { Events } from '../../../internal-processes/interfaces/common-enums';

interface IResellersDTO {
  A3_COD: string;
  A3_NOME: string;
  A3_END: string;
  A3_BAIRRO: string;
  A3_MUN: string;
  A3_EST: string;
  A3_CEP: string;
  A3_DDDTEL: string;
  A3_TEL: string;
  A3_CGC: string;
  A3_INSCR: string;
  A3_INSCRM: string;
  A3_CARGO: string;
  A3_DDI: string;
  A3_CEL: string;
  A3_XAGN: string;
  A3_XCC: string;
  A3_XLOGIN: string;
}

class AddResellerService {
  private resellers: Array<IResellersDTO>;

  public async execute(resellers: string): Promise<void> {
    this.resellers = JSON.parse(resellers).resellers;

    const data = {
      dados: Object.entries(this.resellers).map(item => item[1]),
    };
    try {
      await (await protheusAPI()).post(
        '/protheus-faturamento-vendedores/v1.0/ttvmpnven',
        data
      );
    } catch (error) {
      throw new Error(`Error found to event: ${Events.PROTHEUS_ADD_RESELLER}`);
    }
  }
}

export default new AddResellerService();

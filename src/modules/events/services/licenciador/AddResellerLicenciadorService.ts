import { licenciadorAPI } from '../../../../common/lib/external_apis';
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
  A3_EMAIL: string;
}

class AddResellerLicenciadorService {
  private body: IResellersDTO[];

  public async execute(body: string): Promise<void> {
    this.body = JSON.parse(body).resellers;

    const data = {
      dados: Object.entries(this.body).map(item => item[1]),
    };

    const groupId =
      process.env.ENV === 'prod'
        ? 'a00345b0-2a63-11eb-b66c-297bdfd3329e'
        : 'c3bc3bf0-f2bf-11ea-902a-935c493da985';

    try {
      for await (const reseller of data.dados) {
        const payload = {
          blocked: false,
          resellerProtheusId: reseller.A3_COD,
          userType: '2',
          userName: reseller.A3_EMAIL,
          name: `Vendedor ${reseller.A3_NOME}`,
          userGroupId: groupId,
          password: reseller.A3_CGC,
        };
        await (await licenciadorAPI()).post('/user', payload);
      }
    } catch (error) {
      throw new Error(
        `Error found to event: ${Events.LICENCIADOR_ADD_RESELLER}`
      );
    }
  }
}

export default new AddResellerLicenciadorService();

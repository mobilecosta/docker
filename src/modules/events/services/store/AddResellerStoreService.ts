import { storeAPI } from '../../../../common/lib/external_apis';
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

class AddResellerStoreService {
  private body: IResellersDTO[];

  public async execute(body: string): Promise<void> {
    this.body = JSON.parse(body).resellers;

    const data = {
      dados: Object.entries(this.body).map(item => item[1]),
    };

    try {
      for await (const reseller of data.dados) {
        const payload = [
          {
            codigo: reseller.A3_COD,
            email: `${reseller.A3_XLOGIN}@email.com`,
            nome: `Vendedor ${reseller.A3_NOME}`,
            url_loja: reseller.A3_NOME.replace(/ /g, '_').toLowerCase(),
            cnpjcanal: reseller.A3_CGC,
          },
        ];
        await (await storeAPI()).post(
          '/beehive/transform-notify-seller',
          payload
        );
      }
    } catch (error) {
      throw new Error(`Error found to event: ${Events.STORE_ADD_RESELLER}`);
    }
  }
}

export default new AddResellerStoreService();

interface Vencimento {
  dia: string;
  mes: string;
  ano: string;
}
export const messages = {
  sms: {
    requestPIN: (pin: number): string => {
      return `Seu codigo de verificacao e ${pin}.`;
    },
    billCreated: (
      customerName: string,
      { dia, mes, ano }: Vencimento,
      valor: string,
      type: string,
      detail: string
    ): string => {
      let informacao;
      const boletoName =
        process.env.ENV === 'prod' ? 'online_bank_slip' : 'bank_slip';
      if (type === boletoName) {
        informacao = `Boleto ${detail}`;
      } else {
        informacao = `Cartão de crédito ${detail}`;
      }
      // const name = customerName
      //   .split(' ')
      //   .slice(0, -(customerName.split(' ').length - 1))
      //   .join(' ');
      return `Olá ${customerName},
      Segue abaixo os dados da sua conta referente a assinatura do Sistema Eleve com referência ${mes}/${ano} , vencimento em ${dia}/${mes}/${ano} e valor de R$ ${valor}.
      ${informacao}
      Lembre-se que você pode a qualquer momento trocar a forma de pagamento ou solicitar uma 2ª via pelo próprio produto no menu "Minha Conta".

      Até mais.`;
    },
    billPaid: (customerName: string, { mes, ano }: Vencimento): string => {
      return `Ola ${customerName},
      Detectamos o pagamento da sua assinatura do Sistema Eleve com referencia ${mes}/${ano}.
      Obrigado e ate mais.`;
    },
  },
};

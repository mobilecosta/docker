import { SES } from 'aws-sdk';

class MailMessage {
  private ses: SES;

  constructor() {
    if (`${process.env.ENV}` === 'local') {
      this.ses = new SES({
        region: `${process.env.AWS_REGION}`,
        endpoint: 'http://localhost:9001',
      });
    } else {
      this.ses = new SES({
        region: `${process.env.AWS_REGION}`,
      });
    }
  }

  public async sendMail(subject: string, html: string, to: string) {
    const HTML_TEMPLATE = `
<h1>Confirme seu email!</h1>

<p>Olá {nome}!</p>

<p>Para confirmar seu email basta clicar no link abaixo: </p>
<a href="{link}{hash}">{link}{hash}</a>

<p>Atenciosamente,</p>
`;

    // eslint-disable-next-line @typescript-eslint/camelcase
    const email_template_html = HTML_TEMPLATE.replace('{nome}', 'Adalton')
      .replace(/\{link\}/g, 'teste link')
      .replace(/\{hash\}/g, 'teste hash');

    const params = {
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            // eslint-disable-next-line @typescript-eslint/camelcase
            Data: email_template_html,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: 'Email de confirmação',
        },
      },
      Source: process.env.EMAIL_FROM || 'no-reply@totvs.com.br',
    };

    return this.ses.sendEmail(params).promise();
  }
}

export default MailMessage;

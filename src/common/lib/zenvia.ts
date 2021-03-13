import { zenviaAPI } from './external_apis';

const zenvia = require('@zenvia/zenvia-sms-core').api;

zenvia.setCredentials(
  `${process.env.ZENVIA_KEY}`,
  `${process.env.ZENVIA_TOKEN}`
);

/* Send unique short and long SMS example
 */

export const sendSMS = async (to: string, msg: string): Promise<any> => {
  const data = {
    sendSmsRequest: {
      from: 'TOTVS',
      to,
      msg,
    },
  };
  const response = await zenviaAPI().post('/send-sms', data);

  if (response.status > 201) {
    throw new Error('SMS Message not sent');
  }
  console.info(response.data);
  return response;
};

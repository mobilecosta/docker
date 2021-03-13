/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/ban-ts-ignore */
import axios from 'axios';

interface Notify {
  eventId: string;
  message?: string;
  cards?: Array<Record<string, any>>;
}

export const notifyByText = ({ eventId, message }: Notify) => {
  console.log('GoogleChat.notify', eventId, message);
  try {
    const data = { text: `${message}` };
    const headers = { 'Content-Type': 'application/json charset=UTF-8' };

    return axios.post(
      `${process.env.CHAT_NOTIFY}&thread_key=${eventId}`,
      data,
      {
        headers,
      }
    );
  } catch (error) {
    console.log(`Notify googleChat error: ${error}`);
  }
};

export const notifyByCard = ({ eventId, cards }: Notify) => {
  console.log('GoogleChat.notify', eventId, cards);
  try {
    const data = { cards };
    const headers = { 'Content-Type': 'application/json charset=UTF-8' };

    return axios.post(
      `${process.env.CHAT_NOTIFY}&thread_key=${eventId}`,
      data,
      {
        headers,
      }
    );
  } catch (error) {
    console.log(`Notify googleChat error: ${error}`);
  }
};

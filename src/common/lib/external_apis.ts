/* eslint-disable @typescript-eslint/camelcase */
import axios, { AxiosInstance } from 'axios';
import * as AxiosLogger from 'axios-logger';
import { Base64 } from 'js-base64';

const storeAuthentication = async (): Promise<string> => {
  const storeAuth = axios.create({
    baseURL: `${process.env.STORE_URL}`,
    responseType: 'json',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  storeAuth.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  storeAuth.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  const response = await storeAuth.post('/security/login', {
    apiKey: `${process.env.STORE_KEY}`,
    secretKey: `${process.env.STORE_TOKEN}`,
  });
  return response.data.token;
};

export const storeAPI = async (): Promise<AxiosInstance> => {
  const authToken = await storeAuthentication();

  const instance = axios.create({
    baseURL: `${process.env.STORE_URL}`,
    responseType: 'json',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });
  instance.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  instance.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  return instance;
};

export const vindiAPI = async (): Promise<AxiosInstance> => {
  const basicToken = Base64.encode(`${process.env.VINDI_TOKEN}:''`);
  const instance = axios.create({
    baseURL: `${process.env.VINDI_URL}`,
    responseType: 'json',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basicToken}`,
    },
  });

  instance.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  instance.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  return instance;
};

export const vindiBankSlip = async (): Promise<AxiosInstance> => {
  const basicToken = Base64.encode(`${process.env.VINDI_TOKEN}:''`);
  const instance = axios.create({
    baseURL: `${process.env.VINDI_URL}`,
    responseType: 'json',
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Basic ${basicToken}`,
    },
  });

  instance.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  instance.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  return instance;
};

const serproAuthentication = async (): Promise<string> => {
  const basicToken = Base64.encode(
    `${process.env.SERPRO_KEY}:${process.env.SERPRO_SECRET}`
  );
  const serproAuth = axios.create({
    baseURL: `${process.env.SERPRO_URL}`,
    responseType: 'json',
    headers: {
      Authorization: `Basic ${basicToken}`,
    },
  });
  serproAuth.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  serproAuth.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  const response = await serproAuth.post(
    '/token?grant_type=client_credentials'
  );
  return response.data.access_token;
};

export const cnpjAPI = async (): Promise<AxiosInstance> => {
  let instance: AxiosInstance;
  if (process.env.ENV === 'prod') {
    const authToken = await serproAuthentication();
    instance = axios.create({
      baseURL: `${process.env.SERPRO_URL}/consulta-cnpj-df/v1/cnpj`,
      responseType: 'json',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });
  } else {
    instance = axios.create({
      baseURL: `${process.env.SERPRO_CNPJ_URL}`,
      responseType: 'json',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SERPRO_CNPJ_TOKEN}`,
      },
    });
  }
  instance.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  instance.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  return instance;
};

export const cpfAPI = async (): Promise<AxiosInstance> => {
  let instance;
  if (process.env.ENV === 'prod') {
    const authToken = await serproAuthentication();
    instance = axios.create({
      baseURL: `${process.env.SERPRO_URL}/consulta-cpf-df/v1/cpf`,
      responseType: 'json',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });
  } else {
    instance = axios.create({
      baseURL: `${process.env.SERPRO_CPF_URL}`,
      responseType: 'json',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SERPRO_CPF_TOKEN}`,
      },
    });
  }

  instance.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  instance.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  return instance;
};

const protheusAuthentication = async (): Promise<string> => {
  const basicToken = Base64.encode(
    `${process.env.PROTHEUS_KEY}:${process.env.PROTHEUS_TOKEN}`
  );
  const protheusAuth = axios.create({
    baseURL: `${process.env.PROTHEUS_URL}`,
    responseType: 'json',
    headers: {
      Authorization: `Basic ${basicToken}`,
    },
  });
  protheusAuth.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  protheusAuth.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  const response = await protheusAuth.post(
    '/token?grant_type=client_credentials'
  );
  return response.data.access_token;
};

export const protheusAPI = async (): Promise<AxiosInstance> => {
  const authToken = await protheusAuthentication();
  const instance = axios.create({
    baseURL: `${process.env.PROTHEUS_URL}`,
    responseType: 'json',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  instance.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  instance.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  return instance;
};

export const getIBGECities = axios.create({
  baseURL: 'https://servicodados.ibge.gov.br/api/v1/localidades',
  responseType: 'json',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const zenviaAPI = (): AxiosInstance => {
  const basicToken = Base64.encode(
    `${process.env.ZENVIA_KEY}:${process.env.ZENVIA_TOKEN}`
  );
  const instance = axios.create({
    baseURL: `${process.env.ZENVIA_URL}`,
    responseType: 'json',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basicToken}`,
    },
  });
  instance.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  instance.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  return instance;
};

const licenciadorAuthentication = async (): Promise<string> => {
  const licenciadorAuth = axios.create({
    baseURL: `${process.env.LICENCIADOR_BASE_URL}`,
    responseType: 'json',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  licenciadorAuth.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  licenciadorAuth.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  const response = await licenciadorAuth.post('/token', {
    userName: `${process.env.LICENCIADOR_USER}`,
    password: `${process.env.LICENCIADOR_PASS}`,
  });
  return response.data.token;
};

export const licenciadorAPI = async (): Promise<AxiosInstance> => {
  const authToken = await licenciadorAuthentication();

  const instance = axios.create({
    baseURL: `${process.env.LICENCIADOR_BASE_URL}`,
    responseType: 'json',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${authToken}`,
    },
  });
  instance.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  instance.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  return instance;
};

export const empoderaAPI = (): AxiosInstance => {
  const basicToken = Base64.encode(
    `${process.env.EMPODERA_KEY}:${process.env.EMPODERA_TOKEN}`
  );
  const instance = axios.create({
    baseURL: `${process.env.EMPODERA_BASE_URL}`,
    responseType: 'json',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basicToken}`,
    },
  });
  instance.interceptors.request.use(
    AxiosLogger.requestLogger,
    AxiosLogger.errorLogger
  );
  instance.interceptors.response.use(
    AxiosLogger.responseLogger,
    AxiosLogger.errorLogger
  );
  return instance;
};

export const getIbgeId = async (
  cidade: string,
  uf: string
): Promise<number> => {
  interface DataIbge {
    id: number;
    nome: string;
    microrregiao: {
      id: number;
      nome: string;
      mesorregiao: {
        id: number;
        nome: string;
        UF: {
          id: number;
          sigla: string;
          nome: string;
          regiao: {
            id: number;
            sigla: string;
            nome: string;
          };
        };
      };
    };
  }
  const response = await axios.get(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
  );
  const found = response.data.find(
    (item: DataIbge) =>
      item.nome
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') === cidade
  );
  return found.id;
};

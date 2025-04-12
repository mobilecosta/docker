ARG nome=Wagner Mobile Costa

FROM node:current-alpine3.21

ENV nome=$nome

WORKDIR /api_node

COPY package.json .

RUN npm install

COPY . .

RUN rm package-lock.json

EXPOSE 3000

CMD ["npm", "start"]
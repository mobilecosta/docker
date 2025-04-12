FROM node:current-alpine3.21

WORKDIR /api_node

COPY package.json .
COPY main.js .

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
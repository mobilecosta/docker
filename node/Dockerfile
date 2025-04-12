FROM node:current-alpine3.21

RUN npm install -g http-server

WORKDIR /usr/src/app

COPY index.html .

EXPOSE 8080

CMD ["http-server", "-p", "8080"]
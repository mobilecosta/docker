FROM alpine:latest

RUN apk add --no-cache nodejs npm

RUN npm install -g http-server

WORKDIR /usr/src/app

COPY index.html .

EXPOSE 8080

CMD ["http-server", "-p", "8080"]
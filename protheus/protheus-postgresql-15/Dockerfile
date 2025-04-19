FROM postgres:15
LABEL maintainer="Wagner Mobile Cosa"

# Porta do PostgreSQL.
EXPOSE 5432/tcp

# Senha do super-usuário postgres.
ENV POSTGRES_PASSWORD postgres
ENV CONFIG_FILE /etc/postgresql.conf
ENV LANG pt_BR.CP1252

# Prepara para usar o locale pt_BR.CP1252.
RUN localedef -i pt_BR -c -f CP1252 -A /usr/share/locale/locale.alias pt_BR.CP1252

# Copia arquivos necessários para criar o banco 'protheus'.
COPY ./root/ /

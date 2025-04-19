FROM docker.io/oraclelinux:9
LABEL maintainer="Felipe Raposo <feliperaposo@gmail.com>"

# Repositório Microsoft para o pacote ODBC do MS-SQL Server.
RUN curl https://packages.microsoft.com/config/rhel/8/prod.repo | tee /etc/yum.repos.d/mssql-release.repo

# Instala pacotes ODBC PostgreSQL.
RUN dnf -y update && ACCEPT_EULA=Y dnf install -y unixODBC postgresql-odbc msodbcsql18 && dnf clean all && rm -rf /var/cache/yum

# Copia os arquivos necessários.
COPY ./root/ /

# Configura driver ODBC PostgreSQL.
RUN cat /etc/odbcinst_psql.ini >> /etc/odbcinst.ini && rm /etc/odbcinst_psql.ini

CMD ["/dbaccess.sh"]

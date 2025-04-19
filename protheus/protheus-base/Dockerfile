FROM docker.io/oraclelinux:9-slim
LABEL maintainer="Mobile Costa <mobile.costa@gmail.com>"

# Instala o tar, usado para descompactar a SystemLoad.
RUN microdnf -y update && microdnf -y install tar xz dmidecode && microdnf clean all && rm -rf /var/cache/yum

# Porta do dbAccess.
EXPOSE 7890/tcp

# Copia os arquivos necessários.
COPY ./root/ /

# Script a ser executado ao carregar um container.
CMD ["/protheus.sh"]

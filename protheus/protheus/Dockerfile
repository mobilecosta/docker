FROM feliperaposo/protheus-base:20
LABEL maintainer="Felipe Raposo <feliperaposo@gmail.com>"

# Porta do AppServer Protheus.
EXPOSE 1234/tcp

# Porta do WebApp.
EXPOSE 4321/tcp

# Porta do help center.
EXPOSE 80/tcp

# Porta do serviço REST.
EXPOSE 8080/tcp

# Copia os arquivos necessários.
COPY ./root/ /

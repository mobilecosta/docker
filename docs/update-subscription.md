```mermaid
sequenceDiagram
    autonumber
    STORE->>VINDI: Troca Perfil de Pagamento
    STORE->>AWS: Troca Metodo de Pagamento
    Note right of AWS: Processamentos Internos
    AWS->>VINDI: Realiza Troca do Método de Pagamento
    STORE->>AWS: Atualiza Assinatura (UPGRADE)
    AWS->>VINDI: Gera Fatura Avulsa
    VINDI-->>AWS: Fatura Paga
    loop Notify
      AWS->>STORE: Notify
      AWS->>PRODUTO: Notify
    end
    AWS->>VINDI: ?Como trocar preco?
```
```mermaid
journey
    title New Customer Process (DataBUS)
    section Receive New Customer
      Validate Customer: 5: Internal
      Validate Customer SERPRO: 5: External Interface
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me
```
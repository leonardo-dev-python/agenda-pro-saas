## Agenda Pro - Modelo comercial inicial

### Estrutura recomendada

- Modelo: assinatura mensal SaaS do Agenda Pro
- Cliente pagante: proprietario do salao, barbearia ou studio
- Provedor sugerido para a primeira integracao: Asaas
- Sem subconta por salao na V1

### Planos iniciais

#### Starter

- Preco sugerido: R$ 79/mensal
- Ideal para: operacoes pequenas com um estabelecimento
- Inclui:
  - 1 estabelecimento
  - cadastro de equipe e servicos
  - agenda interna
  - link publico de agendamento
  - Google Agenda

#### Professional

- Preco sugerido: R$ 149/mensal
- Ideal para: saloes em crescimento e operacoes com mais equipe
- Inclui:
  - tudo do Starter
  - mais profissionais
  - melhor acompanhamento de clientes
  - prioridade na evolucao comercial

#### Multiunidade

- Preco sugerido: sob consulta
- Ideal para: redes, franquias ou operacoes com mais de uma unidade
- Inclui:
  - mais de um estabelecimento
  - onboarding assistido
  - fluxo comercial consultivo

### Trial

- Duracao sugerida: 14 dias
- Entrada: proprietario cria conta e comeca a usar sem pagar
- Objetivo do trial:
  - cadastrar o estabelecimento
  - cadastrar equipe e servicos
  - conectar Google Agenda
  - compartilhar o link de agendamento

### Regra de acesso

- `trialing`: acesso completo
- `active`: acesso completo
- `past_due`: painel em modo leitura e novos agendamentos bloqueados
- `canceled`: painel em modo leitura e novos agendamentos bloqueados
- trial expirado: painel em modo leitura e novos agendamentos bloqueados

### Fluxo comercial recomendado

1. proprietario entra na landing
2. escolhe um plano
3. cria conta
4. inicia teste gratis
5. recebe comunicacao de fim do trial
6. efetiva pagamento
7. conta segue ativa

### Proxima integracao

- Criar conta no Asaas
- Criar checkout de assinatura mensal
- Salvar `customerId` e referencia da assinatura
- Receber webhook para atualizar:
  - `active`
  - `past_due`
  - `canceled`

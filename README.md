# Agenda Pro

Plataforma SaaS de agendamento online para salões, barbearias e negócios de beleza e bem-estar.

## Estado atual

O produto já está estruturado para:

- landing comercial pública
- checkout público com assinatura mensal
- cobrança recorrente via Asaas
- painel do proprietário
- página pública de agendamento
- integração com Google Agenda
- cancelamento de assinatura

Hoje o projeto está em ponto de iniciar venda assistida para os primeiros clientes.

## Endereços principais

- Landing: [https://agenda-pro-saas-production.up.railway.app/](https://agenda-pro-saas-production.up.railway.app/)
- Checkout: [https://agenda-pro-saas-production.up.railway.app/checkout](https://agenda-pro-saas-production.up.railway.app/checkout)
- Assinatura: [https://agenda-pro-saas-production.up.railway.app/assinatura](https://agenda-pro-saas-production.up.railway.app/assinatura)
- Painel do proprietário: [https://agenda-pro-saas-production.up.railway.app/estabelecimento](https://agenda-pro-saas-production.up.railway.app/estabelecimento)
- Página pública do cliente: [https://agenda-pro-saas-production.up.railway.app/cliente](https://agenda-pro-saas-production.up.railway.app/cliente)

## Fluxos principais

### Comercial

- landing com proposta de valor do produto
- checkout com plano único
- contratação por boleto recorrente ou cartão de crédito recorrente
- páginas legais publicadas

### Operação do estabelecimento

- cadastro do salão
- cadastro de serviços
- cadastro de equipe
- cadastro de clientes
- agenda operacional
- link público para agendamento

### Assinatura

- criação de assinatura no Asaas
- visualização da cobrança pendente
- cancelamento pelo próprio cliente
- bloqueio operacional quando a assinatura não estiver válida

## Contato oficial

- `contato@lrtechsolutions.com`

## Documentação útil

- [docs/launch-readiness.md](C:\Users\Leona\OneDrive\Documentos\New project\app_treino\docs\launch-readiness.md)
- [docs/first-customer-runbook.md](C:\Users\Leona\OneDrive\Documentos\New project\app_treino\docs\first-customer-runbook.md)
- [docs/railway-deploy.md](C:\Users\Leona\OneDrive\Documentos\New project\app_treino\docs\railway-deploy.md)
- [docs/google-oauth-setup.md](C:\Users\Leona\OneDrive\Documentos\New project\app_treino\docs\google-oauth-setup.md)
- [docs/commercial-model.md](C:\Users\Leona\OneDrive\Documentos\New project\app_treino\docs\commercial-model.md)

## Ambiente local

### Subir o servidor

```bash
npm start
```

### Rotas locais mais usadas

- `http://localhost:4180/`
- `http://localhost:4180/checkout`
- `http://localhost:4180/estabelecimento`
- `http://localhost:4180/cliente`

## Banco e deploy

### Provider

O projeto suporta:

- `REPOSITORY_PROVIDER=json`
- `REPOSITORY_PROVIDER=prisma`

Em produção, o fluxo está preparado para `Prisma + PostgreSQL`.

### Railway

O deploy atual usa:

- `npm start`
- `railway.json`
- `DATABASE_URL` via serviço PostgreSQL
- `PORT` fornecida pelo ambiente

Passo a passo:

- [docs/railway-deploy.md](C:\Users\Leona\OneDrive\Documentos\New project\app_treino\docs\railway-deploy.md)

## Integrações

### Google Agenda

- OAuth estruturado e funcional no painel
- sincronização de eventos preparada no backend

### Asaas

- ambiente de produção configurado
- assinatura recorrente por boleto e cartão
- webhook protegido por token

## Próximo passo recomendado

Se a meta agora for começar a vender:

1. revisar a versão publicada uma última vez
2. usar o runbook dos primeiros clientes
3. começar venda assistida
4. observar objeções, onboarding e cancelamento

## Observação importante

O produto já tem base comercial e operacional real, mas o melhor cenário agora é começar com:

- indicação
- abordagem direta
- fechamento assistido

Antes de abrir tráfego mais amplo, ainda vale uma última rodada de refinamento comercial e operacional.

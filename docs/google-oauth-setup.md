# Configuracao do Google OAuth

Este projeto ja possui a base tecnica para sincronizar agendamentos com a Google Agenda. Para ativar a autorizacao real, siga esta sequencia:

## 1. Criar credenciais no Google Cloud

- Crie ou selecione um projeto no Google Cloud.
- Ative a API do Google Calendar para esse projeto.
- Crie credenciais OAuth para aplicacao web.
- Cadastre a URL de callback do ambiente:
  - local: `http://localhost:4173/api/integrations/google/callback`
  - ajuste a porta conforme a instancia que estiver usando

## 2. Preencher variaveis de ambiente

No ambiente do servidor, configure:

```env
GOOGLE_CLIENT_ID=seu-client-id-real
GOOGLE_CLIENT_SECRET=seu-client-secret-real
GOOGLE_REDIRECT_URI=http://localhost:4173/api/integrations/google/callback
```

Observacoes:

- `GOOGLE_REDIRECT_URI` precisa bater exatamente com a URI cadastrada nas credenciais OAuth.
- O sistema identifica credenciais de teste ou placeholder e bloqueia a autorizacao real nesses casos.

## 3. Reiniciar a aplicacao

- Reinicie o backend depois de atualizar as variaveis.
- A API `GET /api/integrations/google` deve passar a responder com:
  - `oauthConfigured: true`
  - `oauthUsable: true`
  - `oauthMode: "ready"`

## 4. Conectar a agenda do salao

No painel administrativo:

- abra a secao `Google Agenda`
- informe o e-mail da conta Google
- informe o `calendarId` desejado, normalmente `primary`
- clique em `Salvar conexao`

## 5. Autorizar a conta

- clique em `Autorizar no Google`
- conclua o login na conta Google correta
- permita o acesso solicitado
- volte ao painel

Quando a autorizacao for concluida:

- a conexao deve indicar `OAuth concluido`
- novos agendamentos devem sair de `pending_oauth` para `synced` quando a criacao do evento funcionar

## 6. Validar o fluxo

Checklist sugerido:

- criar um agendamento publico
- confirmar no painel se o `googleSync.status` mudou
- atualizar ou cancelar o agendamento
- conferir se o evento refletiu a alteracao na agenda

## Problemas comuns

- `OAuth do Google ainda nao esta configurado no ambiente.`
  - faltam variaveis de ambiente

- `OAuth do Google esta em modo de teste.`
  - o ambiente ainda usa credenciais placeholder

- `pending_oauth`
  - a agenda foi salva, mas a conta ainda nao concluiu a autorizacao

- `sync_error`
  - a autorizacao existe, mas houve falha ao criar, atualizar ou cancelar o evento

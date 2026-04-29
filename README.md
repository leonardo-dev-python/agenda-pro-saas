# AgendaPro Beauty

Base local para evoluir uma plataforma de agendamento para saloes de beleza e barbearias.

Hoje o projeto ainda carrega parte de um prototipo anterior, mas ja possui uma estrutura util de:

- autenticacao do painel;
- cadastro de empresa, servicos e profissionais;
- agenda com bloqueio de conflitos;
- portal publico de agendamento;
- servidor HTTP local sem dependencias pesadas.

Nesta etapa, a fundacao tecnica da V1 foi formalizada para o novo produto com:

- schema inicial em Prisma/PostgreSQL;
- arquitetura da API da V1;
- plano de migracao da base atual.

## Como iniciar a base atual

1. Abra um terminal nesta pasta.
2. Execute `npm start`.
3. Acesse [http://localhost:4173](http://localhost:4173).

## Como iniciar com Prisma Dev

1. Execute `npx prisma dev -n app-treino -d`.
2. Rode `npx prisma dev ls` e copie a `DATABASE_URL` `prisma+postgres://...` exibida.
3. Exporte essa `DATABASE_URL` no terminal atual.
4. Execute `npm run prisma:push`.
5. Execute `npm run prisma:seed`.
6. Inicie o servidor com `REPOSITORY_PROVIDER=prisma`.

## Como publicar no Railway

O projeto ja esta preparado para deploy no Railway com:

- `npm start` como comando de execucao;
- `PORT` lida automaticamente do ambiente;
- `railway.json` com `healthcheck` em `/api/health`;
- `Prisma + PostgreSQL` via `DATABASE_URL`.

Passo a passo completo:

- [docs/railway-deploy.md](C:\Users\Leona\OneDrive\Documentos\New project\app_treino\docs\railway-deploy.md)

## Google Agenda na fase atual

- O painel ja permite salvar e remover uma conexao manual de Google Agenda.
- `GET /api/integrations/google` retorna status, `oauthConfigured`, `oauthUsable`, `oauthMode`, `oauthMessage` e `redirectUri`.
- `POST /api/integrations/google/connect` salva a agenda principal do salao.
- `POST /api/integrations/google/oauth/start` abre o fluxo de autorizacao OAuth do Google.
- `GET /api/integrations/google/callback` conclui a autorizacao e persiste os tokens da conexao ativa.
- `DELETE /api/integrations/google` desconecta a agenda ativa.
- Os agendamentos agora carregam estado de sincronizacao com Google Agenda (`not_configured`, `pending_oauth`, `pending_create`, `pending_update`, `pending_cancel`, `synced`, `sync_error`).
- O OAuth e a sincronizacao real ja estao estruturados no backend, mas a validacao fim a fim ainda depende de uma conta Google real e da estabilidade do runtime local do Prisma Dev.
- O passo a passo para ligar credenciais reais esta em [docs/google-oauth-setup.md](C:\Users\Leona\OneDrive\Documentos\New project\app_treino\docs\google-oauth-setup.md).

## Login padrao do prototipo atual

- Email: `owner@agendapro.local`
- Senha: `agenda123`

## Fluxos principais existentes

- Home comercial:
  landing do prototipo atual.
- Area administrativa:
  edicao de empresa, servicos, profissionais, clientes e agenda.
- Portal publico:
  link publico para reserva online, separado da gestao interna.

## Estrutura

- [server.mjs](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/server.mjs): servidor HTTP, autenticacao e API.
- [app.js](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/app.js): interface administrativa e homepage.
- [client.js](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/client.js): portal publico de agendamento.
- [styles.css](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/styles.css): design responsivo.
- [data/database.json](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/data/database.json): base local persistida em JSON.
- [lib/auth.js](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/lib/auth.js): autenticacao, hash e sessao.
- [lib/database.js](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/lib/database.js): gateway do banco local e seed inicial.
- [lib/http.js](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/lib/http.js): helpers HTTP.
- [lib/salon-domain.js](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/lib/salon-domain.js): regras de negocio, sanitizacao e disponibilidade.
- [lib/repositories/index.js](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/lib/repositories/index.js): factory do provider de persistencia.
- [lib/repositories/json-app-repository.js](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/lib/repositories/json-app-repository.js): implementacao atual baseada em JSON.
- [lib/repositories/prisma-app-repository.js](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/lib/repositories/prisma-app-repository.js): ponto de entrada para a futura migracao ao Prisma.
- [prisma/schema.prisma](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/prisma/schema.prisma): modelo inicial do banco para a V1.
- [docs/v1-architecture.md](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/docs/v1-architecture.md): arquitetura funcional e tecnica da primeira versao.
- [docs/migration-plan.md](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/docs/migration-plan.md): roteiro de migracao do prototipo atual.
- [docs/api-contract.md](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/docs/api-contract.md): contrato inicial das rotas da V1.
- [.env.example](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/.env.example): variaveis de ambiente esperadas para a nova fase.

## Proximo passo recomendado

1. Conectar o projeto a um banco PostgreSQL.
2. Instalar dependencias e gerar o client do Prisma.
3. Migrar o servidor atual para uma camada de repositorio/servico.
4. Adaptar o dominio visual e textual do prototipo para saloes.
5. Integrar Google Calendar e WhatsApp.

## Observacoes tecnicas

- Stack local sem dependencias externas para execucao imediata.
- Banco atual ainda em arquivo JSON.
- O projeto agora suporta selecao de provider via `REPOSITORY_PROVIDER`.
- Use `REPOSITORY_PROVIDER=json` para a base local atual.
- Use `REPOSITORY_PROVIDER=prisma` quando o banco PostgreSQL estiver pronto e o repositorio Prisma for o provider ativo.
- O schema novo aponta para `PostgreSQL` via `Prisma`.
- A migracao inicial esta em [prisma/migrations/20260428190000_init/migration.sql](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/prisma/migrations/20260428190000_init/migration.sql).
- O seed local do Prisma esta em [prisma/seed.mjs](C:/Users/Leona/OneDrive/Documentos/New%20project/app_treino/prisma/seed.mjs).
- Notificacoes ficam registradas em fila local, com estrutura preparada para integracao real de WhatsApp.

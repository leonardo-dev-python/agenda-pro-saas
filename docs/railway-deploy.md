# Publicacao no Railway

Este projeto ja esta preparado para publicar no Railway com `Node.js + PostgreSQL`.

## 1. Subir o codigo

1. Crie um repositorio no GitHub para o projeto.
2. Envie a pasta `app_treino` para esse repositorio.
3. Garanta que o arquivo `.env` **nao** seja enviado.

## 2. Criar o projeto no Railway

1. Entre em [railway.com](https://railway.com/).
2. Crie sua conta e conecte o GitHub.
3. Clique em `New Project`.
4. Escolha `Deploy from GitHub repo`.
5. Selecione o repositorio do `Agenda Pro`.

## 3. Criar o PostgreSQL

1. Dentro do mesmo projeto, clique em `New`.
2. Escolha `Database`.
3. Escolha `PostgreSQL`.
4. O Railway vai criar automaticamente a variavel `DATABASE_URL`.

## 4. Configurar variaveis de ambiente

No servico da aplicacao, configure:

- `JWT_SECRET`
- `REPOSITORY_PROVIDER=prisma`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `ASAAS_ENV=production` ou `sandbox`
- `ASAAS_API_URL`
- `ASAAS_API_KEY`

### Valores sugeridos

- `GOOGLE_REDIRECT_URI=https://seu-dominio-ou-url-railway/api/integrations/google/callback`
- `ASAAS_API_URL=https://api.asaas.com/v3`

Use `https://api-sandbox.asaas.com/v3` apenas enquanto estiver testando no sandbox.

## 5. Primeiro deploy

1. Rode o deploy inicial pelo Railway.
2. Quando a aplicacao subir, abra a URL publica.
3. Verifique:
   - `/api/health`
   - `/`
   - `/criar-conta`
   - `/estabelecimento`

## 6. Aplicar schema Prisma

Depois que o banco e a app estiverem criados, rode no shell do Railway:

```bash
npx prisma db push
node prisma/seed.mjs
```

Isso cria as tabelas e o seed inicial.

## 7. Ajustar Google OAuth

No Google Cloud, troque a Redirect URI local pela publica:

```text
https://seu-dominio-ou-url-railway/api/integrations/google/callback
```

## 8. Ajustar webhook do Asaas

No Asaas, configure o webhook para:

```text
https://seu-dominio-ou-url-railway/api/webhooks/asaas
```

## 9. Sequencia recomendada de virada

1. Publicar no Railway
2. Aplicar `prisma db push`
3. Rodar `seed`
4. Validar login e painel
5. Atualizar Google OAuth
6. Atualizar webhook do Asaas
7. Testar criacao de assinatura e retorno de webhook

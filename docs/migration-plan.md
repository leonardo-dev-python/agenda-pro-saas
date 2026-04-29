# Plano de migracao da base atual

## Contexto

A base atual foi criada como um prototipo funcional para operacoes veterinarias. A estrutura de agenda, profissionais, servicos e portal publico ja resolve parte do problema tecnico e pode ser reaproveitada.

## O que pode ser reaproveitado

- autenticacao simples do painel;
- CRUD de servicos;
- CRUD de profissionais;
- listagem e criacao de agendamentos;
- calculo de disponibilidade;
- painel administrativo;
- portal publico.

## O que precisa mudar primeiro

### Dominio

Substituir conceitos de clinica veterinaria por salao:

- `company` -> `salon`
- `client` permanece, mas com foco humano
- remover referencias a pet, tutor, vacina, consulta clinica
- ajustar categorias de servico para beleza e barbearia

### Persistencia

Trocar `data/database.json` por `PostgreSQL` com `Prisma`.

Motivos:

- concorrencia melhor;
- historico mais confiavel;
- evolucao para SaaS;
- integracoes mais seguras;
- consultas de agenda mais robustas.

### Integracoes

Adicionar componentes reais para:

- Google Calendar
- WhatsApp

## Fases praticas da migracao

### Fase 1. Consolidar dominio

- atualizar nomes e contratos do backend;
- definir enums de status;
- alinhar schema do banco com o novo produto.

### Fase 2. Persistencia real

- criar `prisma/schema.prisma`;
- configurar `DATABASE_URL`;
- substituir leitura/escrita em JSON por camada de repositorio.

### Fase 3. Servicos de dominio

Extrair modulos:

- `availability-service`
- `appointment-service`
- `professional-service`
- `notification-service`
- `calendar-sync-service`

### Fase 4. Frontend

- ajustar textos e rotas para o universo de salao;
- adaptar formulários para o novo contrato;
- manter o portal publico simples.

### Fase 5. Integracoes externas

- criar sincronizacao real com Google;
- criar fila de envio de lembrete por WhatsApp;
- adicionar logs e reprocessamento.

## Criticos de migracao

- nao perder o fluxo publico que ja funciona;
- preservar a logica de conflito ao migrar o banco;
- evitar acoplamento direto entre API HTTP e regra de agenda;
- preparar o produto para multi-tenant mesmo com um salao por conta na V1.

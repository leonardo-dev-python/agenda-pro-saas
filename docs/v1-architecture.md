# Arquitetura V1 - Plataforma de Salao

## Objetivo

Entregar uma V1 que permita:

- cadastro de um salao por conta;
- cadastro de profissionais, servicos e horarios;
- agendamento publico sem login do cliente;
- lembrete por WhatsApp;
- sincronizacao com Google Agenda;
- operacao diaria pelo painel administrativo.

## Decisoes de escopo da V1

- Um salao por conta.
- Um Google Calendar principal por salao na primeira fase.
- Cliente agenda com `nome completo` e `telefone`.
- Sem pagamento online na V1.
- WhatsApp usado primeiro para lembrete, nao para fluxo conversacional de confirmacao.
- Agenda por profissional.
- Servico com duracao fixa, com opcao de override por profissional.

## Stack recomendada

- Frontend: `Next.js`
- Backend: `Node.js`
- ORM: `Prisma`
- Banco: `PostgreSQL`
- Autenticacao: sessao ou JWT para area administrativa
- Integracoes:
  - `Google Calendar API`
  - `WhatsApp Business API` ou provedor compatível

## Modulos do sistema

### 1. Identidade e multi-tenant

Responsabilidades:

- autenticar usuarios internos;
- isolar dados por salao;
- controlar perfis como proprietario, gerente e recepcao.

### 2. Catalogo operacional

Responsabilidades:

- manter dados do salao;
- cadastrar profissionais;
- cadastrar servicos;
- vincular quais profissionais executam cada servico.

### 3. Motor de disponibilidade

Responsabilidades:

- calcular horarios livres;
- respeitar agenda do profissional;
- respeitar duracao do servico;
- respeitar pausas, folgas e bloqueios;
- impedir conflito de horario.

### 4. Agendamento publico

Responsabilidades:

- expor catalogo do salao;
- exibir disponibilidade;
- receber nome e telefone do cliente;
- criar agendamento.

### 5. Operacao administrativa

Responsabilidades:

- listar agendamentos;
- confirmar, cancelar ou remarcar;
- acompanhar atendimentos do dia;
- registrar observacoes internas.

### 6. Integracoes

Responsabilidades:

- criar e atualizar eventos no Google Calendar;
- agendar e registrar lembretes de WhatsApp;
- manter historico de envio e falha.

## Principais regras de negocio

### Disponibilidade

- Cada servico tem duracao padrao.
- Um profissional pode ter duracao ou preco customizado por servico.
- Horario livre depende da combinacao entre:
  - agenda base do profissional;
  - pausas;
  - bloqueios;
  - agendamentos ativos;
  - antecedencia minima;
  - granularidade de slot.

### Agendamento

- O cliente nao precisa criar conta.
- O telefone deve ser validado e normalizado.
- O sistema salva snapshot do nome do cliente, nome do servico e preco no momento do agendamento.
- Cancelamentos e remarcacoes precisam deixar trilha.

### Integracoes

- Ao criar agendamento confirmado:
  - criar evento no Google Calendar.
- Ao remarcar:
  - atualizar evento correspondente.
- Ao cancelar:
  - remover ou marcar o evento como cancelado.
- Lembretes de WhatsApp devem ser enfileirados e registrados.

## Fluxo principal de agendamento

1. Cliente acessa a pagina publica do salao.
2. Seleciona servico.
3. Seleciona profissional.
4. Consulta disponibilidade por data.
5. Informa nome completo e telefone.
6. Sistema cria ou reaproveita o cliente.
7. Sistema cria o agendamento.
8. Sistema enfileira lembrete.
9. Sistema sincroniza evento com Google Agenda.

## Estrutura inicial da API

### Publica

- `GET /api/public/catalog`
- `GET /api/public/availability`
- `POST /api/public/appointments`

### Administrativa

- `POST /api/auth/login`
- `GET /api/auth/session`
- `GET /api/dashboard`
- `GET /api/salon`
- `PUT /api/salon`
- `GET /api/services`
- `POST /api/services`
- `PUT /api/services/:id`
- `DELETE /api/services/:id`
- `GET /api/professionals`
- `POST /api/professionals`
- `PUT /api/professionals/:id`
- `DELETE /api/professionals/:id`
- `GET /api/appointments`
- `POST /api/appointments`
- `PUT /api/appointments/:id`
- `POST /api/appointments/:id/cancel`
- `POST /api/appointments/:id/reschedule`
- `GET /api/integrations/google`
- `POST /api/integrations/google/connect`
- `GET /api/notifications`

## Ordem recomendada de implementacao

1. Migrar modelo de dados para Prisma/PostgreSQL.
2. Criar repositorios/servicos de dominio.
3. Extrair o motor de disponibilidade do servidor atual.
4. Implementar API administrativa e publica sobre o novo schema.
5. Migrar o frontend atual para os novos contratos.
6. Integrar Google Calendar.
7. Integrar lembretes via WhatsApp.

## Criticos tecnicos

- normalizacao de horario e timezone;
- prevencao de conflito em remarcacao concorrente;
- snapshot de preco e duracao;
- protecao de dados por salao;
- armazenamento seguro de tokens Google;
- logs de notificacao e falhas.

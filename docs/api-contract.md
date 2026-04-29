# Contrato inicial da API - V1

## Convencoes

- Todas as respostas usam JSON.
- Datas completas usam ISO 8601.
- Horarios de agenda usam timezone do salao.
- Endpoints administrativos exigem autenticacao.
- O cliente final nao cria conta.

## Publica

### `GET /api/public/catalog`

Retorna o catalogo publico do salao.

Resposta:

```json
{
  "salon": {
    "id": "salon_123",
    "name": "Studio Aura",
    "slug": "studio-aura",
    "phone": "11999990000"
  },
  "services": [
    {
      "id": "srv_1",
      "name": "Corte feminino",
      "durationMin": 60,
      "priceCents": 12000
    }
  ],
  "professionals": [
    {
      "id": "pro_1",
      "name": "Marina",
      "serviceIds": ["srv_1"]
    }
  ]
}
```

### `GET /api/public/availability`

Query params:

- `serviceId`
- `professionalId`
- `date`

Resposta:

```json
{
  "date": "2026-05-02",
  "slots": [
    {
      "startAt": "2026-05-02T09:00:00-03:00",
      "endAt": "2026-05-02T10:00:00-03:00"
    }
  ]
}
```

### `POST /api/public/appointments`

Payload:

```json
{
  "serviceId": "srv_1",
  "professionalId": "pro_1",
  "startAt": "2026-05-02T09:00:00-03:00",
  "client": {
    "fullName": "Ana Souza",
    "phone": "11999998888",
    "notes": "Primeira visita"
  }
}
```

Resposta:

```json
{
  "appointment": {
    "id": "apt_1",
    "status": "CONFIRMED",
    "startAt": "2026-05-02T09:00:00-03:00",
    "endAt": "2026-05-02T10:00:00-03:00",
    "googleSync": {
      "status": "pending_oauth",
      "calendarId": "primary"
    }
  }
}
```

## Auth

### `POST /api/auth/login`

Payload:

```json
{
  "email": "owner@studioaura.com",
  "password": "senha"
}
```

Resposta:

```json
{
  "token": "jwt",
  "user": {
    "id": "usr_1",
    "name": "Leona",
    "role": "OWNER"
  }
}
```

## Servicos

### `GET /api/services`

Resposta:

```json
{
  "services": [
    {
      "id": "srv_1",
      "name": "Corte feminino",
      "durationMin": 60,
      "priceCents": 12000,
      "onlineBooking": true
    }
  ]
}
```

### `POST /api/services`

Payload:

```json
{
  "service": {
    "name": "Escova",
    "slug": "escova",
    "durationMin": 45,
    "priceCents": 7000,
    "onlineBooking": true
  }
}
```

## Profissionais

### `GET /api/professionals`

Resposta:

```json
{
  "professionals": [
    {
      "id": "pro_1",
      "name": "Marina",
      "serviceIds": ["srv_1"],
      "schedules": [
        {
          "weekday": 1,
          "startTime": "09:00",
          "endTime": "18:00"
        }
      ]
    }
  ]
}
```

### `POST /api/professionals`

Payload:

```json
{
  "professional": {
    "name": "Marina",
    "slug": "marina",
    "specialty": "Coloracao",
    "serviceIds": ["srv_1"],
    "schedules": [
      {
        "weekday": 1,
        "startTime": "09:00",
        "endTime": "18:00",
        "breaks": [
          {
            "startTime": "12:00",
            "endTime": "13:00"
          }
        ]
      }
    ]
  }
}
```

## Agendamentos administrativos

### `GET /api/appointments`

Filtros esperados:

- `from`
- `to`
- `professionalId`
- `status`

### `POST /api/appointments`

Mesmo contrato da rota publica, com possibilidade de campos extras:

- `status`
- `internalNotes`

As respostas administrativas de agendamento tambem podem incluir:

- `googleSync.status`
- `googleSync.calendarId`
- `googleSync.eventId`
- `googleSync.syncedAt`
- `googleSync.error`

### `POST /api/appointments/:id/cancel`

Payload:

```json
{
  "reason": "Cliente pediu cancelamento"
}
```

### `POST /api/appointments/:id/reschedule`

Payload:

```json
{
  "startAt": "2026-05-02T11:00:00-03:00"
}
```

## Integracoes

### `GET /api/integrations/google`

Retorna status da conexao Google do salao.

### `POST /api/integrations/google/connect`

Responsavel por iniciar ou concluir o fluxo OAuth.

### `POST /api/integrations/google/oauth/start`

Prepara a conexao ativa e devolve a URL de autorizacao do Google.

### `GET /api/integrations/google/callback`

Endpoint de retorno do OAuth do Google. Atualiza os tokens da conexao ativa do salao.

### `DELETE /api/integrations/google`

Desconecta a agenda Google ativa do salao.

## Observacoes de implementacao

- Os contratos administrativos devem trabalhar com snapshots ao salvar agendamento.
- O retorno de disponibilidade nao deve expor bloqueios internos, apenas slots livres.
- O backend deve validar conflito novamente no momento de gravar o agendamento.

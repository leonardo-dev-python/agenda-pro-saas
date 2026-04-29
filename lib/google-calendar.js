const GOOGLE_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar",
];

export function buildGoogleOAuthUrl({ clientId, redirectUri, state, accountEmail = "" }) {
  const url = new URL(GOOGLE_AUTH_BASE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  url.searchParams.set("state", state);
  if (accountEmail) {
    url.searchParams.set("login_hint", accountEmail);
  }
  return url.toString();
}

export async function exchangeGoogleCodeForTokens({ code, clientId, clientSecret, redirectUri }) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Nao foi possivel concluir a autorizacao com o Google.");
  }

  return data;
}

export async function refreshGoogleAccessToken({ refreshToken, clientId, clientSecret }) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Nao foi possivel renovar o token do Google.");
  }

  return data;
}

export async function fetchGoogleAccountProfile(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  return data;
}

export async function syncGoogleCalendarAppointment({
  appointment,
  salon,
  connection,
  clientId,
  clientSecret,
  decryptValue,
  encryptValue,
  action,
}) {
  if (!connection?.isActive) {
    return buildSyncResult("not_configured", null, null, "", null);
  }

  const refreshToken = decryptValue(connection.refreshTokenEncrypted || "");
  if (!refreshToken || refreshToken === "pending-oauth-token") {
    return buildSyncResult(
      "pending_oauth",
      appointment.googleCalendarEventId || null,
      connection.calendarId || "primary",
      "Conta Google conectada, mas ainda sem autorizacao OAuth concluida.",
      null,
    );
  }

  let accessToken = decryptValue(connection.accessTokenEncrypted || "");
  let tokenExpiresAt = connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt) : null;

  if (!accessToken || !tokenExpiresAt || tokenExpiresAt.getTime() <= Date.now() + 60_000) {
    const refreshed = await refreshGoogleAccessToken({ refreshToken, clientId, clientSecret });
    accessToken = refreshed.access_token;
    tokenExpiresAt = new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000);
    connection = {
      ...connection,
      accessTokenEncrypted: encryptValue(accessToken),
      tokenExpiresAt,
    };
  }

  const calendarId = connection.calendarId || "primary";
  const existingEventId = appointment.googleCalendarEventId || null;

  if (action === "cancel") {
    if (!existingEventId) {
      return buildSyncResult("synced", null, calendarId, "", new Date(), connection);
    }

    await sendGoogleCalendarRequest({
      path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingEventId)}`,
      method: "DELETE",
      accessToken,
    });
    return buildSyncResult("synced", existingEventId, calendarId, "", new Date(), connection);
  }

  const payload = buildGoogleCalendarEventPayload(appointment, salon);
  if (existingEventId) {
    const updated = await sendGoogleCalendarRequest({
      path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingEventId)}`,
      method: "PATCH",
      accessToken,
      body: payload,
    });
    return buildSyncResult("synced", updated.id || existingEventId, calendarId, "", new Date(), connection);
  }

  const created = await sendGoogleCalendarRequest({
    path: `/calendars/${encodeURIComponent(calendarId)}/events`,
    method: "POST",
    accessToken,
    body: payload,
  });
  return buildSyncResult("synced", created.id || existingEventId, calendarId, "", new Date(), connection);
}

function buildGoogleCalendarEventPayload(appointment, salon) {
  const location = salon.addressLine1 || salon.address || "";
  const customerLabel = appointment.customer?.fullName || appointment.customerNameSnapshot || "Cliente";
  const professionalLabel = appointment.professional?.name || "";
  const serviceLabel = appointment.service?.name || appointment.serviceNameSnapshot || "Atendimento";

  return {
    summary: `${serviceLabel} - ${customerLabel}`,
    description: [
      `Cliente: ${customerLabel}`,
      appointment.customer?.phone || appointment.customerPhoneSnapshot ? `Telefone: ${appointment.customer?.phone || appointment.customerPhoneSnapshot}` : "",
      professionalLabel ? `Profissional: ${professionalLabel}` : "",
      appointment.internalNotes ? `Observacoes: ${appointment.internalNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    location,
    start: {
      dateTime: appointment.startAt instanceof Date ? appointment.startAt.toISOString() : new Date(appointment.startAt).toISOString(),
      timeZone: salon.timezone || "America/Sao_Paulo",
    },
    end: {
      dateTime: appointment.endAt instanceof Date ? appointment.endAt.toISOString() : new Date(appointment.endAt).toISOString(),
      timeZone: salon.timezone || "America/Sao_Paulo",
    },
  };
}

async function sendGoogleCalendarRequest({ path, method, accessToken, body }) {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return {};

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Falha ao sincronizar evento com Google Agenda.");
  }

  return data;
}

function buildSyncResult(status, eventId, calendarId, error, syncedAt, connectionUpdate = null) {
  return {
    googleSyncStatus: status,
    googleCalendarEventId: eventId,
    googleTargetCalendarId: calendarId,
    googleSyncError: error,
    googleSyncedAt: syncedAt,
    connectionUpdate,
  };
}

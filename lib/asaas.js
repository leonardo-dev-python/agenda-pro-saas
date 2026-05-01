export function getAsaasEnvironment(env) {
  const apiKey = String(env.ASAAS_API_KEY || "").trim();
  const apiUrl = String(env.ASAAS_API_URL || "").trim();
  const mode = String(env.ASAAS_ENV || "sandbox").trim().toLowerCase();

  return {
    configured: Boolean(apiKey && apiUrl),
    mode,
    apiKey,
    apiUrl,
  };
}

export async function createAsaasCustomer(config, payload) {
  return asaasRequest(config, "/customers", {
    method: "POST",
    body: payload,
  });
}

export async function createAsaasSubscription(config, payload) {
  return asaasRequest(config, "/subscriptions", {
    method: "POST",
    body: payload,
  });
}

export async function getAsaasSubscription(config, subscriptionId) {
  return asaasRequest(config, `/subscriptions/${subscriptionId}`, {
    method: "GET",
  });
}

export async function listAsaasSubscriptionPayments(config, subscriptionId) {
  return asaasRequest(config, `/subscriptions/${subscriptionId}/payments`, {
    method: "GET",
  });
}

export async function cancelAsaasSubscription(config, subscriptionId) {
  return asaasRequest(config, `/subscriptions/${subscriptionId}`, {
    method: "DELETE",
  });
}

async function asaasRequest(config, path, options = {}) {
  if (!config?.configured) {
    throw new Error("Asaas ainda nao esta configurado no ambiente.");
  }

  const response = await fetch(`${config.apiUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: config.apiKey,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readAsaasError(data) || "Falha ao comunicar com o Asaas.");
  }

  return data;
}

function readAsaasError(data) {
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((item) => item.description || item.code).filter(Boolean).join(" ");
  }
  return data?.message || data?.error || "";
}

const API_BASE = "/api";
const TOKEN_KEY = "agendapro-token";

const els = {
  planName: document.getElementById("subscription-plan-name"),
  statusPill: document.getElementById("subscription-status-pill"),
  statusCopy: document.getElementById("subscription-status-copy"),
  paymentMethod: document.getElementById("subscription-payment-method"),
  window: document.getElementById("subscription-window"),
  companyName: document.getElementById("subscription-company-name"),
  companyEmail: document.getElementById("subscription-company-email"),
  cancelButton: document.getElementById("subscription-cancel-button"),
  feedback: document.getElementById("subscription-feedback"),
};

let billingOverview = null;
let company = null;

bootstrap().catch((error) => {
  setFeedback(error.message || "Não foi possível carregar sua assinatura.", true);
});

els.cancelButton?.addEventListener("click", handleCancelSubscription);

async function bootstrap() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = "/estabelecimento";
    return;
  }

  const [session, billing] = await Promise.all([
    request("/auth/session", { token }),
    request("/billing", { token }),
  ]);

  company = session.company || session.salon || null;
  billingOverview = billing;
  render();
}

async function handleCancelSubscription() {
  if (!company) return;
  if (!window.confirm("Cancelar a assinatura mensal do Agenda Pro para este estabelecimento?")) return;

  try {
    els.cancelButton.disabled = true;
    setFeedback("Cancelando assinatura...", false);
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await request("/billing/cancel-subscription", {
      method: "POST",
      token,
    });
    company = response.company || company;
    billingOverview = response.billing || billingOverview;
    render();
    setFeedback(response.message || "Assinatura cancelada com sucesso.", false);
  } catch (error) {
    setFeedback(error.message || "Não foi possível cancelar a assinatura.", true);
  } finally {
    els.cancelButton.disabled = false;
  }
}

function render() {
  const subscription = company?.subscription || {};
  const state = getSubscriptionState(subscription);

  if (els.planName) els.planName.textContent = "Agenda Pro";
  if (els.statusPill) {
    els.statusPill.textContent = state.label;
    els.statusPill.className = `status-pill ${state.tone}`;
  }
  if (els.statusCopy) els.statusCopy.textContent = state.description;
  if (els.paymentMethod) els.paymentMethod.textContent = formatBillingMethod(company?.billingMethod || billingOverview?.profile?.billingMethod || "BOLETO");
  if (els.window) els.window.textContent = state.window;
  if (els.companyName) els.companyName.textContent = company?.name || "-";
  if (els.companyEmail) els.companyEmail.textContent = company?.email || "-";
  if (els.cancelButton) {
    const locked = state.code === "canceled";
    els.cancelButton.disabled = locked;
    els.cancelButton.textContent = locked ? "Assinatura já cancelada" : "Cancelar assinatura";
  }
}

function getSubscriptionState(subscription) {
  const status = String(subscription?.billingStatus || "trialing").toLowerCase();
  const trialEndsAt = subscription?.trialEndsAt || null;
  const subscriptionEndsAt = subscription?.subscriptionEndsAt || null;

  if (status === "active") {
    return {
      code: "active",
      label: "Ativa",
      tone: "is-success",
      description: "A recorrência mensal está ativa e novas cobranças seguem normalmente.",
      window: subscriptionEndsAt ? `Ativa até ${formatDate(subscriptionEndsAt)}` : "Recorrência ativa",
    };
  }

  if (status === "canceled") {
    return {
      code: "canceled",
      label: "Cancelada",
      tone: "is-warn",
      description: subscriptionEndsAt
        ? `A assinatura foi cancelada e o acesso segue até ${formatDate(subscriptionEndsAt)}.`
        : "A assinatura foi cancelada e não haverá novas cobranças.",
      window: subscriptionEndsAt ? `Até ${formatDate(subscriptionEndsAt)}` : "Encerrada",
    };
  }

  if (status === "past_due") {
    return {
      code: "past_due",
      label: "Pendente",
      tone: "is-danger",
      description: "Existe uma cobrança pendente. Quite o boleto ou aguarde a confirmação do cartão para liberar o uso completo do painel.",
      window: "Pagamento pendente",
    };
  }

  return {
    code: "trialing",
    label: "Em ativação",
    tone: "is-muted",
    description: trialEndsAt
      ? `Sua conta está em ativação temporária até ${formatDate(trialEndsAt)}.`
      : "Sua conta está em ativação inicial.",
    window: trialEndsAt ? `Até ${formatDate(trialEndsAt)}` : "Ativação inicial",
  };
}

function formatDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString("pt-BR");
}

function formatBillingMethod(value) {
  return {
    BOLETO: "Boleto bancário recorrente",
    CREDIT_CARD: "Cartão de crédito recorrente",
  }[String(value || "").toUpperCase()] || "Não informado";
}

function setFeedback(message, isError) {
  if (!els.feedback) return;
  els.feedback.textContent = message;
  els.feedback.className = `feedback${isError ? " error" : " success"}`;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Falha na requisição.");
  return data;
}

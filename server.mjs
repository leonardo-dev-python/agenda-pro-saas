import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

import { hashPassword, safeCompare, signToken, verifyToken } from "./lib/auth.js";
import { createDatabaseGateway } from "./lib/database.js";
import {
  createAsaasCustomer,
  createAsaasSubscription,
  getAsaasEnvironment,
  listAsaasSubscriptionPayments,
} from "./lib/asaas.js";
import { buildGoogleOAuthUrl, exchangeGoogleCodeForTokens, fetchGoogleAccountProfile } from "./lib/google-calendar.js";
import { readJson, sendJson, sendText } from "./lib/http.js";
import { createAppRepository } from "./lib/repositories/index.js";
import { sanitizeCompany, sanitizeUser } from "./lib/salon-domain.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
loadEnvFile(join(__dirname, ".env"));
const env = globalThis.process?.env || {};
const PORT = env.PORT ? Number(env.PORT) : 4173;
const TOKEN_SECRET = env.JWT_SECRET || "agenda-pro-local-secret";
const publicFiles = new Set([
  "/landing.html",
  "/index.html",
  "/client.html",
  "/signup.html",
  "/checkout.html",
  "/styles.css",
  "/app.js",
  "/client.js",
  "/signup.js",
  "/checkout.js",
  "/assets/agenda-pro-logo.png",
  "/assets/agenda-pro-logo-dark.png",
  "/assets/agenda_centralizada_icon.png",
  "/assets/equipe_configuravel_icon.png",
  "/assets/clientes_organizados_icon.png",
]);

const db = createDatabaseGateway({
  baseDir: __dirname,
  tokenSecret: TOKEN_SECRET,
});

const repository = createAppRepository({
  provider: env.REPOSITORY_PROVIDER || "json",
  gateway: db,
  googleCalendarConfig: {
    clientId: env.GOOGLE_CLIENT_ID || "",
    clientSecret: env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: env.GOOGLE_REDIRECT_URI || "",
    encryptValue: (value) => encodeProtectedValue(value, TOKEN_SECRET),
    decryptValue: (value) => decodeProtectedValue(value, TOKEN_SECRET),
  },
});

await db.ensureDatabase();

const BILLING_PLANS = [
  {
    code: "starter",
    name: "Starter",
    priceLabel: "R$ 79/mensal",
    priceCents: 7900,
    description: "Para saloes, barbearias e studios que querem comecar a organizar o operacional sem complicacao.",
    features: ["1 estabelecimento", "Agenda e equipe", "Google Agenda", "Link publico de agendamento"],
  },
  {
    code: "professional",
    name: "Professional",
    priceLabel: "R$ 149/mensal",
    priceCents: 14900,
    description: "Para operacoes em crescimento que precisam de mais ritmo comercial, mais equipe e mais controle da rotina.",
    features: ["Tudo do Starter", "Mais profissionais", "Relacao com clientes", "Prioridade na evolucao comercial"],
  },
  {
    code: "multi",
    name: "Multiunidade",
    priceLabel: "Sob consulta",
    priceCents: 0,
    description: "Para marcas com duas ou mais unidades, fluxo comercial consultivo e implantacao assistida.",
    features: ["Multiplas unidades", "Expansao comercial", "Suporte consultivo", "Setup assistido"],
  },
];

const BILLING_PROVIDERS = [
  { code: "asaas", name: "Asaas", recommended: true },
  { code: "mercado_pago", name: "Mercado Pago", recommended: false },
];

const BILLING_METHODS = [
  { code: "BOLETO", name: "Boleto" },
  { code: "PIX", name: "Pix" },
];

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    await serveStatic(res, url);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Erro interno no servidor." });
  }
});

server.listen(PORT, () => {
  console.log(`AgendaPro local em http://localhost:${PORT}`);
});

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, app: "Agenda Pro" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const authRecord = await repository.findUserByEmail(email);
    const user = authRecord?.user;

    if (!user || !safeCompare(user.passwordHash, hashPassword(password, TOKEN_SECRET))) {
      sendJson(res, 401, { error: "Email ou senha invalidos." });
      return;
    }

    const salon = authRecord.salon || authRecord.company;
    const token = signToken({ sub: user.id, companyId: user.companyId }, TOKEN_SECRET);
    sendJson(res, 200, {
      token,
      user: sanitizeUser(user),
      company: salon,
      salon,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    const body = await readJson(req);
    const ownerName = String(body.ownerName || "").trim();
    const salonName = String(body.salonName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!ownerName || !salonName || !email || !phone || !password) {
      sendJson(res, 400, { error: "Preencha os campos obrigatorios para criar a conta." });
      return;
    }

    try {
      const authRecord = await repository.createOwnerAccount({
        ownerName,
        salonName,
        email,
        phone,
        plan: String(body.plan || "").trim(),
        passwordHash: hashPassword(password, TOKEN_SECRET),
      });
      const salon = authRecord.salon || authRecord.company;
      const token = signToken({ sub: authRecord.user.id, companyId: authRecord.user.companyId }, TOKEN_SECRET);
      sendJson(res, 201, {
        token,
        user: sanitizeUser(authRecord.user),
        company: salon,
        salon,
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Nao foi possivel criar a conta." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/session") {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const salon = auth.salon || auth.company;
    sendJson(res, 200, {
      user: sanitizeUser(auth.user),
      company: salon,
      salon,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/public/catalog") {
    sendJson(res, 200, await repository.getPublicCatalog({
      salonSlug: url.searchParams.get("salon") || "",
    }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/webhooks/asaas") {
    await handleAsaasWebhook(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/integrations/google/callback") {
    await handleGoogleOAuthCallback(res, url);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/public/availability") {
    sendJson(
      res,
      200,
      await repository.getPublicAvailability({
        professionalId: url.searchParams.get("professionalId") || "",
        serviceId: url.searchParams.get("serviceId") || "",
        date: url.searchParams.get("date") || "",
        salonSlug: url.searchParams.get("salon") || "",
      }),
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/public/appointments") {
    try {
      const body = await readJson(req);
      const catalog = await repository.getPublicCatalog({
        salonSlug: body.salonSlug || "",
      });
      if (!ensureOperationalAccess(catalog.company || catalog.salon, res, { publicBooking: true })) return;
      sendJson(res, 201, await repository.createPublicAppointment(body));
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Nao foi possivel concluir o agendamento." });
    }
    return;
  }

  const auth = await authenticateRequest(req, res);
  if (!auth) return;

  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    sendJson(res, 200, await repository.getDashboard(auth.company.id));
    return;
  }

  if ((url.pathname === "/api/company" || url.pathname === "/api/salon") && req.method === "GET") {
    sendJson(res, 200, await repository.getSalon(auth.company.id));
    return;
  }

  if ((url.pathname === "/api/company" || url.pathname === "/api/salon") && req.method === "PUT") {
    if (!ensureOperationalAccess(auth.company, res)) return;
    const body = await readJson(req);
    sendJson(res, 200, await repository.updateSalon(auth.company.id, body.salon || body.company || {}));
    return;
  }

  if (url.pathname === "/api/services" && req.method === "GET") {
    sendJson(res, 200, await repository.listServices(auth.company.id));
    return;
  }

  if (url.pathname === "/api/services" && req.method === "POST") {
    if (!ensureOperationalAccess(auth.company, res)) return;
    const body = await readJson(req);
    sendJson(res, 201, await repository.createService(auth.company.id, body.service || {}));
    return;
  }

  if (url.pathname.startsWith("/api/services/")) {
    const serviceId = url.pathname.split("/")[3];
    try {
      if (req.method === "PUT") {
        if (!ensureOperationalAccess(auth.company, res)) return;
        const body = await readJson(req);
        sendJson(res, 200, await repository.updateService(auth.company.id, serviceId, body.service || {}));
        return;
      }

      if (req.method === "DELETE") {
        if (!ensureOperationalAccess(auth.company, res)) return;
        sendJson(res, 200, await repository.deleteService(auth.company.id, serviceId));
        return;
      }
    } catch (error) {
      sendJson(res, error.message.includes("ativos") ? 409 : 404, { error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/professionals" && req.method === "GET") {
    sendJson(res, 200, await repository.listProfessionals(auth.company.id));
    return;
  }

  if (url.pathname === "/api/professionals" && req.method === "POST") {
    if (!ensureOperationalAccess(auth.company, res)) return;
    const body = await readJson(req);
    sendJson(res, 201, await repository.createProfessional(auth.company.id, body.professional || {}));
    return;
  }

  if (url.pathname.startsWith("/api/professionals/")) {
    const professionalId = url.pathname.split("/")[3];
    try {
      if (req.method === "PUT") {
        if (!ensureOperationalAccess(auth.company, res)) return;
        const body = await readJson(req);
        sendJson(res, 200, await repository.updateProfessional(auth.company.id, professionalId, body.professional || {}));
        return;
      }

      if (req.method === "DELETE") {
        if (!ensureOperationalAccess(auth.company, res)) return;
        sendJson(res, 200, await repository.deleteProfessional(auth.company.id, professionalId));
        return;
      }
    } catch (error) {
      sendJson(res, error.message.includes("ativos") ? 409 : 404, { error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/clients" && req.method === "GET") {
    sendJson(res, 200, await repository.listClients(auth.company.id));
    return;
  }

  if (url.pathname === "/api/clients" && req.method === "POST") {
    if (!ensureOperationalAccess(auth.company, res)) return;
    const body = await readJson(req);
    sendJson(res, 201, await repository.createClient(auth.company.id, body.client || {}));
    return;
  }

  if (url.pathname.startsWith("/api/clients/")) {
    const clientId = url.pathname.split("/")[3];
    try {
      if (req.method === "PUT") {
        if (!ensureOperationalAccess(auth.company, res)) return;
        const body = await readJson(req);
        sendJson(res, 200, await repository.updateClient(auth.company.id, clientId, body.client || {}));
        return;
      }

      if (req.method === "DELETE") {
        if (!ensureOperationalAccess(auth.company, res)) return;
        sendJson(res, 200, await repository.deleteClient(auth.company.id, clientId));
        return;
      }
    } catch (error) {
      sendJson(res, error.message.includes("historico") ? 409 : 404, { error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/appointments" && req.method === "GET") {
    sendJson(
      res,
      200,
      await repository.listAppointments(auth.company.id, {
        date: url.searchParams.get("date") || "",
        professionalId: url.searchParams.get("professionalId") || "",
        status: url.searchParams.get("status") || "",
      }),
    );
    return;
  }

  if (url.pathname === "/api/appointments" && req.method === "POST") {
    try {
      if (!ensureOperationalAccess(auth.company, res)) return;
      const body = await readJson(req);
      sendJson(res, 201, await repository.createAppointment(auth.company.id, auth.company, body));
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Nao foi possivel salvar o agendamento." });
    }
    return;
  }

  if (url.pathname.startsWith("/api/appointments/") && req.method === "PUT") {
    const appointmentId = url.pathname.split("/")[3];
    try {
      if (!ensureOperationalAccess(auth.company, res)) return;
      const body = await readJson(req);
      sendJson(res, 200, await repository.updateAppointment(auth.company.id, auth.company, appointmentId, body));
    } catch (error) {
      const status = error.message.includes("nao encontrado") ? 404 : 400;
      sendJson(res, status, { error: error.message || "Nao foi possivel atualizar o agendamento." });
    }
    return;
  }

  if (url.pathname === "/api/notifications" && req.method === "GET") {
    sendJson(
      res,
      200,
      await repository.listNotifications(auth.company.id, {
        date: url.searchParams.get("date") || "",
        type: url.searchParams.get("type") || "",
      }),
    );
    return;
  }

  if (url.pathname === "/api/integrations/google" && req.method === "GET") {
    const data = await repository.getGoogleIntegration(auth.company.id);
    const googleOAuthEnvironment = getGoogleOAuthEnvironmentStatus(env);
    sendJson(res, 200, {
      ...data,
      oauthConfigured: googleOAuthEnvironment.configured,
      oauthUsable: googleOAuthEnvironment.usable,
      oauthMode: googleOAuthEnvironment.mode,
      oauthMessage: googleOAuthEnvironment.message,
      redirectUri: env.GOOGLE_REDIRECT_URI || "",
    });
    return;
  }

  if (url.pathname === "/api/integrations/google/connect" && req.method === "POST") {
    if (!ensureOperationalAccess(auth.company, res)) return;
    const body = await readJson(req);
    sendJson(res, 200, await repository.connectGoogleIntegration(auth.company.id, body));
    return;
  }

  if (url.pathname === "/api/integrations/google/oauth/start" && req.method === "POST") {
    if (!ensureOperationalAccess(auth.company, res)) return;
    const googleOAuthEnvironment = getGoogleOAuthEnvironmentStatus(env);
    if (!googleOAuthEnvironment.usable) {
      sendJson(res, 400, { error: googleOAuthEnvironment.message });
      return;
    }

    const body = await readJson(req);
    const integration = await repository.connectGoogleIntegration(auth.company.id, {
      accountEmail: body.accountEmail,
      calendarId: body.calendarId || "primary",
      connected: true,
    });
    const stateToken = signToken(
      {
        sub: auth.user.id,
        companyId: auth.company.id,
        purpose: "google-oauth",
      },
      TOKEN_SECRET,
    );
    const authUrl = buildGoogleOAuthUrl({
      clientId: env.GOOGLE_CLIENT_ID,
      redirectUri: env.GOOGLE_REDIRECT_URI,
      state: stateToken,
      accountEmail: body.accountEmail || "",
    });
    sendJson(res, 200, { googleCalendar: integration.googleCalendar, authUrl });
    return;
  }

  if (url.pathname === "/api/integrations/google" && req.method === "DELETE") {
    if (!ensureOperationalAccess(auth.company, res)) return;
    sendJson(res, 200, await repository.disconnectGoogleIntegration(auth.company.id));
    return;
  }

  if (url.pathname === "/api/billing" && req.method === "GET") {
    sendJson(res, 200, buildBillingOverview(auth.company, auth.user));
    return;
  }

  if (url.pathname === "/api/billing/profile" && req.method === "POST") {
    const body = await readJson(req);
    const profilePayload = {
      legalName: body.legalName,
      billingDocumentId: body.billingDocumentId,
      billingMethod: body.billingMethod,
      email: body.email,
      phone: body.phone,
    };
    const updated = await repository.updateBillingProfile(auth.company.id, profilePayload);
    sendJson(res, 200, {
      company: updated.company || updated.salon,
      billing: buildBillingOverview(updated.company || updated.salon, auth.user),
      message: "Dados de cobranca atualizados.",
    });
    return;
  }

  if (url.pathname === "/api/billing/checkout-session" && req.method === "POST") {
    const body = await readJson(req);
    const planCode = String(body.planCode || auth.company?.subscription?.planCode || "starter").trim().toLowerCase();
    const provider = String(body.provider || "asaas").trim().toLowerCase();
    const selectedPlan = BILLING_PLANS.find((plan) => plan.code === planCode) || BILLING_PLANS[0];
    const selectedProvider = BILLING_PROVIDERS.find((item) => item.code === provider) || BILLING_PROVIDERS[0];
    const profilePayload = {
      legalName: body.legalName,
      billingDocumentId: body.billingDocumentId,
      billingMethod: body.billingMethod,
      email: body.email,
      phone: body.phone,
    };
    const profileSource = {
      ...auth.company,
      legalName: String(profilePayload.legalName || auth.company.legalName || auth.company.name || "").trim(),
      billingDocumentId: normalizeDocumentId(profilePayload.billingDocumentId || auth.company.billingDocumentId || ""),
      billingMethod: normalizeBillingMethod(profilePayload.billingMethod || auth.company.billingMethod || "BOLETO"),
      phone: String(profilePayload.phone || auth.company.phone || "").trim(),
      email: String(profilePayload.email || auth.user?.email || "").trim().toLowerCase(),
    };

    if (selectedPlan.code === "multi") {
      const updated = await repository.updateSubscription(auth.company.id, {
        planCode: selectedPlan.code,
        billingProvider: selectedProvider.code,
      });
      sendJson(res, 200, {
        company: updated.company || updated.salon,
        checkout: {
          mode: "sales_contact",
          provider: selectedProvider.code,
          providerName: selectedProvider.name,
          planCode: selectedPlan.code,
          planName: selectedPlan.name,
          amountLabel: selectedPlan.priceLabel,
        },
        message: "Plano Multiunidade segue por fluxo consultivo. Vamos tratar a cobranca junto com a implantacao.",
      });
      return;
    }

    if (!profileSource.legalName || !profileSource.billingDocumentId || !profileSource.phone) {
      sendJson(res, 400, { error: "Preencha nome de cobranca, CPF/CNPJ e telefone antes de gerar a assinatura." });
      return;
    }

    const billingProfileUpdate = await repository.updateBillingProfile(auth.company.id, profileSource);
    const currentCompany = billingProfileUpdate.company || billingProfileUpdate.salon;

    if (selectedProvider.code !== "asaas") {
      const updated = await repository.updateSubscription(auth.company.id, {
        planCode: selectedPlan.code,
        billingProvider: selectedProvider.code,
      });
      sendJson(res, 200, {
        company: updated.company || updated.salon,
        checkout: {
          mode: "manual_preparation",
          provider: selectedProvider.code,
          providerName: selectedProvider.name,
          planCode: selectedPlan.code,
          planName: selectedPlan.name,
          amountLabel: selectedPlan.priceLabel,
        },
        message: `Fluxo de cobranca preparado para o plano ${selectedPlan.name} com ${selectedProvider.name}.`,
      });
      return;
    }

    const asaas = getAsaasEnvironment(env);
    if (!asaas.configured) {
      sendJson(res, 400, { error: "Asaas ainda nao esta configurado no ambiente." });
      return;
    }

    const customerId =
      currentCompany.subscription?.billingCustomerId ||
      (await createAsaasCustomer(asaas, {
        name: profileSource.legalName,
        cpfCnpj: profileSource.billingDocumentId,
        email: profileSource.email || undefined,
        mobilePhone: profileSource.phone,
        phone: profileSource.phone,
        notificationDisabled: false,
        externalReference: currentCompany.id,
      })).id;

    const nextDueDate = resolveFirstDueDate(currentCompany.subscription);
    const subscription = await createAsaasSubscription(asaas, {
      customer: customerId,
      billingType: profileSource.billingMethod,
      value: selectedPlan.priceCents / 100,
      nextDueDate,
      cycle: "MONTHLY",
      description: `Assinatura ${selectedPlan.name} - Agenda Pro`,
      externalReference: currentCompany.id,
    });

    const paymentsResponse = await listAsaasSubscriptionPayments(asaas, subscription.id).catch(() => ({ data: [] }));
    const firstPayment = Array.isArray(paymentsResponse?.data) ? paymentsResponse.data[0] : null;

    const updated = await repository.updateSubscription(auth.company.id, {
      planCode: selectedPlan.code,
      billingProvider: selectedProvider.code,
      billingCustomerId: customerId,
      billingSubscriptionId: subscription.id,
      billingStatus: "trialing",
    });

    sendJson(res, 200, {
      company: updated.company || updated.salon,
      billing: buildBillingOverview(updated.company || updated.salon, auth.user),
      checkout: {
        mode: "asaas_subscription",
        provider: selectedProvider.code,
        providerName: selectedProvider.name,
        planCode: selectedPlan.code,
        planName: selectedPlan.name,
        amountLabel: selectedPlan.priceLabel,
        nextDueDate,
        subscriptionId: subscription.id,
        payment: firstPayment
          ? {
              id: firstPayment.id || "",
              status: firstPayment.status || "",
              invoiceUrl: firstPayment.invoiceUrl || "",
              bankSlipUrl: firstPayment.bankSlipUrl || "",
              dueDate: firstPayment.dueDate || "",
            }
          : null,
      },
      message: `Assinatura ${selectedPlan.name} criada no Asaas Sandbox.`,
    });
    return;
  }

  sendJson(res, 404, { error: "Rota nao encontrada." });
}

async function authenticateRequest(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const payload = token ? verifyToken(token, TOKEN_SECRET) : null;

  if (!payload?.sub || !payload?.companyId) {
    sendJson(res, 401, { error: "Sessao invalida ou expirada." });
    return null;
  }

  const session = await repository.getSessionContext(payload.sub, payload.companyId);
  if (!session?.user || !(session.company || session.salon)) {
    sendJson(res, 401, { error: "Usuario nao encontrado." });
    return null;
  }

  return session;
}

function ensureOperationalAccess(company, res, options = {}) {
  const access = getSubscriptionAccess(company?.subscription, options);
  if (access.allowed) return true;
  sendJson(res, 402, { error: access.message });
  return false;
}

function getSubscriptionAccess(subscription, options = {}) {
  const source = subscription || {};
  const billingStatus = String(source.billingStatus || "trialing").toLowerCase();
  const now = Date.now();
  const trialEndsAt = source.trialEndsAt ? new Date(source.trialEndsAt).getTime() : null;
  const subscriptionEndsAt = source.subscriptionEndsAt ? new Date(source.subscriptionEndsAt).getTime() : null;
  const publicBooking = Boolean(options.publicBooking);

  if (billingStatus === "active") {
    if (subscriptionEndsAt && subscriptionEndsAt < now) {
      return {
        allowed: false,
        message: publicBooking
          ? "Este estabelecimento esta com a assinatura expirada e nao pode receber novos agendamentos no momento."
          : "Sua assinatura expirou. Regularize para voltar a editar o painel.",
      };
    }
    return { allowed: true };
  }

  if (billingStatus === "trialing") {
    if (!trialEndsAt || trialEndsAt >= now) return { allowed: true };
    return {
      allowed: false,
      message: publicBooking
        ? "Este estabelecimento encerrou o periodo de teste e nao esta recebendo novos agendamentos no momento."
        : "Seu teste gratis terminou. Ative a assinatura para voltar a editar o painel.",
    };
  }

  if (billingStatus === "past_due") {
    return {
      allowed: false,
      message: publicBooking
        ? "Este estabelecimento esta com pagamento pendente e nao esta recebendo novos agendamentos no momento."
        : "Existe um pagamento pendente. Regularize a assinatura para voltar a editar o painel.",
    };
  }

  if (billingStatus === "canceled") {
    return {
      allowed: false,
      message: publicBooking
        ? "Este estabelecimento esta com a assinatura cancelada e nao esta recebendo novos agendamentos no momento."
        : "Sua assinatura foi cancelada. Reative para voltar a editar o painel.",
    };
  }

  return {
    allowed: false,
    message: publicBooking
      ? "Este estabelecimento nao esta recebendo novos agendamentos no momento."
      : "Sua conta precisa de uma assinatura ativa para continuar usando o painel em modo de edicao.",
  };
}

function buildBillingOverview(company) {
  const subscription = company?.subscription || {};
  const recommendedProvider = String(subscription.billingProvider || "asaas").trim().toLowerCase() || "asaas";
  const asaas = getAsaasEnvironment(env);
  return {
    subscription,
    recommendedProvider,
    trialDays: 14,
    collectionMode: "saas_subscription",
    providers: BILLING_PROVIDERS,
    paymentMethods: BILLING_METHODS,
    plans: BILLING_PLANS,
    providerSettings: {
      asaas: {
        configured: asaas.configured,
        mode: asaas.mode,
      },
    },
    profile: {
      legalName: company?.legalName || company?.name || "",
      billingDocumentId: company?.billingDocumentId || "",
      billingMethod: company?.billingMethod || "BOLETO",
      email: company?.email || "",
    },
  };
}

async function handleAsaasWebhook(req, res) {
  const body = await readJson(req).catch(() => ({}));
  const event = String(body?.event || "").trim().toUpperCase();
  const payment = body?.payment || {};
  const subscriptionPayload = body?.subscription || {};
  const subscriptionId =
    String(
      payment?.subscription ||
        subscriptionPayload?.id ||
        body?.subscription ||
        "",
    ).trim();

  if (!event) {
    sendJson(res, 400, { error: "Evento do Asaas nao informado." });
    return;
  }

  if (!subscriptionId) {
    sendJson(res, 200, { ok: true, ignored: true, reason: "subscription_not_found" });
    return;
  }

  const record = await repository.findSalonByBillingSubscriptionId(subscriptionId);
  const salon = record?.company || record?.salon || record;
  if (!salon) {
    sendJson(res, 200, { ok: true, ignored: true, reason: "salon_not_found" });
    return;
  }

  const update = mapAsaasEventToSubscriptionUpdate(event, payment, subscriptionPayload);
  if (!update) {
    sendJson(res, 200, { ok: true, ignored: true, reason: "event_not_mapped" });
    return;
  }

  await repository.updateSubscription(salon.id, update);
  sendJson(res, 200, { ok: true });
}

function mapAsaasEventToSubscriptionUpdate(event, payment, subscriptionPayload) {
  if (["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"].includes(event)) {
    return {
      billingStatus: "active",
      subscriptionEndsAt: null,
      billingSubscriptionId: String(payment?.subscription || subscriptionPayload?.id || "").trim() || undefined,
    };
  }

  if (event === "PAYMENT_OVERDUE") {
    return {
      billingStatus: "past_due",
      billingSubscriptionId: String(payment?.subscription || subscriptionPayload?.id || "").trim() || undefined,
    };
  }

  if (["SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED", "PAYMENT_DELETED"].includes(event)) {
    return {
      billingStatus: "canceled",
      subscriptionEndsAt: new Date().toISOString(),
      billingSubscriptionId: String(payment?.subscription || subscriptionPayload?.id || "").trim() || undefined,
    };
  }

  return null;
}

function resolveFirstDueDate(subscription) {
  const reference = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : new Date();
  const base = Number.isNaN(reference.getTime()) ? new Date() : reference;
  return formatDateOnly(base);
}

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDocumentId(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeBillingMethod(value) {
  const method = String(value || "BOLETO").trim().toUpperCase();
  return BILLING_METHODS.some((item) => item.code === method) ? method : "BOLETO";
}

async function handleGoogleOAuthCallback(res, url) {
  const error = url.searchParams.get("error");
  if (error) {
    sendOAuthResultPage(res, false, `Autorizacao do Google nao concluida: ${error}.`);
    return;
  }

  const code = url.searchParams.get("code") || "";
  const stateToken = url.searchParams.get("state") || "";
  const payload = verifyToken(stateToken, TOKEN_SECRET);

  if (!code || !payload?.companyId || payload.purpose !== "google-oauth") {
    sendOAuthResultPage(res, false, "Callback do Google invalido ou expirado.");
    return;
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    sendOAuthResultPage(res, false, "OAuth do Google nao esta configurado no servidor.");
    return;
  }

  try {
    const tokenData = await exchangeGoogleCodeForTokens({
      code,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    });
    const profile = tokenData.access_token ? await fetchGoogleAccountProfile(tokenData.access_token) : null;
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + Number(tokenData.expires_in) * 1000)
      : null;

    await repository.completeGoogleOAuthConnection(payload.companyId, {
      accountEmail: profile?.email || "",
      refreshTokenEncrypted: encodeProtectedValue(tokenData.refresh_token || "pending-oauth-token", TOKEN_SECRET),
      accessTokenEncrypted: encodeProtectedValue(tokenData.access_token || "", TOKEN_SECRET),
      tokenExpiresAt: expiresAt,
    });

    sendOAuthResultPage(res, true, "Conta Google autorizada com sucesso. Pode voltar ao painel.");
  } catch (callbackError) {
    sendOAuthResultPage(res, false, callbackError.message || "Nao foi possivel concluir o OAuth do Google.");
  }
}

function getGoogleOAuthEnvironmentStatus(currentEnv) {
  const clientId = String(currentEnv.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(currentEnv.GOOGLE_CLIENT_SECRET || "").trim();
  const redirectUri = String(currentEnv.GOOGLE_REDIRECT_URI || "").trim();
  const configured = Boolean(clientId && clientSecret && redirectUri);

  if (!configured) {
    return {
      configured: false,
      usable: false,
      mode: "missing",
      message: "OAuth do Google ainda nao esta configurado no ambiente.",
    };
  }

  const joined = `${clientId} ${clientSecret} ${redirectUri}`.toLowerCase();
  const looksLikeTestConfig = [
    "test-google-client-id",
    "test-google-client-secret",
    "example",
    "placeholder",
    "changeme",
    "fake",
    "dummy",
  ].some((token) => joined.includes(token));

  if (looksLikeTestConfig) {
    return {
      configured: true,
      usable: false,
      mode: "test",
      message: "OAuth do Google esta em modo de teste. Configure credenciais reais do Google Cloud para autorizar uma conta.",
    };
  }

  return {
    configured: true,
    usable: true,
    mode: "ready",
    message: "OAuth do Google pronto para autorizacao.",
  };
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath) || !globalThis.process?.env) return;

  const lines = readFileSync(filePath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!(key in globalThis.process.env)) {
      globalThis.process.env[key] = value;
    }
  }
}

function sendOAuthResultPage(res, success, message) {
  const tone = success ? "#1f8f5f" : "#a33b49";
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Agenda</title>
</head>
<body style="font-family: Manrope, Arial, sans-serif; background:#f6f1ea; color:#17302d; display:grid; place-items:center; min-height:100vh; margin:0;">
  <main style="max-width:520px; padding:32px; background:#ffffff; border-radius:24px; box-shadow:0 20px 60px rgba(23,48,45,0.12); text-align:center;">
    <h1 style="margin-top:0; color:${tone};">${success ? "Conexao concluida" : "Conexao nao concluida"}</h1>
    <p style="line-height:1.6;">${message}</p>
    <p style="font-size:0.95rem; color:#5e6a68;">Esta janela pode ser fechada.</p>
  </main>
</body>
</html>`;
  res.writeHead(success ? 200 : 400, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function encodeProtectedValue(value, secret) {
  if (!value) return "";
  return Buffer.from(`${secret}:${value}`, "utf8").toString("base64url");
}

function decodeProtectedValue(value, secret) {
  if (!value) return "";
  try {
    const decoded = Buffer.from(String(value), "base64url").toString("utf8");
    return decoded.startsWith(`${secret}:`) ? decoded.slice(secret.length + 1) : String(value);
  } catch {
    return String(value);
  }
}

async function serveStatic(res, url) {
  const aliases = {
    "/": "/landing.html",
    "/estabelecimento": "/index.html",
    "/cliente": "/client.html",
    "/agendar": "/client.html",
    "/criar-conta": "/checkout.html",
    "/checkout": "/checkout.html",
  };
  const pathname = url.pathname.startsWith("/agendar/")
    ? "/client.html"
    : (aliases[url.pathname] || url.pathname);
  if (!publicFiles.has(pathname)) {
    sendText(res, 404, "Nao encontrado.");
    return;
  }

  const safePath = normalize(join(__dirname, pathname));
  const content = await readFile(safePath);
  const contentType =
    ({
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".png": "image/png",
    })[extname(safePath)] || "application/octet-stream";

  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
}

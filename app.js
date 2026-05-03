const API_BASE = "/api";
const TOKEN_KEY = "agendapro-token";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  session: null,
  company: null,
  billingOverview: null,
  billingCheckout: null,
  googleIntegration: null,
  services: [],
  professionals: [],
  clients: [],
  appointments: [],
  holidayPicker: {
    selected: new Set(),
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  },
  editing: {
    appointmentId: ""
  }
};

const els = {
  loginView: document.getElementById("login-view"),
  appView: document.getElementById("app-view"),
  loginForm: document.getElementById("login-form"),
  loginError: document.getElementById("login-error"),
  logoutButton: document.getElementById("logout-button"),
  sessionStatus: document.getElementById("session-status"),
  adminFeedback: document.getElementById("admin-feedback"),
  billingBanner: document.getElementById("billing-banner"),
  billingBannerBadge: document.getElementById("billing-banner-badge"),
  billingBannerTitle: document.getElementById("billing-banner-title"),
  billingBannerText: document.getElementById("billing-banner-text"),

  metricProfessionals: document.getElementById("metric-professionals"),
  metricServices: document.getElementById("metric-services"),
  metricAppointments: document.getElementById("metric-appointments"),

  adminCompanyName: document.getElementById("admin-company-name"),
  adminStatsProfessionals: document.getElementById("admin-stats-professionals"),
  adminStatsServices: document.getElementById("admin-stats-services"),
  adminStatsToday: document.getElementById("admin-stats-today"),
  ownerSetupCopy: document.getElementById("owner-setup-copy"),
  ownerSetupProgress: document.getElementById("owner-setup-progress"),
  ownerSetupStatus: document.getElementById("owner-setup-status"),
  ownerSetupList: document.getElementById("owner-setup-list"),
  adminPlanName: document.getElementById("admin-plan-name"),
  adminPlanCopy: document.getElementById("admin-plan-copy"),
  billingStatusTitle: document.getElementById("billing-status-title"),
  billingStatusChip: document.getElementById("billing-status-chip"),
  billingStatusCopy: document.getElementById("billing-status-copy"),
  billingPlanValue: document.getElementById("billing-plan-value"),
  billingWindowValue: document.getElementById("billing-window-value"),
  billingProviderValue: document.getElementById("billing-provider-value"),
  billingProviderCopy: document.getElementById("billing-provider-copy"),
  billingProfileForm: document.getElementById("billing-profile-form"),
  billingLegalName: document.getElementById("billing-legal-name"),
  billingDocumentId: document.getElementById("billing-document-id"),
  billingMethod: document.getElementById("billing-method"),
  billingProfileSave: document.getElementById("billing-profile-save"),
  billingPlansList: document.getElementById("billing-plans-list"),
  billingCheckoutButton: document.getElementById("billing-checkout-button"),
  billingCheckoutResult: document.getElementById("billing-checkout-result"),
  billingResultTitle: document.getElementById("billing-result-title"),
  billingResultCopy: document.getElementById("billing-result-copy"),
  billingResultLink: document.getElementById("billing-result-link"),
  billingActionNote: document.getElementById("billing-action-note"),

  companyForm: document.getElementById("company-form"),
  holidayPrevMonth: document.getElementById("holiday-prev-month"),
  holidayNextMonth: document.getElementById("holiday-next-month"),
  holidayMonthLabel: document.getElementById("holiday-month-label"),
  holidayCalendarGrid: document.getElementById("holiday-calendar-grid"),
  holidaySelectedList: document.getElementById("holiday-selected-list"),
  serviceForm: document.getElementById("service-form"),
  servicesList: document.getElementById("services-list"),
  serviceReset: document.getElementById("service-reset"),

  professionalForm: document.getElementById("professional-form"),
  professionalServices: document.getElementById("professional-services"),
  professionalsList: document.getElementById("professionals-list"),
  professionalReset: document.getElementById("professional-reset"),

  clientForm: document.getElementById("client-form"),
  clientsList: document.getElementById("clients-list"),
  clientReset: document.getElementById("client-reset"),

  googleCalendarForm: document.getElementById("google-calendar-form"),
  googleCalendarOauth: document.getElementById("google-calendar-oauth"),
  googleCalendarDisconnect: document.getElementById("google-calendar-disconnect"),
  googleCalendarStatus: document.getElementById("google-calendar-status"),
  googleCalendarSummary: document.getElementById("google-calendar-summary"),
  googleCalendarFeedback: document.getElementById("google-calendar-feedback"),

  appointmentForm: document.getElementById("appointment-form"),
  appointmentReset: document.getElementById("appointment-reset"),
  appointmentSlotSummary: document.getElementById("appointment-slot-summary"),
  appointmentsList: document.getElementById("appointments-list"),
  filterDate: document.getElementById("filter-date"),
  filterStatus: document.getElementById("filter-status"),

  clientAppLink: document.getElementById("client-app-link"),
  copyClientLink: document.getElementById("copy-client-link"),
  copyFeedback: document.getElementById("copy-feedback"),
  openClientLink: document.getElementById("open-client-link")
};

bootstrap();

function bootstrap() {
  initMarketingMotion();
  bindEvents();
  const today = formatDateInput(new Date());
  els.filterDate.value = today;
  els.appointmentForm.elements.date.value = today;
  updateClientLink();
  renderHolidayCalendar();
  restoreSession();
}

function initMarketingMotion() {
  const revealItems = document.querySelectorAll(".reveal");
  if (!revealItems.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18 });

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 60, 240)}ms`;
    observer.observe(item);
  });
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLogin);
  els.logoutButton.addEventListener("click", handleLogout);
  els.companyForm.addEventListener("submit", saveCompany);
    if (els.billingProfileForm) {
      els.billingProfileForm.addEventListener("submit", saveBillingProfile);
    }
    if (els.billingCheckoutButton) {
      els.billingCheckoutButton.addEventListener("click", requestBillingCheckout);
    }
  els.holidayPrevMonth.addEventListener("click", () => changeHolidayMonth(-1));
  els.holidayNextMonth.addEventListener("click", () => changeHolidayMonth(1));
  els.serviceForm.addEventListener("submit", saveService);
  els.serviceReset.addEventListener("click", resetServiceForm);
  els.professionalForm.addEventListener("submit", saveProfessional);
  els.professionalReset.addEventListener("click", resetProfessionalForm);
  els.clientForm.addEventListener("submit", saveClient);
  els.clientReset.addEventListener("click", resetClientForm);
  els.googleCalendarForm.addEventListener("submit", saveGoogleIntegration);
  els.googleCalendarOauth.addEventListener("click", startGoogleOAuth);
  els.googleCalendarDisconnect.addEventListener("click", disconnectGoogleIntegration);
  els.appointmentForm.addEventListener("submit", saveAppointment);
  els.appointmentReset.addEventListener("click", resetAppointmentForm);
  els.appointmentForm.elements.serviceId.addEventListener("change", () => {
    syncAdminProfessionals();
    loadAdminAvailability();
  });
  els.appointmentForm.elements.professionalId.addEventListener("change", loadAdminAvailability);
  els.appointmentForm.elements.date.addEventListener("change", loadAdminAvailability);
  els.filterDate.addEventListener("change", loadAppointments);
  els.filterStatus.addEventListener("change", loadAppointments);
  els.copyClientLink.addEventListener("click", copyClientLink);
}

function updateClientLink() {
  const slug = String(state.company?.slug || "").trim();
  const link = slug
    ? `${window.location.origin}/agendar/${encodeURIComponent(slug)}`
    : `${window.location.origin}/cliente`;
  els.clientAppLink.value = link;
  els.openClientLink.href = link;
}

async function copyClientLink() {
  try {
    await copyToClipboard(els.clientAppLink.value);
    setFeedback(els.copyFeedback, "Link copiado com sucesso.", false);
  } catch {
    setFeedback(els.copyFeedback, "Não foi possível copiar o link automaticamente.", true);
  }
}

async function restoreSession() {
  if (!state.token) {
    showLoggedOut();
    return;
  }

  try {
    const session = await api("/auth/session");
    state.session = session.user;
    state.company = session.company;
    showLoggedIn();
    await loadAdminData();
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    state.token = "";
    showLoggedOut();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(els.loginForm);

  try {
    const data = await request("/auth/login", {
      method: "POST",
      body: {
        email: formData.get("email"),
        password: formData.get("password")
      }
    });
    state.token = data.token;
    state.session = data.user;
    state.company = data.company;
    localStorage.setItem(TOKEN_KEY, data.token);
    els.loginError.textContent = "";
    showLoggedIn();
    await loadAdminData();
  } catch (error) {
    els.loginError.textContent = error.message;
  }
}

async function handleLogout() {
  localStorage.removeItem(TOKEN_KEY);
  state.token = "";
  state.session = null;
  state.company = null;
  clearFeedback(els.adminFeedback);
  showLoggedOut();
}

function showLoggedOut() {
  els.loginView.classList.remove("hidden");
  els.appView.classList.add("hidden");
  els.sessionStatus.textContent = "offline";
}

function showLoggedIn() {
  els.loginView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.sessionStatus.textContent = "online";
}

async function loadAdminData() {
  try {
      const [dashboard, companyData, servicesData, professionalsData, clientsData, googleIntegrationData] = await Promise.all([
        api("/dashboard"),
        api("/company"),
        api("/services"),
        api("/professionals"),
        api("/clients"),
        api("/integrations/google")
      ]);

    state.company = companyData.company;
      state.services = servicesData.services;
      state.professionals = professionalsData.professionals;
      state.clients = clientsData.clients;
      state.googleIntegration = googleIntegrationData;
      state.billingOverview = null;
      state.billingCheckout = null;
      updateClientLink();

    renderDashboard(dashboard.stats);
    renderCompanyForm();
    renderServices();
    renderProfessionalServiceCheckboxes();
    renderProfessionals();
      renderClients();
      renderGoogleIntegration();
      populateAppointmentSelects();
      await loadAppointments();
      syncOperationalAccess();
  } catch (error) {
    setFeedback(els.adminFeedback, error.message || "Não foi possível atualizar o painel.", true);
  }
}

function renderDashboard(stats) {
  els.adminCompanyName.textContent = state.company?.name || "-";
  els.adminStatsProfessionals.textContent = String(stats.professionals || 0);
  els.adminStatsServices.textContent = String(stats.services || 0);
  els.adminStatsToday.textContent = String(stats.today || 0);
  els.metricProfessionals.textContent = String(stats.professionals || 0);
  els.metricServices.textContent = String(stats.services || 0);
  els.metricAppointments.textContent = String(stats.appointments || 0);
  renderOwnerSetup(stats);
}

function renderOwnerSetup(stats) {
  if (!els.ownerSetupList || !els.ownerSetupCopy || !els.ownerSetupProgress || !els.ownerSetupStatus) return;

  const hasSalonBase = Boolean(
    String(state.company?.name || "").trim() &&
    String(state.company?.phone || "").trim() &&
    String(state.company?.address || "").trim(),
  );
  const hasServices = state.services.length > 0;
  const hasProfessionals = state.professionals.length > 0;
  const canPublishLink = Boolean(String(state.company?.slug || "").trim()) && hasServices && hasProfessionals;
  const googleConnected = Boolean(state.googleIntegration?.googleCalendar?.connected);
  const steps = [
    {
      done: hasSalonBase,
      title: "Dados do salão",
      description: hasSalonBase
        ? "Nome, telefone e endereço já estão preenchidos para uso operacional."
        : "Preencha os dados principais do estabelecimento antes de divulgar o sistema.",
    },
    {
      done: hasServices,
      title: "Catálogo de serviços",
      description: hasServices
        ? `${state.services.length} serviço(s) cadastrado(s) para a agenda e o link público.`
        : "Cadastre os serviços que o salão realmente oferece, com duração e valor quando fizer sentido.",
    },
    {
      done: hasProfessionals,
      title: "Equipe configurada",
      description: hasProfessionals
        ? `${state.professionals.length} profissional(is) pronto(s) para receber vínculos de serviço e horários.`
        : "Adicione a equipe e vincule o que cada profissional realiza para liberar a escolha no agendamento.",
    },
    {
      done: canPublishLink,
      title: "Link público pronto",
      description: canPublishLink
        ? "O estabelecimento já pode compartilhar a página de agendamento com clientes."
        : "Assim que catálogo e equipe estiverem prontos, o link público fica preparado para divulgação.",
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const readinessCopy = completed === steps.length
    ? `Tudo pronto para operar. Hoje você tem ${stats.today || 0} agendamento(s) para acompanhar no painel.`
    : completed === 0
      ? "Comece pelos dados do salão e pela estrutura básica do catálogo para preparar a operação."
      : `Você já concluiu ${completed} etapa(s). Falta pouco para deixar o fluxo pronto para atendimento e divulgação.`;
  const statusLabel = completed === steps.length
    ? "Painel pronto"
    : completed >= 2
      ? "Configuração em andamento"
      : "Configuração inicial";
  const toneClass = completed === steps.length ? "is-success" : completed >= 2 ? "is-warn" : "is-muted";

  els.ownerSetupCopy.textContent = readinessCopy;
  els.ownerSetupProgress.textContent = `${completed} de ${steps.length} etapas concluídas`;
  els.ownerSetupStatus.textContent = statusLabel;
  els.ownerSetupStatus.className = `status-pill ${toneClass}`;
  els.ownerSetupList.innerHTML = steps
    .map((step) => `
      <article class="owner-check-item${step.done ? " is-complete" : ""}">
        <div class="owner-check-badge">${step.done ? "OK" : "•"}</div>
        <div class="owner-check-copy">
          <strong>${step.title}</strong>
          <p>${step.description}</p>
        </div>
      </article>
    `)
    .join("");

  if (googleConnected) {
    els.ownerSetupList.insertAdjacentHTML(
      "beforeend",
      `
        <article class="owner-check-item is-optional is-complete">
          <div class="owner-check-badge">+</div>
          <div class="owner-check-copy">
            <strong>Google Agenda conectada</strong>
            <p>A sincronização externa já está ativa para reduzir retrabalho na rotina do estabelecimento.</p>
          </div>
        </article>
      `,
    );
  }
}

function renderSubscriptionSummary() {
  if (!els.adminPlanName || !els.adminPlanCopy) return;
  const subscriptionState = getSubscriptionState(state.company?.subscription);
  els.adminPlanName.textContent = subscriptionState.planName;
  els.adminPlanCopy.textContent = subscriptionState.summary;
}

function renderCompanyForm() {
  if (!state.company) return;
  const form = els.companyForm.elements;
  form.name.value = state.company.name || "";
  form.address.value = state.company.address || "";
  form.phone.value = state.company.phone || "";
  form.logoUrl.value = state.company.logoUrl || "";
  form.instagram.value = state.company.instagram || "";
  form.facebook.value = state.company.facebook || "";
  form.openOnSaturday.checked = Boolean(state.company.openOnSaturday);
  form.openOnSunday.checked = Boolean(state.company.openOnSunday);
  form.reminderChannels.value = (state.company.reminderChannels || []).join(",");
  state.holidayPicker.selected = new Set(state.company.holidays || []);
  const firstHoliday = [...state.holidayPicker.selected].sort()[0];
  if (firstHoliday) {
    const [year, month] = firstHoliday.split("-").map(Number);
    state.holidayPicker.currentMonth = new Date(year, month - 1, 1);
  }
  syncHolidayField();
  renderHolidayCalendar();
}

function formatPlanName(planCode) {
  return {
    starter: "Starter",
    professional: "Professional",
    multi: "Multiunidade",
  }[String(planCode || "").toLowerCase()] || "Plano ativo";
}

function getSubscriptionState(subscription) {
  const source = subscription || {};
  const planName = formatPlanName(source.planCode);
  const billingStatus = String(source.billingStatus || "trialing").toLowerCase();
  const trialEndsAt = source.trialEndsAt || null;
  const subscriptionEndsAt = source.subscriptionEndsAt || null;
  const daysLeft = trialEndsAt ? getDaysUntil(trialEndsAt) : null;
  const trialExpired = trialEndsAt ? new Date(trialEndsAt).getTime() < Date.now() : false;

  if (billingStatus === "active") {
    return {
      planName,
      statusCode: "active",
      statusLabel: "Ativa",
      summary: subscriptionEndsAt
        ? `Assinatura ativa até ${formatShortDate(subscriptionEndsAt)}.`
        : "Assinatura ativa.",
      title: "Assinatura ativa",
      description: "Seu estabelecimento pode editar agenda, equipe, serviços e continuar recebendo agendamentos normalmente.",
      window: subscriptionEndsAt ? `Até ${formatShortDate(subscriptionEndsAt)}` : "Renovação ativa",
      note: "Na próxima etapa, vamos conectar a cobrança recorrente a este status automaticamente.",
      tone: "success",
      blocked: false,
      showBanner: false,
    };
  }

  if (billingStatus === "trialing" && !trialExpired) {
    const trialSummary =
      daysLeft > 1 ? `Teste grátis com ${daysLeft} dias restantes.` : daysLeft === 1 ? "Teste grátis termina amanhã." : "Teste grátis termina hoje.";
    return {
      planName,
      statusCode: "trialing",
      statusLabel: "Trial",
      summary: trialSummary,
      title: "Teste grátis ativo",
      description: "Seu estabelecimento pode operar normalmente durante o período de teste e depois seguir para a assinatura mensal.",
      window: trialEndsAt ? `Até ${formatShortDate(trialEndsAt)}` : "14 dias de teste",
      note: "Use este período para cadastrar equipe, serviços e validar o fluxo de agendamento com clientes reais.",
      tone: daysLeft !== null && daysLeft <= 3 ? "warn" : "success",
      blocked: false,
      showBanner: false,
    };
  }

  if (billingStatus === "past_due") {
    return {
      planName,
      statusCode: "past_due",
      statusLabel: "Pendente",
      summary: "Pagamento pendente. Regularize para manter o acesso completo.",
      title: "Pagamento pendente",
      description: "O painel continua visível, mas as edições e novos agendamentos ficam bloqueados até a regularização da assinatura.",
      window: "Cobrança pendente",
      note: "Quando o pagamento recorrente entrar, essa regularização poderá acontecer automaticamente.",
      tone: "danger",
      blocked: true,
      showBanner: true,
    };
  }

  if (billingStatus === "canceled") {
    return {
      planName,
      statusCode: "canceled",
      statusLabel: "Cancelada",
      summary: "Assinatura cancelada.",
      title: "Assinatura cancelada",
      description: "Seu estabelecimento está em modo de leitura. Reative a assinatura para voltar a editar o painel e receber novos agendamentos.",
      window: subscriptionEndsAt ? `Encerrada em ${formatShortDate(subscriptionEndsAt)}` : "Sem renovação",
      note: "A reativação da assinatura será a ponte entre o painel e a cobrança recorrente.",
      tone: "danger",
      blocked: true,
      showBanner: true,
    };
  }

  return {
    planName,
    statusCode: "expired",
    statusLabel: "Expirada",
    summary: "Teste grátis encerrado.",
    title: "Teste grátis encerrado",
    description: "O painel continua acessível para consulta, mas novas edições e novos agendamentos ficam bloqueados até a ativação da assinatura.",
    window: trialEndsAt ? `Encerrado em ${formatShortDate(trialEndsAt)}` : "Trial encerrado",
    note: "Este é o ponto ideal para ligar o status da conta ao pagamento recorrente.",
    tone: "danger",
    blocked: true,
    showBanner: true,
  };
}

  function renderBillingState() {
    if (
      !els.billingStatusTitle ||
      !els.billingStatusChip ||
      !els.billingStatusCopy ||
      !els.billingPlanValue ||
      !els.billingWindowValue ||
      !els.billingProviderValue ||
      !els.billingProviderCopy ||
      !els.billingActionNote ||
      !els.billingPlansList ||
      !els.billingCheckoutResult ||
      !els.billingBanner
    ) {
      return;
    }
    const subscriptionState = getSubscriptionState(state.company?.subscription);
    const billingOverview = state.billingOverview || { providers: [], recommendedProvider: "" };

  els.billingStatusTitle.textContent = subscriptionState.title;
  els.billingStatusChip.textContent = subscriptionState.statusLabel;
  els.billingStatusCopy.textContent = subscriptionState.description;
  els.billingPlanValue.textContent = subscriptionState.planName;
  els.billingWindowValue.textContent = subscriptionState.window;
  els.billingActionNote.textContent = subscriptionState.note;
  els.billingStatusChip.className = `status-pill ${getBillingToneClass(subscriptionState.tone)}`;
  els.billingProviderValue.textContent = formatProviderName(billingOverview.recommendedProvider || "asaas");
  els.billingProviderCopy.textContent = describeProviderSupport(
    billingOverview.recommendedProvider || "asaas",
    billingOverview.providerSettings?.asaas,
  );
  els.billingLegalName.value = state.company?.legalName || state.company?.name || "";
  els.billingDocumentId.value = formatDocumentForDisplay(state.company?.billingDocumentId || "");
  els.billingMethod.value = state.company?.billingMethod || "BOLETO";

  els.billingBannerBadge.textContent = subscriptionState.statusLabel;
  els.billingBannerTitle.textContent = subscriptionState.title;
  els.billingBannerText.textContent = subscriptionState.description;
  els.billingBannerBadge.className = `status-pill ${getBillingToneClass(subscriptionState.tone)}`;
  els.billingBanner.classList.toggle("hidden", !subscriptionState.showBanner);
  renderBillingPlans(subscriptionState);
  renderBillingCheckoutResult();
}

function syncOperationalAccess() {
  const subscriptionState = getSubscriptionState(state.company?.subscription);
  const blocked = subscriptionState.blocked;
  const managedForms = [
    els.companyForm,
    els.serviceForm,
    els.professionalForm,
    els.clientForm,
    els.googleCalendarForm,
    els.appointmentForm,
  ];

  managedForms.forEach((form) => setFormDisabled(form, blocked));

  [
    ...document.querySelectorAll("#services-list button, #professionals-list button, #clients-list button, #appointments-list button"),
  ].forEach((button) => {
    button.disabled = blocked;
  });

    els.copyClientLink.disabled = false;
    els.openClientLink.classList.remove("is-disabled");
    els.logoutButton.disabled = false;
    if (els.billingCheckoutButton) {
      els.billingCheckoutButton.disabled = false;
    }
    if (els.billingProfileSave) {
      els.billingProfileSave.disabled = false;
    }

  if (!blocked) {
    syncAppointmentComposerState();
  }
}

function syncAppointmentComposerState() {
  const form = els.appointmentForm?.elements;
  if (!form) return;
  const missingClients = !state.clients.length;
  const missingServices = !state.services.length;
  const missingProfessionals = !state.professionals.length;
  const submitButton = els.appointmentForm.querySelector('button[type="submit"]');
  const shouldDisable = missingClients || missingServices || missingProfessionals;

  form.clientId.disabled = missingClients;
  form.serviceId.disabled = missingServices;
  form.professionalId.disabled = missingServices || missingProfessionals;
  form.startAt.disabled = shouldDisable;
  if (submitButton) submitButton.disabled = shouldDisable;

  if (missingClients) {
    els.appointmentSlotSummary.textContent = "Cadastre ao menos um cliente para criar agendamentos no painel.";
    renderSelect(form.startAt, [], "Cadastre um cliente");
    return;
  }

  if (missingServices) {
    els.appointmentSlotSummary.textContent = "Cadastre ao menos um serviço para liberar a agenda.";
    renderSelect(form.startAt, [], "Cadastre um serviço");
    return;
  }

  if (missingProfessionals) {
    els.appointmentSlotSummary.textContent = "Cadastre ao menos um profissional para distribuir os horários.";
    renderSelect(form.startAt, [], "Cadastre um profissional");
    return;
  }

  if (!form.serviceId.value || !form.professionalId.value || !form.date.value) {
    els.appointmentSlotSummary.textContent = "Escolha serviço, profissional e data para listar os horários livres.";
    renderSelect(form.startAt, [], "Escolha um horário");
  }
}

function renderEmptyState(container, title, description) {
  container.innerHTML = `
    <div class="empty-box">
      <strong>${title}</strong>
      <p>${description}</p>
    </div>
  `;
}

function setFormDisabled(form, disabled) {
  if (!form) return;
  [...form.querySelectorAll("input, select, textarea, button")].forEach((field) => {
    field.disabled = disabled;
  });
}

function getBillingToneClass(tone) {
  return {
    success: "is-success",
    warn: "is-warn",
    danger: "is-danger",
  }[tone] || "is-muted";
}

function renderBillingPlans(subscriptionState) {
  const plans = state.billingOverview?.plans || [];
  els.billingPlansList.innerHTML = "";

  plans.forEach((plan) => {
    const article = document.createElement("article");
    const isCurrent = String(plan.code || "") === String(state.company?.subscription?.planCode || "");
    article.className = `billing-plan-card${isCurrent ? " is-current" : ""}`;
    article.innerHTML = `
      <div class="billing-plan-card-head">
        <strong>${plan.name}</strong>
        <span class="status-pill ${isCurrent ? "is-success" : ""}">${isCurrent ? "Atual" : plan.priceLabel}</span>
      </div>
      <p>${plan.description}</p>
      <ul class="billing-feature-list">
        ${plan.features.map((feature) => `<li>${feature}</li>`).join("")}
      </ul>
      <button type="button" class="${isCurrent ? "ghost-btn" : "primary-btn"}" data-plan-select="${plan.code}">
        ${isCurrent ? "Plano em uso" : `Escolher ${plan.name}`}
      </button>
    `;
    const button = article.querySelector("[data-plan-select]");
    button.disabled = isCurrent;
    button.addEventListener("click", () => selectBillingPlan(plan.code, subscriptionState));
    els.billingPlansList.appendChild(article);
  });
}

  async function selectBillingPlan(planCode, subscriptionState) {
    if (!els.billingLegalName || !els.billingDocumentId || !els.billingMethod) return;
    if (!planCode) return;
  try {
    const data = await api("/billing/checkout-session", {
      method: "POST",
      body: {
        planCode,
        provider: state.billingOverview?.recommendedProvider || "asaas",
        legalName: els.billingLegalName.value,
        billingDocumentId: els.billingDocumentId.value,
        billingMethod: els.billingMethod.value,
      },
    });
    state.company = {
      ...(data.company || state.company),
    };
    state.billingOverview = {
      ...(state.billingOverview || {}),
      ...(data.billing || {}),
      checkout: data.checkout,
    };
    state.billingCheckout = data.checkout || null;
    renderSubscriptionSummary();
    renderBillingState();
    setFeedback(
      els.adminFeedback,
      data.message || `Plano ${formatPlanName(planCode)} preparado para cobranca.`,
      false,
    );
  } catch (error) {
    setFeedback(els.adminFeedback, error.message || "Não foi possível preparar a cobrança.", true);
  }
}

  async function requestBillingCheckout() {
    if (!els.billingLegalName || !els.billingDocumentId || !els.billingMethod) return;
    const currentPlan = state.company?.subscription?.planCode || "starter";
    const subscriptionState = getSubscriptionState(state.company?.subscription);
    await selectBillingPlan(currentPlan, subscriptionState);
  }

  async function saveBillingProfile(event) {
    if (!els.billingLegalName || !els.billingDocumentId || !els.billingMethod) return;
    event.preventDefault();
  try {
    const data = await api("/billing/profile", {
      method: "POST",
      body: {
        legalName: els.billingLegalName.value,
        billingDocumentId: els.billingDocumentId.value,
        billingMethod: els.billingMethod.value,
      },
    });
    state.company = data.company || state.company;
    state.billingOverview = data.billing || state.billingOverview;
    renderSubscriptionSummary();
    renderBillingState();
    setFeedback(els.adminFeedback, data.message || "Dados de cobranca atualizados.", false);
  } catch (error) {
    setFeedback(els.adminFeedback, error.message || "Não foi possível atualizar os dados de cobrança.", true);
  }
}

  function renderBillingCheckoutResult() {
    if (!els.billingCheckoutResult || !els.billingResultTitle || !els.billingResultCopy || !els.billingResultLink) {
      return;
    }
    const checkout = state.billingCheckout;
  if (!checkout) {
    els.billingCheckoutResult.classList.add("hidden");
    return;
  }

  if (checkout.mode === "sales_contact") {
    els.billingResultTitle.textContent = "Plano consultivo";
    els.billingResultCopy.textContent = "O plano Multiunidade segue por atendimento consultivo. Vamos alinhar implantacao e cobranca junto com voce.";
    els.billingResultLink.classList.add("hidden");
  } else if (checkout.payment?.invoiceUrl || checkout.payment?.bankSlipUrl) {
    const paymentUrl = checkout.payment.invoiceUrl || checkout.payment.bankSlipUrl;
    els.billingResultTitle.textContent = "Cobranca pronta";
    els.billingResultCopy.textContent = checkout.payment.dueDate
      ? `A primeira cobranca da assinatura foi criada com vencimento em ${formatShortDate(checkout.payment.dueDate)}.`
      : "A primeira cobranca da assinatura foi criada no Asaas Sandbox.";
    els.billingResultLink.href = paymentUrl;
    els.billingResultLink.textContent = "Abrir cobranca";
    els.billingResultLink.classList.remove("hidden");
  } else {
    els.billingResultTitle.textContent = "Assinatura preparada";
    els.billingResultCopy.textContent = "A assinatura foi registrada. Assim que o primeiro pagamento estiver disponivel, vamos exibir o link aqui.";
    els.billingResultLink.classList.add("hidden");
  }

  els.billingCheckoutResult.classList.remove("hidden");
}

function formatProviderName(providerCode) {
  return {
    asaas: "Asaas",
    mercado_pago: "Mercado Pago",
    pagarme: "Pagar.me",
    stripe: "Stripe",
  }[String(providerCode || "").toLowerCase()] || "Provedor sugerido";
}

function describeProviderSupport(providerCode, providerSettings = {}) {
  return {
    asaas: providerSettings.configured
      ? `Ambiente ${String(providerSettings.mode || "sandbox").toLowerCase()} pronto para recorrencia com webhook e cobranca recorrente.`
      : "Configure o Asaas para usar recorrencia com webhook, boleto e cartao em uma operacao simples.",
    mercado_pago: "Boa escolha para alcance nacional e meios de pagamento familiares ao cliente brasileiro.",
    pagarme: "Boa escolha para times que querem mais controle sobre assinatura e antifraude.",
    stripe: "Boa escolha para operacao global ou futura expansao internacional.",
  }[String(providerCode || "").toLowerCase()] || "Base preparada para integrar recorrencia com checkout e webhook.";
}

function formatDocumentForDisplay(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return String(value || "");
}

function getDaysUntil(value) {
  const target = new Date(value);
  const now = new Date();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.ceil((targetDay - currentDay) / 86400000));
}

function formatShortDate(value) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function saveCompany(event) {
  event.preventDefault();
  try {
    const form = els.companyForm.elements;
    const data = await api("/company", {
      method: "PUT",
      body: {
        company: {
          name: form.name.value,
          slug: state.company?.slug || "",
          address: form.address.value,
          phone: form.phone.value,
          logoUrl: form.logoUrl.value,
          instagram: form.instagram.value,
          facebook: form.facebook.value,
          holidays: form.holidays.value,
          openOnSaturday: form.openOnSaturday.checked,
          openOnSunday: form.openOnSunday.checked,
          reminderChannels: form.reminderChannels.value
        }
      }
    });
    state.company = data.company;
    updateClientLink();
    renderCompanyForm();
    setFeedback(els.adminFeedback, "Dados do estabelecimento atualizados com sucesso.", false);
    setFeedback(els.copyFeedback, "Cadastro salvo. O link de agendamento ja pode ser compartilhado com seus clientes.", false);
  } catch (error) {
    setFeedback(els.adminFeedback, error.message || "Não foi possível salvar o estabelecimento.", true);
  }
}

function changeHolidayMonth(offset) {
  const current = state.holidayPicker.currentMonth;
  state.holidayPicker.currentMonth = new Date(current.getFullYear(), current.getMonth() + offset, 1);
  renderHolidayCalendar();
}

function renderHolidayCalendar() {
  const monthDate = state.holidayPicker.currentMonth;
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  els.holidayMonthLabel.textContent = monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  els.holidayCalendarGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i += 1) {
    const empty = document.createElement("span");
    empty.className = "calendar-day is-empty";
    els.holidayCalendarGrid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `calendar-day${state.holidayPicker.selected.has(dateKey) ? " is-selected" : ""}`;
    button.textContent = String(day);
    button.addEventListener("click", () => toggleHoliday(dateKey));
    els.holidayCalendarGrid.appendChild(button);
  }

  renderSelectedHolidays();
}

function toggleHoliday(dateKey) {
  if (state.holidayPicker.selected.has(dateKey)) {
    state.holidayPicker.selected.delete(dateKey);
  } else {
    state.holidayPicker.selected.add(dateKey);
  }
  syncHolidayField();
  renderHolidayCalendar();
}

function syncHolidayField() {
  els.companyForm.elements.holidays.value = [...state.holidayPicker.selected].sort().join(", ");
}

function renderSelectedHolidays() {
  const ordered = [...state.holidayPicker.selected].sort();
  els.holidaySelectedList.innerHTML = "";

  if (!ordered.length) {
    els.holidaySelectedList.innerHTML = '<span class="holiday-chip is-empty">Nenhum feriado selecionado</span>';
    return;
  }

  ordered.forEach((dateKey) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "holiday-chip";
    chip.textContent = new Date(`${dateKey}T12:00:00`).toLocaleDateString("pt-BR");
    chip.addEventListener("click", () => toggleHoliday(dateKey));
    els.holidaySelectedList.appendChild(chip);
  });
}

async function saveService(event) {
  event.preventDefault();
  try {
    const form = els.serviceForm.elements;
    const id = form.id.value;
    await api(id ? `/services/${id}` : "/services", {
      method: id ? "PUT" : "POST",
      body: {
        service: {
          name: form.name.value,
          category: form.category.value,
          duration: Number(form.duration.value),
          price: Number(form.price.value || 0),
          description: form.description.value
        }
      }
    });
    resetServiceForm();
    await loadAdminData();
    setFeedback(els.adminFeedback, id ? "Serviço atualizado com sucesso." : "Serviço criado com sucesso.", false);
  } catch (error) {
    setFeedback(els.adminFeedback, error.message || "Não foi possível salvar o serviço.", true);
  }
}

function resetServiceForm() {
  els.serviceForm.reset();
  els.serviceForm.elements.id.value = "";
}

function renderServices() {
  els.servicesList.innerHTML = "";
  if (!state.services.length) {
    renderEmptyState(
      els.servicesList,
      "Nenhum serviço cadastrado.",
      "Cadastre os primeiros serviços para liberar a agenda pública e vincular a equipe aos atendimentos."
    );
    return;
  }
  state.services.forEach((service) => {
    const article = document.createElement("article");
    article.className = "list-card";
    article.innerHTML = `
      <div class="list-card-main">
        <div class="list-card-head">
          <div>
            <p class="card-kicker">Serviço</p>
            <h4>${service.name}</h4>
          </div>
          <span class="price-pill">${service.price ? currency(service.price) : "Sob consulta"}</span>
        </div>
        <p class="meta-line">
          <span class="meta-pill">${service.category}</span>
          <span class="meta-pill">${service.duration} min</span>
        </p>
        <small>${service.description || "Sem descrição."}</small>
      </div>
      <div class="card-actions">
        <button type="button" class="ghost-btn" data-action="edit">Editar</button>
        <button type="button" class="ghost-btn danger" data-action="delete">Excluir</button>
      </div>
    `;
    article.querySelector('[data-action="edit"]').addEventListener("click", () => fillServiceForm(service));
    article.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!window.confirm(`Excluir o serviço "${service.name}"?`)) return;
      try {
        await api(`/services/${service.id}`, { method: "DELETE" });
        await loadAdminData();
        setFeedback(els.adminFeedback, "Serviço excluído com sucesso.", false);
      } catch (error) {
        setFeedback(els.adminFeedback, error.message || "Não foi possível excluir o serviço.", true);
      }
    });
    els.servicesList.appendChild(article);
  });
}

function fillServiceForm(service) {
  const form = els.serviceForm.elements;
  form.id.value = service.id;
  form.name.value = service.name;
  form.category.value = service.category;
  form.duration.value = String(service.duration);
  form.price.value = String(service.price || 0);
  form.description.value = service.description || "";
}

async function saveProfessional(event) {
  event.preventDefault();
  try {
    const form = els.professionalForm.elements;
    const id = form.id.value;
    await api(id ? `/professionals/${id}` : "/professionals", {
      method: id ? "PUT" : "POST",
      body: {
        professional: {
          name: form.name.value,
          specialty: form.specialty.value,
          photoUrl: form.photoUrl.value,
          bio: form.bio.value,
          daysOff: form.daysOff.value,
          serviceIds: [...els.professionalServices.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value),
          workingHours: readScheduleInputs("working"),
          breaks: readScheduleInputs("breaks")
        }
      }
    });
    resetProfessionalForm();
    await loadAdminData();
    setFeedback(els.adminFeedback, id ? "Profissional atualizado com sucesso." : "Profissional criado com sucesso.", false);
  } catch (error) {
    setFeedback(els.adminFeedback, error.message || "Não foi possível salvar o profissional.", true);
  }
}

function renderProfessionalServiceCheckboxes(selectedIds = []) {
  els.professionalServices.innerHTML = "";
  if (!state.services.length) {
    els.professionalServices.innerHTML = `
      <div class="empty-box">
        <strong>Cadastre os serviços primeiro.</strong>
        <p>Assim que houver serviços, você poderá marcar quais atendimentos cada profissional realiza.</p>
      </div>
    `;
    return;
  }
  state.services.forEach((service) => {
    const label = document.createElement("label");
    label.className = "check-row service-check";
    label.innerHTML = `
      <input type="checkbox" value="${service.id}" ${selectedIds.includes(service.id) ? "checked" : ""}>
      <span class="service-check-copy">
        <strong>${service.name}</strong>
        <small>${service.duration} min</small>
      </span>
    `;
    els.professionalServices.appendChild(label);
  });
}

function resetProfessionalForm() {
  els.professionalForm.reset();
  els.professionalForm.elements.id.value = "";
  renderProfessionalServiceCheckboxes();
  [...els.professionalForm.querySelectorAll("[data-day]")].forEach((input) => { input.value = ""; });
}

function renderProfessionals() {
  els.professionalsList.innerHTML = "";
  if (!state.professionals.length) {
    renderEmptyState(
      els.professionalsList,
      "Nenhum profissional cadastrado.",
      "Adicione a equipe para liberar a escolha de profissional no link público e organizar a disponibilidade."
    );
    return;
  }
  state.professionals.forEach((professional) => {
    const article = document.createElement("article");
    article.className = "list-card";
    article.innerHTML = `
      <div class="media-line">
        <img src="${professional.photoUrl || ""}" alt="${professional.name}">
        <div class="list-card-main">
          <div class="list-card-head">
            <div>
              <p class="card-kicker">Profissional</p>
              <h4>${professional.name}</h4>
            </div>
            <span class="meta-pill">${professional.serviceNames.length} serviço(s)</span>
          </div>
          <p>${professional.specialty}</p>
          <small>${professional.serviceNames.join(" • ") || "Nenhum serviço associado"}</small>
        </div>
      </div>
      <div class="card-actions">
        <button type="button" class="ghost-btn" data-action="edit">Editar</button>
        <button type="button" class="ghost-btn danger" data-action="delete">Excluir</button>
      </div>
    `;
    article.querySelector('[data-action="edit"]').addEventListener("click", () => fillProfessionalForm(professional));
    article.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!window.confirm(`Excluir o profissional "${professional.name}"?`)) return;
      try {
        await api(`/professionals/${professional.id}`, { method: "DELETE" });
        await loadAdminData();
        setFeedback(els.adminFeedback, "Profissional excluído com sucesso.", false);
      } catch (error) {
        setFeedback(els.adminFeedback, error.message || "Não foi possível excluir o profissional.", true);
      }
    });
    els.professionalsList.appendChild(article);
  });
}

function fillProfessionalForm(professional) {
  const form = els.professionalForm.elements;
  form.id.value = professional.id;
  form.name.value = professional.name;
  form.specialty.value = professional.specialty;
  form.photoUrl.value = professional.photoUrl || "";
  form.bio.value = professional.bio || "";
  form.daysOff.value = (professional.daysOff || []).join(", ");
  renderProfessionalServiceCheckboxes(professional.serviceIds || []);
  [...els.professionalForm.querySelectorAll("[data-day]")].forEach((input) => {
    const day = input.dataset.day;
    const type = input.dataset.type;
    const source = type === "working" ? professional.workingHours : professional.breaks;
    input.value = (source?.[day] || []).map((item) => `${item.start}-${item.end}`).join(", ");
  });
}

async function saveClient(event) {
  event.preventDefault();
  try {
    const form = els.clientForm.elements;
    const id = form.id.value;
    await api(id ? `/clients/${id}` : "/clients", {
      method: id ? "PUT" : "POST",
      body: {
        client: {
          name: form.name.value,
          phone: form.phone.value,
          email: form.email.value,
          notes: form.notes.value
        }
      }
    });
    resetClientForm();
    await loadAdminData();
    setFeedback(els.adminFeedback, id ? "Cliente atualizado com sucesso." : "Cliente criado com sucesso.", false);
  } catch (error) {
    setFeedback(els.adminFeedback, error.message || "Não foi possível salvar o cliente.", true);
  }
}

function resetClientForm() {
  els.clientForm.reset();
  els.clientForm.elements.id.value = "";
}

function renderClients() {
  els.clientsList.innerHTML = "";
  if (!state.clients.length) {
    renderEmptyState(
      els.clientsList,
      "Nenhum cliente salvo.",
      "Os primeiros clientes aparecem aqui quando você cadastrar manualmente ou receber agendamentos pelo link público."
    );
    return;
  }
  state.clients.forEach((client) => {
    const article = document.createElement("article");
    article.className = "list-card";
    article.innerHTML = `
      <div class="list-card-main">
        <div class="list-card-head">
          <div>
            <p class="card-kicker">${client.appointmentsCount > 1 ? "Cliente recorrente" : "Cliente"}</p>
            <h4>${client.name}</h4>
          </div>
          <span class="meta-pill">${client.appointmentsCount} agendamento(s)</span>
        </div>
        <p>${client.phone || "Sem telefone"} • ${client.email || "Sem e-mail"}</p>
        <small>${client.appointmentsCount} agendamento(s) • último: ${client.lastServiceAt ? formatDateTime(client.lastServiceAt) : "nunca"}</small>
      </div>
      <div class="card-actions">
        <button type="button" class="ghost-btn" data-action="edit">Editar</button>
        <button type="button" class="ghost-btn danger" data-action="delete">Excluir</button>
      </div>
    `;
    article.querySelector('[data-action="edit"]').addEventListener("click", () => fillClientForm(client));
    article.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!window.confirm(`Excluir o cliente "${client.name}"?`)) return;
      try {
        await api(`/clients/${client.id}`, { method: "DELETE" });
        await loadAdminData();
        setFeedback(els.adminFeedback, "Cliente excluído com sucesso.", false);
      } catch (error) {
        setFeedback(els.adminFeedback, error.message || "Não foi possível excluir o cliente.", true);
      }
    });
    els.clientsList.appendChild(article);
  });
}

function fillClientForm(client) {
  const form = els.clientForm.elements;
  form.id.value = client.id;
  form.name.value = client.name;
  form.phone.value = client.phone || "";
  form.email.value = client.email || "";
  form.notes.value = client.notes || "";
}

function renderGoogleIntegration() {
  const integration = state.googleIntegration?.googleCalendar || {
    connected: false,
    calendarId: "",
    accountEmail: "",
    lastSyncAt: null,
    syncMode: "manual"
  };
  const oauthUsable = Boolean(state.googleIntegration?.oauthUsable);
  const oauthCompleted = Boolean(integration.oauthCompleted);
  els.googleCalendarStatus.textContent = integration.connected ? "Conectado" : "Não conectado";
  const syncLabel = integration.lastSyncAt
    ? ` Última atualização: ${formatTimestamp(integration.lastSyncAt)}.`
    : "";
  const oauthStateLabel = oauthCompleted
    ? "Sincronizacao ativa."
    : integration.connected && oauthUsable
        ? "Autorização pendente."
        : integration.connected
        ? "Conexão salva."
        : "Nenhuma agenda configurada ainda.";
  els.googleCalendarSummary.textContent = integration.connected
    ? `${integration.accountEmail || "Conta principal"} conectada.${syncLabel} ${oauthStateLabel}`.trim()
    : "Nenhuma agenda configurada ainda.";
  els.googleCalendarForm.elements.accountEmail.value = integration.accountEmail || "";
  els.googleCalendarForm.elements.calendarId.value = integration.calendarId || "primary";
  els.googleCalendarDisconnect.disabled = !integration.connected;
  els.googleCalendarOauth.disabled = !oauthUsable || !integration.connected;
}

async function saveGoogleIntegration(event) {
  event.preventDefault();
  try {
    const form = els.googleCalendarForm.elements;
    if (!String(form.accountEmail.value || "").trim()) {
      setFeedback(els.googleCalendarFeedback, "Informe o e-mail da conta Google para salvar a integração.", true);
      return;
    }
    const data = await api("/integrations/google/connect", {
      method: "POST",
      body: {
        accountEmail: form.accountEmail.value,
        calendarId: form.calendarId.value || "primary",
        connected: true
      }
    });
    state.googleIntegration = {
      ...(state.googleIntegration || {}),
      googleCalendar: data.googleCalendar,
    };
    renderGoogleIntegration();
    setFeedback(els.googleCalendarFeedback, "Conexão com Google Agenda salva com sucesso.", false);
    setFeedback(els.adminFeedback, "Integração do Google Agenda atualizada.", false);
  } catch (error) {
    setFeedback(els.googleCalendarFeedback, error.message || "Não foi possível salvar a integração do Google Agenda.", true);
  }
}

async function disconnectGoogleIntegration() {
  if (!window.confirm("Desconectar a agenda Google deste salão?")) return;
  try {
    const data = await api("/integrations/google", { method: "DELETE" });
    state.googleIntegration = {
      ...(state.googleIntegration || {}),
      googleCalendar: data.googleCalendar,
    };
    renderGoogleIntegration();
    clearFeedback(els.googleCalendarFeedback);
    setFeedback(els.adminFeedback, "Integração do Google Agenda desconectada.", false);
  } catch (error) {
    setFeedback(els.googleCalendarFeedback, error.message || "Não foi possível desconectar a agenda Google.", true);
  }
}

async function startGoogleOAuth() {
  try {
    const form = els.googleCalendarForm.elements;
    if (!Boolean(state.googleIntegration?.oauthUsable)) {
      setFeedback(
        els.googleCalendarFeedback,
        state.googleIntegration?.oauthMessage || "OAuth do Google ainda não está pronto para uso real neste ambiente.",
        true,
      );
      return;
    }
    if (!String(form.accountEmail.value || "").trim()) {
      setFeedback(els.googleCalendarFeedback, "Salve primeiro o e-mail da conta Google antes de autorizar.", true);
      return;
    }
    const data = await api("/integrations/google/oauth/start", {
      method: "POST",
      body: {
        accountEmail: form.accountEmail.value,
        calendarId: form.calendarId.value || "primary",
      }
    });
    state.googleIntegration = {
      ...(state.googleIntegration || {}),
      googleCalendar: data.googleCalendar,
    };
    renderGoogleIntegration();
    window.open(data.authUrl, "_blank", "noopener,noreferrer");
    setFeedback(els.googleCalendarFeedback, "Janela de autorização aberta. Conclua o login no Google e volte ao painel.", false);
  } catch (error) {
    setFeedback(els.googleCalendarFeedback, error.message || "Não foi possível iniciar a autorização do Google.", true);
  }
}

function populateAppointmentSelects() {
  renderSelect(els.appointmentForm.elements.clientId, state.clients, "Selecione um cliente", (item) => ({
    value: item.id,
    label: `${item.name} • ${item.phone || item.email || "sem contato"}`
  }));
  renderSelect(els.appointmentForm.elements.serviceId, state.services, "Selecione um serviço", (item) => ({
    value: item.id,
    label: `${item.name} • ${item.duration} min`
  }));
  syncAdminProfessionals();
  syncAppointmentComposerState();
}

function syncAdminProfessionals() {
  const serviceId = els.appointmentForm.elements.serviceId.value;
  const professionals = state.professionals.filter((professional) => !serviceId || professional.serviceIds.includes(serviceId));
  renderSelect(els.appointmentForm.elements.professionalId, professionals, "Selecione um profissional", (item) => ({
    value: item.id,
    label: `${item.name} • ${item.specialty}`
  }));
  syncAppointmentComposerState();
}

async function loadAdminAvailability() {
  const form = els.appointmentForm.elements;
  const serviceId = form.serviceId.value;
  const professionalId = form.professionalId.value;
  const date = form.date.value;
  if (!serviceId || !professionalId || !date) {
    renderSelect(form.startAt, [], "Selecione os filtros");
    els.appointmentSlotSummary.textContent = "Escolha serviço, profissional e data para listar os horários livres.";
    return;
  }
  try {
    const data = await api(`/public/availability?serviceId=${serviceId}&professionalId=${professionalId}&date=${date}`);
    renderSlotOptions(form.startAt, data.slots, "Sem horários livres");
    const currentAppointment = state.appointments.find((item) => item.id === state.editing.appointmentId);
    if (currentAppointment?.startAt?.startsWith(date) && currentAppointment.professionalId === professionalId && currentAppointment.serviceId === serviceId) {
      ensureCurrentSlotOption(form.startAt, currentAppointment.startAt);
    }
    els.appointmentSlotSummary.textContent = data.slots.length ? `${data.slots.length} horário(s) livres encontrados.` : "Nenhum horário livre para este filtro.";
  } catch (error) {
    renderSelect(form.startAt, [], "Não foi possível carregar");
    els.appointmentSlotSummary.textContent = error.message || "Não foi possível carregar a disponibilidade.";
  }
}

async function saveAppointment(event) {
  event.preventDefault();
  const form = els.appointmentForm.elements;
  if (!form.startAt.value) {
    els.appointmentSlotSummary.textContent = "Selecione um horário válido.";
    return;
  }
  try {
    const id = form.id.value;
    await api(id ? `/appointments/${id}` : "/appointments", {
      method: id ? "PUT" : "POST",
      body: {
        clientId: form.clientId.value,
        serviceId: form.serviceId.value,
        professionalId: form.professionalId.value,
        startAt: form.startAt.value,
        status: form.status.value,
        notes: form.notes.value
      }
    });
    resetAppointmentForm();
    await loadAdminData();
    setFeedback(els.adminFeedback, id ? "Agendamento atualizado com sucesso." : "Agendamento criado com sucesso.", false);
  } catch (error) {
    setFeedback(els.adminFeedback, error.message || "Não foi possível salvar o agendamento.", true);
    els.appointmentSlotSummary.textContent = error.message || "Não foi possível salvar o agendamento.";
  }
}

function resetAppointmentForm() {
  els.appointmentForm.reset();
  els.appointmentForm.elements.id.value = "";
  state.editing.appointmentId = "";
  els.appointmentForm.elements.date.value = formatDateInput(new Date());
  populateAppointmentSelects();
  renderSelect(els.appointmentForm.elements.startAt, [], "Escolha um horário");
  els.appointmentSlotSummary.textContent = "Escolha serviço, profissional e data para listar os horários livres.";
}

async function loadAppointments() {
  if (!state.token) return;
  const date = els.filterDate.value ? `date=${els.filterDate.value}` : "";
  const status = els.filterStatus.value ? `status=${els.filterStatus.value}` : "";
  const query = [date, status].filter(Boolean).join("&");
  const data = await api(`/appointments${query ? `?${query}` : ""}`);
  state.appointments = data.appointments;
  renderAppointments();
  els.metricAppointments.textContent = String(state.appointments.filter((item) => item.status !== "cancelado").length);
}

function renderAppointments() {
  els.appointmentsList.innerHTML = "";
  if (!state.appointments.length) {
    els.appointmentsList.innerHTML = `<div class="empty-box">Nenhum agendamento encontrado para o filtro atual.</div>`;
    return;
  }
  state.appointments.forEach((appointment) => {
    const article = document.createElement("article");
    article.className = `appointment-card appointment-card--${appointment.status}`;
    if (isTodayAppointment(appointment.startAt)) {
      article.classList.add("appointment-card--today");
    }
    const canConfirm = appointment.status !== "confirmado" && appointment.status !== "cancelado" && appointment.status !== "concluido";
    const canComplete = appointment.status !== "concluido" && appointment.status !== "cancelado";
    const canCancel = appointment.status !== "cancelado";
    const googleSyncLabel = formatGoogleSyncSummary(appointment.googleSync);
    const googleSyncTone = getGoogleSyncTone(appointment.googleSync?.status);
    const displayTime = formatTimeLabel(appointment.startAt);
    const displayDate = formatDateLabel(appointment.startAt);
    const contactLabel = appointment.clientPhone || appointment.clientEmail || "Sem contato";
    article.innerHTML = `
      <div class="appointment-time-block">
        <strong>${displayTime}</strong>
        <span>${displayDate}</span>
      </div>
      <div class="list-card-main">
        <div class="appointment-top">
          <div>
            <p class="card-kicker">Cliente</p>
            <h4>${appointment.clientName}</h4>
          </div>
          <span class="status-tag ${appointment.status}">${formatStatusLabel(appointment.status)}</span>
        </div>
        <div class="appointment-service-line">
          <strong>${appointment.serviceName}</strong>
          <span>com ${appointment.professionalName}</span>
        </div>
        <div class="appointment-meta">
          <span class="meta-pill">${contactLabel}</span>
          <span class="meta-pill">${appointment.serviceDuration} min</span>
          <span class="sync-pill ${googleSyncTone}">${googleSyncLabel}</span>
        </div>
        <p class="appointment-note">${appointment.notes || "Sem observações."}</p>
      </div>
      <div class="card-actions appointment-actions">
        <button type="button" class="ghost-btn" data-action="edit">Reagendar</button>
        <button type="button" class="ghost-btn" data-action="confirm" ${canConfirm ? "" : "disabled"}>Confirmar</button>
        <button type="button" class="ghost-btn" data-action="complete" ${canComplete ? "" : "disabled"}>Concluir</button>
        <button type="button" class="ghost-btn danger" data-action="cancel" ${canCancel ? "" : "disabled"}>Cancelar</button>
      </div>
    `;
    article.querySelector('[data-action="edit"]').addEventListener("click", async () => {
      await fillAppointmentForm(appointment);
      setFeedback(els.adminFeedback, `Editando agendamento de ${appointment.clientName}.`, false);
      els.appointmentForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    article.querySelector('[data-action="confirm"]').addEventListener("click", () =>
      updateAppointmentStatus(appointment, "confirmado", `Agendamento de ${appointment.clientName} confirmado.`),
    );
    article.querySelector('[data-action="complete"]').addEventListener("click", () =>
      updateAppointmentStatus(appointment, "concluido", `Atendimento de ${appointment.clientName} concluido.`),
    );
    article.querySelector('[data-action="cancel"]').addEventListener("click", () =>
      updateAppointmentStatus(appointment, "cancelado", `Agendamento de ${appointment.clientName} cancelado.`, true),
    );
    els.appointmentsList.appendChild(article);
  });
}

async function updateAppointmentStatus(appointment, status, successMessage, requireConfirmation = false) {
  if (requireConfirmation && !window.confirm(`Cancelar o agendamento de ${appointment.clientName}?`)) return;
  try {
    await api(`/appointments/${appointment.id}`, { method: "PUT", body: { status } });
    await loadAdminData();
    setFeedback(els.adminFeedback, successMessage, false);
  } catch (error) {
    setFeedback(els.adminFeedback, error.message || "Não foi possível atualizar o status do agendamento.", true);
  }
}

async function fillAppointmentForm(appointment) {
  state.editing.appointmentId = appointment.id;
  const form = els.appointmentForm.elements;
  form.id.value = appointment.id;
  form.clientId.value = appointment.clientId;
  form.serviceId.value = appointment.serviceId;
  syncAdminProfessionals();
  form.professionalId.value = appointment.professionalId;
  form.status.value = appointment.status;
  form.date.value = appointment.startAt.slice(0, 10);
  form.notes.value = appointment.notes || "";
  await loadAdminAvailability();
  ensureCurrentSlotOption(form.startAt, appointment.startAt);
  form.startAt.value = appointment.startAt;
}

function renderSelect(select, items, placeholder, mapItem = (item) => ({ value: item.id, label: item.name })) {
  const previous = select.value;
  select.innerHTML = "";
  const initial = document.createElement("option");
  initial.value = "";
  initial.textContent = placeholder;
  select.appendChild(initial);
  items.forEach((item) => {
    const option = document.createElement("option");
    const mapped = mapItem(item);
    option.value = mapped.value;
    option.textContent = mapped.label;
    select.appendChild(option);
  });
  if ([...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
}

function renderSlotOptions(select, slots, emptyLabel) {
  select.innerHTML = "";
  const initial = document.createElement("option");
  initial.value = "";
  initial.textContent = emptyLabel;
  select.appendChild(initial);
  slots.forEach((slot) => {
    const option = document.createElement("option");
    option.value = slot.startAt;
    option.textContent = slot.label;
    select.appendChild(option);
  });
}

function ensureCurrentSlotOption(select, startAt) {
  if (!startAt) return;
  if ([...select.options].some((option) => option.value === startAt)) return;
  const option = document.createElement("option");
  option.value = startAt;
  option.textContent = `${startAt.slice(11, 16)} - horário atual`;
  select.appendChild(option);
}

function readScheduleInputs(type) {
  const inputs = [...els.professionalForm.querySelectorAll(`[data-type="${type}"]`)];
  const output = {};
  inputs.forEach((input) => {
    const ranges = parseRangeText(input.value);
    if (ranges.length) output[input.dataset.day] = ranges;
  });
  return output;
}

function parseRangeText(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean).map((item) => item.split("-").map((part) => part.trim())).filter((parts) => parts.length === 2).map(([start, end]) => ({ start, end }));
}

function setFeedback(element, text, isError) {
  element.textContent = text;
  element.className = `feedback ${isError ? "error" : "success"}`;
}

function clearFeedback(element) {
  element.textContent = "";
  element.className = "feedback";
}

function formatStatusLabel(status) {
  return {
    pendente: "Pendente",
    confirmado: "Confirmado",
    concluido: "Concluído",
    cancelado: "Cancelado",
    faltou: "Faltou"
  }[status] || status;
}

function formatGoogleSyncSummary(googleSync) {
  if (!googleSync) return "Google Agenda: sem configuracao.";
  const labels = {
    not_configured: "Google Agenda: não configurado.",
    pending_oauth: "Google Agenda: aguardando autorizacao OAuth.",
    pending_create: "Google Agenda: criacao pendente.",
    pending_update: "Google Agenda: atualização pendente.",
    pending_cancel: "Google Agenda: cancelamento pendente.",
    synced: "Google Agenda: sincronizado.",
    sync_error: `Google Agenda: erro ${googleSync.error || "na sincronizacao"}.`
  };
  return labels[googleSync.status] || `Google Agenda: ${googleSync.status}.`;
}

function getGoogleSyncTone(status) {
  const tones = {
    not_configured: "is-muted",
    pending_oauth: "is-warn",
    pending_create: "is-warn",
    pending_update: "is-warn",
    pending_cancel: "is-warn",
    synced: "is-success",
    sync_error: "is-danger"
  };
  return tones[status] || "is-muted";
}

function formatDateTime(value) {
  if (!value) return "-";
  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour = "00", minute = "00"] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    return Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime())
    ? "-"
    : fallback.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isTodayAppointment(value) {
  if (!value) return false;
  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return false;
  const [, year, month, day] = match;
  const today = formatDateInput(new Date());
  return `${year}-${month}-${day}` === today;
}

function formatTimeLabel(value) {
  if (!value) return "--:--";
  const normalized = String(value).trim();
  const match = normalized.match(/(?:T|\s)?(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "--:--";
}

function formatDateLabel(value) {
  if (!value) return "-";
  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime())
    ? "-"
    : fallback.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

async function api(path, options = {}) {
  return request(path, {
    ...options,
    headers: { Authorization: `Bearer ${state.token}`, ...(options.headers || {}) }
  });
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (!headers.Authorization) delete headers.Authorization;
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Falha na requisicao.");
  return data;
}

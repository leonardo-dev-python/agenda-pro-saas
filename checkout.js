const API_BASE = "/api";
const TOKEN_KEY = "agendapro-token";

const PLAN_CONFIG = {
  professional: {
    name: "Agenda Pro",
    price: "R$ 129,90/mês",
    description: "Assinatura mensal com recorrência por boleto bancário ou cartão de crédito.",
  },
};

const form = document.getElementById("checkout-form");
const feedback = document.getElementById("checkout-feedback");
const planInput = form?.querySelector('input[name="plan"]');
const selectedPlanName = document.getElementById("selected-plan-name");
const selectedPlanPrice = document.getElementById("selected-plan-price");
const selectedPlanDescription = document.getElementById("selected-plan-description");
const paymentMethodInputs = Array.from(document.querySelectorAll('input[name="billingMethod"]'));
const primaryStage = document.getElementById("checkout-primary-stage");
const cardStep = document.getElementById("checkout-card-step");
const cardSection = document.getElementById("checkout-card-fields");
const cardInputs = cardSection ? Array.from(cardSection.querySelectorAll("input")) : [];
const continueButton = document.getElementById("checkout-continue-button");
const backButton = document.getElementById("checkout-back-button");
const stepIndicatorDetails = document.getElementById("step-indicator-details");
const stepIndicatorPayment = document.getElementById("step-indicator-payment");
const successPanel = document.getElementById("checkout-success");
const successTitle = document.getElementById("checkout-success-title");
const successCopy = document.getElementById("checkout-success-copy");
const successPaymentLink = document.getElementById("checkout-success-payment-link");
const successDashboardLink = document.getElementById("checkout-success-dashboard-link");
const boletoPanel = document.getElementById("checkout-boleto-panel");
const boletoDueDate = document.getElementById("checkout-boleto-due-date");
const boletoStatus = document.getElementById("checkout-boleto-status");
const boletoIdentificationField = document.getElementById("checkout-boleto-identification-field");
const boletoCopyButton = document.getElementById("checkout-copy-boleto-button");
const boletoDownloadLink = document.getElementById("checkout-download-boleto-link");
const cancelAnytimeCopy = document.getElementById("checkout-cancel-anytime-copy");

let checkoutStep = "details";

hydratePlanFromQuery();
syncPaymentMethodCards();
setPaymentMethod(getSelectedPaymentMethod());
updateCheckoutStep();
paymentMethodInputs.forEach((input) =>
  input.addEventListener("change", () => {
    syncPaymentMethodCards();
    setPaymentMethod(getSelectedPaymentMethod());
  }),
);
form?.addEventListener("submit", handleCheckoutSubmit);
continueButton?.addEventListener("click", handleContinue);
backButton?.addEventListener("click", () => {
  checkoutStep = "details";
  updateCheckoutStep();
});
boletoCopyButton?.addEventListener("click", handleCopyBoletoLine);

function hydratePlanFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const requestedPlan = params.get("plan") || planInput?.value || "professional";
  setPlan(requestedPlan);
}

function setPlan(planCode) {
  const normalizedPlan = PLAN_CONFIG[planCode] ? planCode : "professional";
  const plan = PLAN_CONFIG[normalizedPlan];

  if (planInput) {
    planInput.value = normalizedPlan;
  }

  if (selectedPlanName) selectedPlanName.textContent = plan.name;
  if (selectedPlanPrice) selectedPlanPrice.textContent = plan.price;
  if (selectedPlanDescription) selectedPlanDescription.textContent = plan.description;
}

function getSelectedPaymentMethod() {
  return paymentMethodInputs.find((input) => input.checked)?.value || "BOLETO";
}

function setPaymentMethod(method) {
  const isCreditCard = method === "CREDIT_CARD";

  cardInputs.forEach((input) => {
    input.required = isCreditCard;
    if (!isCreditCard) input.value = "";
  });

  if (cancelAnytimeCopy) {
    cancelAnytimeCopy.textContent = isCreditCard
      ? "O cartão entra em recorrência mensal de 30 em 30 dias. Você pode cancelar a assinatura quando quiser."
      : "O boleto é renovado a cada 30 dias. Você pode cancelar a assinatura quando quiser antes da próxima emissão.";
  }

  if (!isCreditCard && checkoutStep === "card") {
    checkoutStep = "details";
  }

  if (continueButton) {
    continueButton.textContent = isCreditCard ? "Continuar para os dados do cartão" : "Gerar primeiro boleto";
  }

  updateCheckoutStep();
}

function syncPaymentMethodCards() {
  paymentMethodInputs.forEach((input) => {
    input.closest(".checkout-method-card")?.classList.toggle("is-selected", input.checked);
  });
}

function updateCheckoutStep() {
  const isCardFlow = getSelectedPaymentMethod() === "CREDIT_CARD";
  const showCardStep = isCardFlow && checkoutStep === "card";

  primaryStage?.classList.toggle("hidden", showCardStep);
  cardStep?.classList.toggle("hidden", !showCardStep);
  stepIndicatorDetails?.classList.toggle("is-active", !showCardStep);
  stepIndicatorDetails?.classList.toggle("is-complete", showCardStep);
  stepIndicatorPayment?.classList.toggle("is-active", showCardStep);
  stepIndicatorPayment?.classList.toggle("is-visible", isCardFlow);
}

function handleContinue() {
  if (!form || !feedback) return;

  const billingMethod = getSelectedPaymentMethod();
  if (billingMethod === "CREDIT_CARD") {
    const requiredFields = Array.from(primaryStage?.querySelectorAll("input[required]") || []);
    const firstInvalid = requiredFields.find((input) => !input.reportValidity());
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    feedback.textContent = "";
    feedback.className = "feedback";
    checkoutStep = "card";
    updateCheckoutStep();
    cardInputs[0]?.focus();
    cardStep?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  form.requestSubmit();
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();
  if (!form || !feedback) return;

  if (getSelectedPaymentMethod() === "CREDIT_CARD" && checkoutStep !== "card") {
    handleContinue();
    return;
  }

  const data = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');

  try {
    if (submitButton) submitButton.disabled = true;
    feedback.textContent = "Criando conta e configurando a recorrência...";
    feedback.className = "feedback";

    const billingMethod = String(data.get("billingMethod") || "BOLETO").trim().toUpperCase();
    const payload = {
      ownerName: String(data.get("ownerName") || "").trim(),
      salonName: String(data.get("salonName") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      password: String(data.get("password") || ""),
      planCode: String(data.get("plan") || "professional").trim(),
      legalName: String(data.get("legalName") || "").trim(),
      billingDocumentId: String(data.get("billingDocumentId") || "").trim(),
      billingMethod,
      postalCode: String(data.get("postalCode") || "").trim(),
      addressNumber: String(data.get("addressNumber") || "").trim(),
      addressComplement: String(data.get("addressComplement") || "").trim(),
    };

    if (billingMethod === "CREDIT_CARD") {
      payload.card = {
        holderName: String(data.get("cardHolderName") || "").trim(),
        number: String(data.get("cardNumber") || "").trim(),
        expiryMonth: String(data.get("cardExpiryMonth") || "").trim(),
        expiryYear: String(data.get("cardExpiryYear") || "").trim(),
        ccv: String(data.get("cardCcv") || "").trim(),
      };
    }

    const response = await request("/public/checkout/subscribe", {
      method: "POST",
      body: payload,
    });

    localStorage.setItem(TOKEN_KEY, response.token);
    renderSuccess(response.checkout, billingMethod);
    feedback.textContent = response.message || "Conta criada com sucesso.";
    feedback.className = "feedback success";
  } catch (error) {
    feedback.textContent = error.message || "Não foi possível concluir o checkout.";
    feedback.className = "feedback error";
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function renderSuccess(checkout, billingMethod) {
  if (!successPanel || !successTitle || !successCopy || !successDashboardLink || !successPaymentLink) return;
  const accessAllowed = Boolean(checkout?.accessAllowed);
  const payment = checkout?.payment || null;

  boletoPanel?.classList.add("hidden");
  boletoDownloadLink?.classList.add("hidden");
  successPaymentLink.classList.add("hidden");

  if (billingMethod === "BOLETO") {
    successTitle.textContent = "Primeiro boleto pronto";
    successCopy.textContent = payment?.dueDate
      ? `A primeira cobrança foi criada com vencimento em ${formatShortDate(payment.dueDate)}. As próximas renovações seguem em recorrência de 30 em 30 dias.`
      : "A primeira cobrança por boleto foi criada e as próximas renovações seguem em recorrência de 30 em 30 dias.";
    if (payment?.invoiceUrl || payment?.bankSlipUrl) {
      successPaymentLink.href = payment.invoiceUrl || payment.bankSlipUrl;
      successPaymentLink.textContent = "Abrir boleto";
      successPaymentLink.classList.remove("hidden");
    }

    if (boletoPanel) {
      boletoPanel.classList.remove("hidden");
      if (boletoDueDate) boletoDueDate.textContent = payment?.dueDate ? formatShortDate(payment.dueDate) : "-";
      if (boletoStatus) boletoStatus.textContent = readBoletoStatus(payment?.status);
      if (boletoIdentificationField) {
        boletoIdentificationField.textContent = payment?.identificationField || "Linha digitável indisponível no momento.";
      }
      if (boletoDownloadLink && payment?.bankSlipUrl) {
        boletoDownloadLink.href = payment.bankSlipUrl;
        boletoDownloadLink.classList.remove("hidden");
      }
    }
  } else {
    successTitle.textContent = accessAllowed ? "Assinatura mensal ativada" : "Pagamento em análise";
    successCopy.textContent = accessAllowed
      ? "O cartão foi registrado para a recorrência mensal e o estabelecimento já pode seguir para a configuração do painel."
      : "A recorrência foi registrada, mas o primeiro pagamento ainda precisa ser confirmado para liberar o uso completo do painel.";
  }

  successDashboardLink.href = checkout?.postCheckoutRoute || (accessAllowed ? "/estabelecimento" : "/assinatura");
  successDashboardLink.textContent = accessAllowed ? "Ir para o painel" : "Acompanhar assinatura";
  successPanel.classList.remove("hidden");
  successPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function formatShortDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function readBoletoStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "PENDING") return "Aguardando pagamento";
  if (normalized === "OVERDUE") return "Boleto vencido";
  if (normalized === "CONFIRMED" || normalized === "RECEIVED") return "Pagamento confirmado";
  return "Boleto emitido";
}

async function handleCopyBoletoLine() {
  const value = boletoIdentificationField?.textContent?.trim();
  if (!value || value === "-" || value.includes("indisponível")) return;

  try {
    await navigator.clipboard.writeText(value);
    if (feedback) {
      feedback.textContent = "Linha digitável copiada com sucesso.";
      feedback.className = "feedback success";
    }
  } catch (error) {
    if (feedback) {
      feedback.textContent = "Não foi possível copiar a linha digitável automaticamente.";
      feedback.className = "feedback error";
    }
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Falha na requisição.");
  return data;
}

const API_BASE = "/api";
const TOKEN_KEY = "agendapro-token";

const PLAN_CONFIG = {
  starter: {
    name: "Starter",
    price: "R$ 79/mensal",
    description: "Para organizar a agenda e sair do improviso.",
  },
  professional: {
    name: "Professional",
    price: "R$ 149/mensal",
    description: "Para operacoes com mais equipe, mais servicos e mais ritmo comercial.",
  },
  multi: {
    name: "Multiunidade",
    price: "Sob consulta",
    description: "Para marcas com duas ou mais unidades e implantacao mais consultiva.",
  },
};

const form = document.getElementById("checkout-form");
const feedback = document.getElementById("checkout-feedback");
const planInput = form?.querySelector('input[name="plan"]');
const selectedPlanName = document.getElementById("selected-plan-name");
const selectedPlanPrice = document.getElementById("selected-plan-price");
const selectedPlanDescription = document.getElementById("selected-plan-description");
const planButtons = Array.from(document.querySelectorAll("[data-plan]"));

hydratePlanFromQuery();
planButtons.forEach((button) => button.addEventListener("click", () => setPlan(button.dataset.plan || "professional")));
form?.addEventListener("submit", handleCheckoutSubmit);

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

  planButtons.forEach((button) => {
    const isActive = button.dataset.plan === normalizedPlan;
    button.classList.toggle("is-selected", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();
  if (!form || !feedback) return;

  const data = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');

  try {
    if (submitButton) submitButton.disabled = true;
    feedback.textContent = "Criando sua conta...";
    feedback.className = "feedback";

    const response = await request("/auth/signup", {
      method: "POST",
      body: {
        ownerName: String(data.get("ownerName") || "").trim(),
        salonName: String(data.get("salonName") || "").trim(),
        email: String(data.get("email") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        password: String(data.get("password") || ""),
        plan: String(data.get("plan") || "professional").trim(),
      },
    });

    localStorage.setItem(TOKEN_KEY, response.token);
    feedback.textContent = "Conta criada com sucesso. Redirecionando para o painel...";
    feedback.className = "feedback success";
    window.setTimeout(() => {
      window.location.href = "/estabelecimento";
    }, 900);
  } catch (error) {
    feedback.textContent = error.message || "Nao foi possivel criar a conta.";
    feedback.className = "feedback error";
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Falha na requisicao.");
  return data;
}

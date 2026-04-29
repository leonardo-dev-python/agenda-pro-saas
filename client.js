const API_BASE = "/api";

const state = {
  catalog: null,
  salonSlug: ""
};

const els = {
  publicCompanyChip: document.getElementById("public-company-chip"),
  publicCompanyLogo: document.getElementById("public-company-logo"),
  publicCompanyName: document.getElementById("public-company-name"),
  publicCompanyAddress: document.getElementById("public-company-address"),
  publicCompanyPhone: document.getElementById("public-company-phone"),
  publicCompanyInstagram: document.getElementById("public-company-instagram"),
  publicCompanyFacebook: document.getElementById("public-company-facebook"),
  publicProfessionals: document.getElementById("public-professionals"),
  publicBookingForm: document.getElementById("public-booking-form"),
  publicService: document.getElementById("public-service"),
  publicProfessional: document.getElementById("public-professional"),
  publicDate: document.getElementById("public-date"),
  publicSlot: document.getElementById("public-slot"),
  publicSlotSummary: document.getElementById("public-slot-summary"),
  publicFeedback: document.getElementById("public-feedback")
};

bootstrap();

function bootstrap() {
  state.salonSlug = getSalonSlug();
  const today = new Date();
  els.publicDate.value = formatDateInput(today);
  bindEvents();
  loadCatalog();
}

function bindEvents() {
  els.publicBookingForm.addEventListener("submit", handleBookingSubmit);
  els.publicService.addEventListener("change", () => {
    syncProfessionals();
    loadAvailability();
  });
  els.publicProfessional.addEventListener("change", loadAvailability);
  els.publicDate.addEventListener("change", loadAvailability);
}

async function loadCatalog() {
  try {
    const data = await request(`/public/catalog${state.salonSlug ? `?salon=${encodeURIComponent(state.salonSlug)}` : ""}`);
    state.catalog = data;
    renderCatalog();
  } catch (error) {
    setFeedback(error.message, true);
  }
}

function renderCatalog() {
  const company = state.catalog.salon || state.catalog.company;
  const { services, professionals } = state.catalog;
  els.publicCompanyChip.textContent = company.name;
  els.publicCompanyName.textContent = company.name;
  els.publicCompanyAddress.textContent = company.address || "";
  els.publicCompanyPhone.textContent = company.phone || "";
  els.publicCompanyInstagram.textContent = company.instagram || "";
  els.publicCompanyFacebook.textContent = company.facebook || "";
  els.publicCompanyInstagram.style.display = company.instagram ? "inline-flex" : "none";
  els.publicCompanyFacebook.style.display = company.facebook ? "inline-flex" : "none";
  els.publicCompanyLogo.src = company.logoUrl || "";
  els.publicCompanyLogo.alt = company.name;
  els.publicCompanyLogo.style.display = company.logoUrl ? "block" : "none";

  renderSelect(els.publicService, services, "Selecione um servico", (item) => ({
    value: item.id,
    label: `${item.name} • ${item.duration} min${item.price ? ` • ${currency(item.price)}` : ""}`
  }));

  renderProfessionals(professionals, services);
  syncProfessionals();
  syncPublicBookingState();
}

function renderProfessionals(professionals, services) {
  const serviceMap = new Map(services.map((item) => [item.id, item.name]));
  els.publicProfessionals.innerHTML = "";
  if (!professionals.length) {
    els.publicProfessionals.innerHTML = `
      <div class="empty-box">
        <strong>Equipe em configuracao.</strong>
        <p>Este estabelecimento ainda nao liberou os profissionais para agendamento online.</p>
      </div>
    `;
    return;
  }
  professionals.forEach((professional) => {
    const article = document.createElement("article");
    article.className = "staff-card";
    article.innerHTML = `
      <img src="${professional.photoUrl || ""}" alt="${professional.name}">
      <div class="list-card-main">
        <div class="list-card-head">
          <div>
            <p class="card-kicker">Especialista</p>
            <h4>${professional.name}</h4>
          </div>
          <span class="meta-pill">${professional.serviceIds.length} servico(s)</span>
        </div>
        <p>${professional.specialty}</p>
        <small>${professional.serviceIds.map((id) => serviceMap.get(id)).filter(Boolean).join(" • ")}</small>
      </div>
    `;
    els.publicProfessionals.appendChild(article);
  });
}

function syncProfessionals() {
  if (!state.catalog) return;
  const serviceId = els.publicService.value;
  const professionals = state.catalog.professionals.filter((professional) => !serviceId || professional.serviceIds.includes(serviceId));
  renderSelect(els.publicProfessional, professionals, "Selecione um profissional", (item) => ({
    value: item.id,
    label: `${item.name} • ${item.specialty}`
  }));
  syncPublicBookingState();
}

async function loadAvailability() {
  const serviceId = els.publicService.value;
  const professionalId = els.publicProfessional.value;
  const date = els.publicDate.value;

  if (!serviceId || !professionalId || !date) {
    renderSelect(els.publicSlot, [], "Selecione os filtros");
    els.publicSlotSummary.textContent = "Selecione servico, profissional e data para carregar a disponibilidade.";
    return;
  }

  try {
    const params = new URLSearchParams({
      serviceId,
      professionalId,
      date,
    });
    if (state.salonSlug) params.set("salon", state.salonSlug);
    const data = await request(`/public/availability?${params.toString()}`);
    renderSelect(els.publicSlot, data.slots, data.slots.length ? "Selecione um horario" : "Nenhum horario disponivel", (item) => ({
      value: item.startAt,
      label: item.label
    }));
    els.publicSlotSummary.textContent = data.slots.length
      ? `${data.slots.length} horario(s) livres para esta data.`
      : "Nenhum horario livre neste dia. Ajuste a data ou escolha outro profissional.";
  } catch (error) {
    els.publicSlotSummary.textContent = error.message;
  }
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  if (!els.publicSlot.value) {
    setFeedback("Selecione um horario disponivel.", true);
    return;
  }

  try {
    const data = await request("/public/appointments", {
      method: "POST",
      body: {
        salonSlug: state.salonSlug,
        serviceId: els.publicService.value,
        professionalId: els.publicProfessional.value,
        startAt: els.publicSlot.value,
        client: {
          fullName: document.getElementById("public-client-name").value,
          phone: document.getElementById("public-client-phone").value,
          email: document.getElementById("public-client-email").value,
          notes: document.getElementById("public-client-notes").value
        }
      }
    });
    setFeedback(`Pedido recebido para ${formatDateTime(els.publicSlot.value)}. Lembretes previstos: ${(data.notificationsQueued.channels || []).join(", ")}.`, false);
    els.publicBookingForm.reset();
    els.publicDate.value = formatDateInput(new Date());
    await loadCatalog();
    await loadAvailability();
  } catch (error) {
    setFeedback(error.message, true);
  }
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

function syncPublicBookingState() {
  if (!state.catalog) return;
  const hasServices = state.catalog.services.length > 0;
  const hasProfessionals = state.catalog.professionals.length > 0;
  const submitButton = els.publicBookingForm.querySelector('button[type="submit"]');
  const disabled = !hasServices || !hasProfessionals;

  els.publicService.disabled = !hasServices;
  els.publicProfessional.disabled = disabled;
  els.publicDate.disabled = disabled;
  els.publicSlot.disabled = disabled;
  if (submitButton) submitButton.disabled = disabled;

  if (!hasServices) {
    renderSelect(els.publicService, [], "Agenda em configuracao");
    renderSelect(els.publicProfessional, [], "Aguardando servicos");
    renderSelect(els.publicSlot, [], "Aguardando liberacao");
    els.publicSlotSummary.textContent = "Este estabelecimento ainda nao cadastrou os servicos para agendamento online.";
    return;
  }

  if (!hasProfessionals) {
    renderSelect(els.publicProfessional, [], "Equipe em configuracao");
    renderSelect(els.publicSlot, [], "Aguardando liberacao");
    els.publicSlotSummary.textContent = "Os servicos ja foram preparados, mas a equipe ainda esta sendo organizada.";
  }
}

function setFeedback(text, isError) {
  els.publicFeedback.textContent = text;
  els.publicFeedback.className = `feedback ${isError ? "error" : "success"}`;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  return new Date(`${value}:00`).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function getSalonSlug() {
  const url = new URL(window.location.href);
  const querySlug = String(url.searchParams.get("slug") || "").trim();
  if (querySlug) return querySlug;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "agendar" && parts[1]) return parts[1];
  return "";
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Falha na requisicao.");
  return data;
}

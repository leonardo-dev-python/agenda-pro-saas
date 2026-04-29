import { randomUUID } from "node:crypto";

export function sanitizeUser(user) {
  return {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export function sanitizeCompany(company) {
  if (!company) return null;
  return {
    id: company.id,
    name: company.name,
    slug: company.slug || "",
    address: company.address,
    phone: company.phone,
    whatsappNumber: company.whatsappNumber || company.phone || "",
    email: company.email || "",
    legalName: company.legalName || "",
    billingDocumentId: company.billingDocumentId || "",
    billingMethod: company.billingMethod || "BOLETO",
    logoUrl: company.logoUrl,
    instagram: company.instagram,
    facebook: company.facebook,
    holidays: Array.isArray(company.holidays) ? company.holidays : [],
    openOnSaturday: Boolean(company.openOnSaturday),
    openOnSunday: Boolean(company.openOnSunday),
    reminderChannels: Array.isArray(company.reminderChannels) ? company.reminderChannels : ["whatsapp"],
    subscription: {
      planCode: String(company.planCode || "starter"),
      billingStatus: String(company.billingStatus || "trialing"),
      trialStartsAt: company.trialStartsAt || null,
      trialEndsAt: company.trialEndsAt || null,
      subscriptionEndsAt: company.subscriptionEndsAt || null,
      billingProvider: company.billingProvider || "",
      billingCustomerId: company.billingCustomerId || "",
      billingSubscriptionId: company.billingSubscriptionId || "",
    },
    googleCalendar: company.googleCalendar || {
      connected: false,
      calendarId: "",
      accountEmail: "",
      lastSyncAt: null,
    },
  };
}

export function sanitizeCompanyInput(input) {
  return {
    name: String(input.name || "").trim(),
    slug: String(input.slug || "").trim(),
    address: String(input.address || "").trim(),
    phone: String(input.phone || "").trim(),
    whatsappNumber: String(input.whatsappNumber || input.phone || "").trim(),
    email: String(input.email || "").trim(),
    legalName: String(input.legalName || "").trim(),
    billingDocumentId: String(input.billingDocumentId || "").trim(),
    billingMethod: String(input.billingMethod || "BOLETO").trim().toUpperCase(),
    logoUrl: String(input.logoUrl || "").trim(),
    instagram: String(input.instagram || "").trim(),
    facebook: String(input.facebook || "").trim(),
    holidays: parseDateList(input.holidays),
    openOnSaturday: Boolean(input.openOnSaturday),
    openOnSunday: Boolean(input.openOnSunday),
    reminderChannels: normalizeChannelList(input.reminderChannels),
  };
}

export function sanitizeService(service) {
  return {
    id: service.id,
    companyId: service.companyId,
    name: service.name,
    category: service.category,
    duration: Number(service.duration || 0),
    price: Number(service.price || 0),
    description: service.description || "",
  };
}

export function sanitizeServiceInput(input) {
  const duration = clamp(Number(input.duration || 0), 5, 480);
  return {
    name: String(input.name || "").trim(),
    category: String(input.category || "").trim(),
    duration,
    price: Number.isFinite(Number(input.price)) ? Number(input.price || 0) : 0,
    description: String(input.description || "").trim(),
  };
}

export function sanitizeProfessional(professional, services = []) {
  const serviceMap = new Map(services.map((item) => [item.id, item]));
  return {
    id: professional.id,
    companyId: professional.companyId,
    name: professional.name,
    specialty: professional.specialty,
    photoUrl: professional.photoUrl,
    bio: professional.bio || "",
    serviceIds: Array.isArray(professional.serviceIds) ? professional.serviceIds : [],
    serviceNames: (professional.serviceIds || []).map((id) => serviceMap.get(id)?.name).filter(Boolean),
    workingHours: professional.workingHours || {},
    breaks: professional.breaks || {},
    daysOff: Array.isArray(professional.daysOff) ? professional.daysOff : [],
  };
}

export function sanitizeProfessionalInput(input, services, companyId) {
  const validServiceIds = new Set(services.filter((item) => item.companyId === companyId).map((item) => item.id));
  return {
    name: String(input.name || "").trim(),
    specialty: String(input.specialty || "").trim(),
    photoUrl: String(input.photoUrl || "").trim(),
    bio: String(input.bio || "").trim(),
    serviceIds: Array.isArray(input.serviceIds) ? input.serviceIds.filter((id) => validServiceIds.has(id)) : [],
    workingHours: sanitizeScheduleMap(input.workingHours),
    breaks: sanitizeScheduleMap(input.breaks),
    daysOff: parseDateList(input.daysOff),
  };
}

export function sanitizeClientInput(input) {
  const fullName = String(input.fullName || input.name || "").trim();
  return {
    name: fullName,
    fullName,
    phone: String(input.phone || "").trim(),
    email: String(input.email || "").trim(),
    notes: String(input.notes || "").trim(),
  };
}

export function enrichClient(client, db) {
  const appointments = db.appointments
    .filter((item) => item.clientId === client.id)
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
  return {
    ...client,
    fullName: client.fullName || client.name || "",
    appointmentsCount: appointments.length,
    lastServiceAt: appointments[0]?.startAt || null,
    history: appointments.slice(0, 5).map((item) => enrichAppointment(item, db)),
  };
}

export function sanitizeAppointmentInput(body, options = {}) {
  return {
    clientId: String(body.clientId || "").trim(),
    client: options.isPublic || body.client ? sanitizeClientInput(body.client || {}) : null,
    serviceId: String(body.serviceId || "").trim(),
    professionalId: String(body.professionalId || "").trim(),
    startAt: normalizeDateTime(body.startAt || ""),
    status: normalizeAppointmentStatus(body.status, options.isPublic ? "pendente" : "confirmado"),
    notes: String(body.notes || "").trim(),
    source: options.isPublic ? "publico" : "admin",
  };
}

export function sanitizeAppointmentUpdate(body) {
  return {
    clientId: body.clientId ? String(body.clientId).trim() : "",
    professionalId: body.professionalId ? String(body.professionalId).trim() : "",
    serviceId: body.serviceId ? String(body.serviceId).trim() : "",
    startAt: body.startAt ? normalizeDateTime(body.startAt) : "",
    status: body.status ? normalizeAppointmentStatus(body.status, "confirmado") : "",
    notes: body.notes !== undefined ? String(body.notes || "").trim() : undefined,
  };
}

export function createAppointmentRecord(db, companyId, payload) {
  const service = db.services.find((item) => item.id === payload.serviceId && item.companyId === companyId);
  const professional = db.professionals.find((item) => item.id === payload.professionalId && item.companyId === companyId);

  if (!service) throw new Error("Servico nao encontrado.");
  if (!professional) throw new Error("Profissional nao encontrado.");
  if (!professional.serviceIds.includes(service.id)) {
    throw new Error("Esse profissional nao realiza o servico selecionado.");
  }

  const startAt = normalizeDateTime(payload.startAt);
  const endAt = addMinutesToLocalDateTime(startAt, service.duration);

  validateAppointmentRules(db, companyId, {
    professionalId: professional.id,
    serviceId: service.id,
    startAt,
    endAt,
    excludeAppointmentId: payload.excludeAppointmentId || "",
  });

  return {
    id: randomUUID(),
    companyId,
    clientId: payload.clientId,
    serviceId: service.id,
    professionalId: professional.id,
    startAt,
    endAt,
    status: payload.status,
    notes: payload.notes,
    source: payload.source,
    googleSyncStatus: company.googleCalendar?.connected ? "pending_oauth" : "not_configured",
    googleSyncError: company.googleCalendar?.connected ? "Conta Google conectada, mas ainda sem autorizacao OAuth concluida." : "",
    googleCalendarEventId: "",
    googleTargetCalendarId: company.googleCalendar?.calendarId || "",
    googleSyncedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function validateAppointmentRules(db, companyId, input) {
  const service = db.services.find((item) => item.id === input.serviceId && item.companyId === companyId);
  const professional = db.professionals.find((item) => item.id === input.professionalId && item.companyId === companyId);
  const company = db.companies.find((item) => item.id === companyId);
  if (!service || !professional || !company) throw new Error("Dados do agendamento invalidos.");

  const date = input.startAt.slice(0, 10);
  const slots = generateAvailability(db, companyId, professional.id, service.id, date, input.excludeAppointmentId);
  const isAvailable = slots.some((item) => item.startAt === input.startAt);

  if (!isAvailable) throw new Error("Horario indisponivel para este profissional.");
}

export function generateAvailability(db, companyId, professionalId, serviceId, date, excludeAppointmentId = "") {
  if (!professionalId || !serviceId || !date) return [];

  const professional = db.professionals.find((item) => item.id === professionalId && item.companyId === companyId);
  const service = db.services.find((item) => item.id === serviceId && item.companyId === companyId);
  const company = db.companies.find((item) => item.id === companyId);
  if (!professional || !service || !company) return [];
  if (!professional.serviceIds.includes(service.id)) return [];
  if (!isDateValid(date)) return [];
  if ((company.holidays || []).includes(date) || (professional.daysOff || []).includes(date)) return [];

  const weekDayIndex = new Date(`${date}T12:00:00`).getDay();
  if (weekDayIndex === 6 && !company.openOnSaturday) return [];
  if (weekDayIndex === 0 && !company.openOnSunday) return [];
  const windows = professional.workingHours?.[String(weekDayIndex)] || [];
  if (!windows.length) return [];

  const breakRanges = professional.breaks?.[String(weekDayIndex)] || [];
  const appointmentRanges = scopedAppointments(db, companyId)
    .filter((item) => item.professionalId === professional.id && item.startAt.startsWith(date) && item.id !== excludeAppointmentId)
    .filter(isActiveAppointment)
    .map((item) => ({ start: item.startAt.slice(11, 16), end: item.endAt.slice(11, 16) }));

  const blockedRanges = [...breakRanges, ...appointmentRanges];
  const slots = [];
  const duration = service.duration;
  const nowLocal = currentLocalDateTime();

  for (const windowItem of windows) {
    let cursor = toMinutes(windowItem.start);
    const limit = toMinutes(windowItem.end);

    while (cursor + duration <= limit) {
      const candidateStart = formatMinutes(cursor);
      const candidateEnd = formatMinutes(cursor + duration);
      const startAt = `${date}T${candidateStart}`;

      if (!overlapsAny(candidateStart, candidateEnd, blockedRanges) && startAt >= nowLocal) {
        slots.push({
          startAt,
          endAt: `${date}T${candidateEnd}`,
          label: `${candidateStart} - ${candidateEnd}`,
        });
      }

      cursor += 15;
    }
  }

  return slots;
}

export function upsertClientFromAppointment(db, companyId, clientInput) {
  const normalizedPhone = String(clientInput.phone || "").replace(/\D/g, "");
  const normalizedEmail = String(clientInput.email || "").trim().toLowerCase();
  const existing = db.clients.find((item) => {
    if (item.companyId !== companyId) return false;
    const sameEmail = normalizedEmail && item.email.trim().toLowerCase() === normalizedEmail;
    const samePhone = normalizedPhone && item.phone.replace(/\D/g, "") === normalizedPhone;
    return sameEmail || samePhone;
  });

  if (existing) {
    Object.assign(existing, {
      ...existing,
      ...sanitizeClientInput(clientInput),
      updatedAt: new Date().toISOString(),
    });
    return existing;
  }

  const client = {
    id: randomUUID(),
    companyId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...sanitizeClientInput(clientInput),
  };
  db.clients.unshift(client);
  return client;
}

export function queueNotifications(db, company, client, appointment, type) {
  if (!client) return;
  const preview = buildNotificationPreview(company, client, appointment, type);
  db.notifications.unshift({
    id: randomUUID(),
    companyId: company.id,
    clientId: client.id,
    appointmentId: appointment.id,
    type,
    channels: company.reminderChannels || ["whatsapp"],
    message: preview.message,
    createdAt: new Date().toISOString(),
  });
}

export function buildNotificationPreview(company, client, appointment, type) {
  const typeLabel =
    {
      created: "confirmacao",
      rescheduled: "reagendamento",
      cancelled: "cancelamento",
      updated: "atualizacao",
    }[type] || "lembrete";

  return {
    channels: company.reminderChannels || ["whatsapp"],
    message: `${client.name}, seu ${typeLabel} na ${company.name} esta previsto para ${formatDateTime(appointment.startAt)}.`,
  };
}

export function enrichAppointment(appointment, db) {
  const client = db.clients.find((item) => item.id === appointment.clientId);
  const professional = db.professionals.find((item) => item.id === appointment.professionalId);
  const service = db.services.find((item) => item.id === appointment.serviceId);

  return {
    ...appointment,
    clientName: client?.name || "Cliente",
    customerName: client?.fullName || client?.name || "Cliente",
    clientPhone: client?.phone || "",
    clientEmail: client?.email || "",
    professionalName: professional?.name || "Profissional",
    serviceName: service?.name || "Servico",
    serviceDuration: service?.duration || 0,
    servicePrice: service?.price || 0,
    googleSync: {
      status: appointment.googleSyncStatus || "not_configured",
      eventId: appointment.googleCalendarEventId || "",
      calendarId: appointment.googleTargetCalendarId || "",
      syncedAt: appointment.googleSyncedAt || null,
      error: appointment.googleSyncError || "",
    },
  };
}

export function scopedAppointments(db, companyId) {
  return db.appointments.filter((item) => item.companyId === companyId);
}

export function isActiveAppointment(appointment) {
  return appointment.status !== "cancelado";
}

function normalizeAppointmentStatus(value, fallback) {
  const status = String(value || "").trim().toLowerCase();
  return ["pendente", "confirmado", "cancelado", "concluido"].includes(status) ? status : fallback;
}

function sanitizeScheduleMap(input) {
  const output = {};
  for (const [day, value] of Object.entries(input || {})) {
    const ranges = Array.isArray(value) ? value : [];
    const safeRanges = ranges
      .map((item) => ({
        start: normalizeTime(item.start),
        end: normalizeTime(item.end),
      }))
      .filter((item) => item.start && item.end && toMinutes(item.start) < toMinutes(item.end));

    if (safeRanges.length) output[day] = safeRanges;
  }
  return output;
}

function parseDateList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(isDateValid);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(isDateValid);
}

function normalizeChannelList(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(",");
  const channels = items
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => item === "email" || item === "sms" || item === "whatsapp");
  return channels.length ? [...new Set(channels)] : ["whatsapp"];
}

function normalizeDateTime(value) {
  const raw = String(value || "").trim().replace(" ", "T");
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) return "";
  return `${match[1]}T${match[2]}`;
}

function normalizeTime(value) {
  const match = String(value || "").trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isDateValid(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function toMinutes(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

function formatMinutes(value) {
  const total = Math.max(0, value);
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function overlapsAny(start, end, ranges) {
  return ranges.some((range) => toMinutes(start) < toMinutes(range.end) && toMinutes(end) > toMinutes(range.start));
}

function addMinutesToLocalDateTime(dateTime, minutes) {
  const date = new Date(`${dateTime}:00`);
  date.setMinutes(date.getMinutes() + minutes);
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  return `${iso.slice(0, 10)}T${iso.slice(11, 16)}`;
}

function localDateKey() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function currentLocalDateTime() {
  const now = new Date();
  return `${localDateKey()}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatDateTime(dateTime) {
  return new Date(`${dateTime}:00`).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

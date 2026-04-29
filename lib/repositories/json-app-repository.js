import { randomUUID } from "node:crypto";

import {
  buildNotificationPreview,
  createAppointmentRecord,
  enrichAppointment,
  enrichClient,
  generateAvailability,
  isActiveAppointment,
  queueNotifications,
  sanitizeAppointmentInput,
  sanitizeAppointmentUpdate,
  sanitizeClientInput,
  sanitizeCompany,
  sanitizeCompanyInput,
  sanitizeProfessional,
  sanitizeProfessionalInput,
  sanitizeService,
  sanitizeServiceInput,
  scopedAppointments,
  upsertClientFromAppointment,
} from "../salon-domain.js";

export function createJsonAppRepository(gateway) {
  async function withDb(work) {
    const db = await gateway.readDatabase();
    const result = await work(db);
    if (result?.save) {
      await gateway.writeDatabase(db);
    }
    return result?.data ?? result;
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function ensureUniqueSlug(companies, baseValue) {
    const base = slugify(baseValue) || "agenda-pro-salao";
    let candidate = base;
    let index = 2;
    while (companies.some((company) => String(company.slug || "").trim().toLowerCase() === candidate)) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  function getCompanyBySlug(db, slug) {
    const normalizedSlug = String(slug || "").trim().toLowerCase();
    if (!normalizedSlug) return db.companies[0];
    return db.companies.find((company) => String(company.slug || "").trim().toLowerCase() === normalizedSlug) || null;
  }

  function createTrialWindow() {
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    return {
      trialStartsAt: startsAt.toISOString(),
      trialEndsAt: endsAt.toISOString(),
    };
  }

  return {
    async createOwnerAccount(payload) {
      return withDb((db) => {
        const ownerName = String(payload.ownerName || "").trim();
        const salonName = String(payload.salonName || "").trim();
        const email = String(payload.email || "").trim().toLowerCase();
        const phone = String(payload.phone || "").trim();
        const passwordHash = String(payload.passwordHash || "");

        if (!ownerName || !salonName || !email || !phone || !passwordHash) {
          throw new Error("Preencha os campos obrigatorios para criar a conta.");
        }

        const existingUser = db.users.find((user) => String(user.email || "").trim().toLowerCase() === email);
        if (existingUser) throw new Error("Ja existe uma conta com este e-mail.");

        const now = new Date().toISOString();
        const trial = createTrialWindow();
        const companyId = randomUUID();
        const userId = randomUUID();
        const slug = ensureUniqueSlug(db.companies, salonName);
        const company = {
          id: companyId,
          name: salonName,
          slug,
          address: "",
          phone,
          whatsappNumber: phone,
          email,
          legalName: salonName,
          billingDocumentId: "",
          billingMethod: "BOLETO",
          logoUrl: "",
          instagram: "",
          facebook: "",
          holidays: [],
          openOnSaturday: true,
          openOnSunday: false,
          reminderChannels: ["whatsapp"],
          planCode: String(payload.plan || "").trim() || "starter",
          billingStatus: "trialing",
          trialStartsAt: trial.trialStartsAt,
          trialEndsAt: trial.trialEndsAt,
          subscriptionEndsAt: null,
          billingProvider: "",
          billingCustomerId: "",
          billingSubscriptionId: "",
          googleCalendar: {
            connected: false,
            calendarId: "",
            accountEmail: "",
            lastSyncAt: null,
          },
          createdAt: now,
          updatedAt: now,
        };
        const user = {
          id: userId,
          companyId,
          name: ownerName,
          email,
          passwordHash,
          role: "owner",
          createdAt: now,
          updatedAt: now,
        };

        db.companies.unshift(company);
        db.users.unshift(user);

        return {
          save: true,
          data: {
            user: {
              id: user.id,
              companyId: user.companyId,
              name: user.name,
              email: user.email,
              role: user.role,
              passwordHash: user.passwordHash,
            },
            company: sanitizeCompany(company),
            salon: sanitizeCompany(company),
          },
        };
      });
    },

    async findUserByEmail(email) {
      return withDb((db) => {
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const user = db.users.find((item) => item.email.toLowerCase() === normalizedEmail);
        if (!user) return null;
        const company = db.companies.find((item) => item.id === user.companyId);
        if (!company) return null;
        return {
          user: {
            id: user.id,
            companyId: user.companyId,
            name: user.name,
            email: user.email,
            role: user.role,
            passwordHash: user.passwordHash,
          },
          company: sanitizeCompany(company),
          salon: sanitizeCompany(company),
        };
      });
    },

    async getSessionContext(userId, companyId) {
      return withDb((db) => {
        const user = db.users.find((item) => item.id === userId && item.companyId === companyId);
        const company = db.companies.find((item) => item.id === companyId);
        if (!user || !company) return null;
        return {
          user: {
            id: user.id,
            companyId: user.companyId,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          company: sanitizeCompany(company),
          salon: sanitizeCompany(company),
        };
      });
    },

    async getPublicCatalog(input = {}) {
      return withDb((db) => {
        const company = getCompanyBySlug(db, input.salonSlug);
        if (!company) throw new Error("Salao nao encontrado.");
        const services = db.services
          .filter((item) => item.companyId === company.id)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          .map(sanitizeService);
        const professionals = db.professionals
          .filter((item) => item.companyId === company.id)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          .map((professional) => sanitizeProfessional(professional, services));

        return {
          salon: sanitizeCompany(company),
          company: sanitizeCompany(company),
          services,
          professionals,
        };
      });
    },

    async getPublicAvailability({ serviceId, professionalId, date, salonSlug }) {
      return withDb((db) => {
        const company = getCompanyBySlug(db, salonSlug);
        if (!company) throw new Error("Salao nao encontrado.");
        const slots = generateAvailability(db, company.id, professionalId, serviceId, date);
        return { slots };
      });
    },

    async createPublicAppointment(body) {
      return withDb((db) => {
        const company = getCompanyBySlug(db, body.salonSlug);
        if (!company) throw new Error("Salao nao encontrado.");
        const payload = sanitizeAppointmentInput(body, { isPublic: true });
        const appointment = createAppointmentRecord(db, company.id, payload);
        const client = upsertClientFromAppointment(db, company.id, payload.client);
        appointment.clientId = client.id;
        db.appointments.unshift(appointment);
        queueNotifications(db, company, client, appointment, "created");

        return {
          save: true,
          data: {
            appointment: enrichAppointment(appointment, db),
            notificationsQueued: buildNotificationPreview(company, client, appointment, "created"),
          },
        };
      });
    },

    async getDashboard(companyId) {
      return withDb((db) => {
        const appointments = scopedAppointments(db, companyId);
        const activeAppointments = appointments.filter(isActiveAppointment);
        const today = new Date().toISOString().slice(0, 10);
        return {
          stats: {
            professionals: db.professionals.filter((item) => item.companyId === companyId).length,
            services: db.services.filter((item) => item.companyId === companyId).length,
            clients: db.clients.filter((item) => item.companyId === companyId).length,
            appointments: activeAppointments.length,
            today: activeAppointments.filter((item) => item.startAt.startsWith(today)).length,
          },
        };
      });
    },

    async getSalon(companyId) {
      return withDb((db) => {
        const company = db.companies.find((item) => item.id === companyId);
        return {
          salon: sanitizeCompany(company),
          company: sanitizeCompany(company),
        };
      });
    },

    async updateSubscription(companyId, payload) {
      return withDb((db) => {
        const company = db.companies.find((item) => item.id === companyId);
        if (!company) throw new Error("Salao nao encontrado.");
        if (payload.planCode) company.planCode = String(payload.planCode || "").trim().toLowerCase();
        if (payload.billingProvider !== undefined) company.billingProvider = String(payload.billingProvider || "").trim().toLowerCase();
        if (payload.billingStatus) company.billingStatus = String(payload.billingStatus || "").trim().toLowerCase();
        if (payload.billingCustomerId !== undefined) company.billingCustomerId = String(payload.billingCustomerId || "").trim();
        if (payload.billingSubscriptionId !== undefined) company.billingSubscriptionId = String(payload.billingSubscriptionId || "").trim();
        if (payload.subscriptionEndsAt !== undefined) company.subscriptionEndsAt = payload.subscriptionEndsAt || null;
        company.updatedAt = new Date().toISOString();
        return {
          save: true,
          data: {
            salon: sanitizeCompany(company),
            company: sanitizeCompany(company),
          },
        };
      });
    },

    async updateBillingProfile(companyId, payload) {
      return withDb((db) => {
        const company = db.companies.find((item) => item.id === companyId);
        if (!company) throw new Error("Salao nao encontrado.");
        company.legalName = String(payload.legalName || company.legalName || company.name || "").trim();
        company.billingDocumentId = String(payload.billingDocumentId || "").trim();
        company.billingMethod = String(payload.billingMethod || "BOLETO").trim().toUpperCase();
        if (payload.email !== undefined) company.email = String(payload.email || "").trim();
        if (payload.phone !== undefined) {
          company.phone = String(payload.phone || "").trim();
          company.whatsappNumber = String(payload.phone || company.whatsappNumber || "").trim();
        }
        company.updatedAt = new Date().toISOString();
        return {
          save: true,
          data: {
            salon: sanitizeCompany(company),
            company: sanitizeCompany(company),
          },
        };
      });
    },

    async findSalonByBillingSubscriptionId(subscriptionId) {
      return withDb((db) => {
        const company = db.companies.find((item) => String(item.billingSubscriptionId || "") === String(subscriptionId || ""));
        return sanitizeCompany(company);
      });
    },

    async updateSalon(companyId, payload) {
      return withDb((db) => {
        const company = db.companies.find((item) => item.id === companyId);
        Object.assign(company, sanitizeCompanyInput(payload));
        company.updatedAt = new Date().toISOString();
        return {
          save: true,
          data: {
            salon: sanitizeCompany(company),
            company: sanitizeCompany(company),
          },
        };
      });
    },

    async listServices(companyId) {
      return withDb((db) => ({
        services: db.services
          .filter((item) => item.companyId === companyId)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          .map(sanitizeService),
      }));
    },

    async createService(companyId, payload) {
      return withDb((db) => {
        const service = {
          id: randomUUID(),
          companyId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...sanitizeServiceInput(payload),
        };
        db.services.unshift(service);
        return { save: true, data: { service: sanitizeService(service) } };
      });
    },

    async updateService(companyId, serviceId, payload) {
      return withDb((db) => {
        const service = db.services.find((item) => item.id === serviceId && item.companyId === companyId);
        if (!service) throw new Error("Servico nao encontrado.");
        Object.assign(service, sanitizeServiceInput(payload));
        service.updatedAt = new Date().toISOString();
        return { save: true, data: { service: sanitizeService(service) } };
      });
    },

    async deleteService(companyId, serviceId) {
      return withDb((db) => {
        const service = db.services.find((item) => item.id === serviceId && item.companyId === companyId);
        if (!service) throw new Error("Servico nao encontrado.");
        const hasAppointments = db.appointments.some(
          (item) => item.companyId === companyId && item.serviceId === service.id && item.status !== "cancelado",
        );
        if (hasAppointments) throw new Error("Nao e possivel excluir um servico com agendamentos ativos.");

        db.services = db.services.filter((item) => item.id !== service.id);
        db.professionals.forEach((professional) => {
          professional.serviceIds = professional.serviceIds.filter((item) => item !== service.id);
        });
        return { save: true, data: { ok: true } };
      });
    },

    async listProfessionals(companyId) {
      return withDb((db) => {
        const services = db.services.filter((item) => item.companyId === companyId).map(sanitizeService);
        const professionals = db.professionals
          .filter((item) => item.companyId === companyId)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          .map((professional) => sanitizeProfessional(professional, services));
        return { professionals };
      });
    },

    async createProfessional(companyId, payload) {
      return withDb((db) => {
        const professional = {
          id: randomUUID(),
          companyId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...sanitizeProfessionalInput(payload, db.services, companyId),
        };
        db.professionals.unshift(professional);
        return {
          save: true,
          data: { professional: sanitizeProfessional(professional, db.services.map(sanitizeService)) },
        };
      });
    },

    async updateProfessional(companyId, professionalId, payload) {
      return withDb((db) => {
        const professional = db.professionals.find((item) => item.id === professionalId && item.companyId === companyId);
        if (!professional) throw new Error("Profissional nao encontrado.");
        Object.assign(professional, sanitizeProfessionalInput(payload, db.services, companyId));
        professional.updatedAt = new Date().toISOString();
        return {
          save: true,
          data: { professional: sanitizeProfessional(professional, db.services.map(sanitizeService)) },
        };
      });
    },

    async deleteProfessional(companyId, professionalId) {
      return withDb((db) => {
        const professional = db.professionals.find((item) => item.id === professionalId && item.companyId === companyId);
        if (!professional) throw new Error("Profissional nao encontrado.");
        const hasAppointments = db.appointments.some(
          (item) => item.companyId === companyId && item.professionalId === professional.id && item.status !== "cancelado",
        );
        if (hasAppointments) throw new Error("Nao e possivel excluir um profissional com agendamentos ativos.");

        db.professionals = db.professionals.filter((item) => item.id !== professional.id);
        return { save: true, data: { ok: true } };
      });
    },

    async listClients(companyId) {
      return withDb((db) => {
        const clients = db.clients
          .filter((item) => item.companyId === companyId)
          .map((client) => enrichClient(client, db))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        return { clients };
      });
    },

    async createClient(companyId, payload) {
      return withDb((db) => {
        const client = {
          id: randomUUID(),
          companyId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...sanitizeClientInput(payload),
        };
        db.clients.unshift(client);
        return { save: true, data: { client: enrichClient(client, db) } };
      });
    },

    async updateClient(companyId, clientId, payload) {
      return withDb((db) => {
        const client = db.clients.find((item) => item.id === clientId && item.companyId === companyId);
        if (!client) throw new Error("Cliente nao encontrado.");
        Object.assign(client, sanitizeClientInput(payload));
        client.updatedAt = new Date().toISOString();
        return { save: true, data: { client: enrichClient(client, db) } };
      });
    },

    async deleteClient(companyId, clientId) {
      return withDb((db) => {
        const client = db.clients.find((item) => item.id === clientId && item.companyId === companyId);
        if (!client) throw new Error("Cliente nao encontrado.");
        const hasAppointments = db.appointments.some((item) => item.clientId === client.id);
        if (hasAppointments) throw new Error("Nao e possivel excluir um cliente com historico de agendamentos.");
        db.clients = db.clients.filter((item) => item.id !== client.id);
        return { save: true, data: { ok: true } };
      });
    },

    async listAppointments(companyId, filters) {
      return withDb((db) => {
        const { date = "", professionalId = "", status = "" } = filters;
        let appointments = scopedAppointments(db, companyId).map((item) => enrichAppointment(item, db));
        if (date) appointments = appointments.filter((item) => item.startAt.startsWith(date));
        if (professionalId) appointments = appointments.filter((item) => item.professionalId === professionalId);
        if (status) appointments = appointments.filter((item) => item.status === status);
        appointments.sort((a, b) => a.startAt.localeCompare(b.startAt));
        return { appointments };
      });
    },

    async createAppointment(companyId, company, body) {
      return withDb((db) => {
        const payload = sanitizeAppointmentInput(body, { isPublic: false });
        let clientId = payload.clientId || "";
        if (!clientId && payload.client) {
          const client = upsertClientFromAppointment(db, companyId, payload.client);
          clientId = client.id;
        }
        const appointment = createAppointmentRecord(db, companyId, { ...payload, clientId });
        db.appointments.unshift(appointment);
        const client = db.clients.find((item) => item.id === appointment.clientId);
        queueNotifications(db, company, client, appointment, "created");
        return { save: true, data: { appointment: enrichAppointment(appointment, db) } };
      });
    },

    async updateAppointment(companyId, company, appointmentId, body) {
      return withDb((db) => {
        const appointment = db.appointments.find((item) => item.id === appointmentId && item.companyId === companyId);
        if (!appointment) throw new Error("Agendamento nao encontrado.");

        const payload = sanitizeAppointmentUpdate(body);
        const previousStatus = appointment.status;

        if (payload.professionalId) appointment.professionalId = payload.professionalId;
        if (payload.serviceId) appointment.serviceId = payload.serviceId;
        if (payload.clientId) appointment.clientId = payload.clientId;
        if (payload.notes !== undefined) appointment.notes = payload.notes;
        if (payload.status) appointment.status = payload.status;

        if (payload.startAt) {
          const service = db.services.find((item) => item.id === appointment.serviceId && item.companyId === companyId);
          if (!service) throw new Error("Servico nao encontrado.");
          const startAt = payload.startAt;
          const endAt = addMinutes(startAt, service.duration);
          const slots = generateAvailability(db, companyId, appointment.professionalId, appointment.serviceId, startAt.slice(0, 10), appointment.id);
          const isAvailable = slots.some((item) => item.startAt === startAt);
          if (!isAvailable) throw new Error("Horario indisponivel para este profissional.");
          appointment.startAt = startAt;
          appointment.endAt = endAt;
        }

        if (payload.status === "cancelado" && previousStatus !== "cancelado") {
          appointment.cancelledAt = new Date().toISOString();
        }

        if (payload.status === "confirmado" && previousStatus !== "confirmado") {
          appointment.confirmedAt = new Date().toISOString();
        }

        appointment.googleSyncStatus = company.googleCalendar?.connected ? "pending_oauth" : "not_configured";
        appointment.googleSyncError = company.googleCalendar?.connected
          ? "Conta Google conectada, mas ainda sem autorizacao OAuth concluida."
          : "";
        appointment.googleTargetCalendarId = company.googleCalendar?.calendarId || "";
        appointment.googleSyncedAt = null;

        appointment.updatedAt = new Date().toISOString();
        const client = db.clients.find((item) => item.id === appointment.clientId);
        const eventType = payload.status === "cancelado" ? "cancelled" : payload.startAt ? "rescheduled" : "updated";
        queueNotifications(db, company, client, appointment, eventType);
        return { save: true, data: { appointment: enrichAppointment(appointment, db) } };
      });
    },

    async listNotifications(companyId, filters) {
      return withDb((db) => {
        const { date = "", type = "" } = filters;
        let notifications = db.notifications
          .filter((item) => item.companyId === companyId)
          .map((item) => {
            const appointment = db.appointments.find((entry) => entry.id === item.appointmentId);
            const client = db.clients.find((entry) => entry.id === item.clientId);
            return {
              ...item,
              appointment,
              clientName: client?.fullName || client?.name || "Cliente",
            };
          });

        if (date) notifications = notifications.filter((item) => item.createdAt.startsWith(date));
        if (type) notifications = notifications.filter((item) => item.type === type);
        notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { notifications };
      });
    },

    async getGoogleIntegration(companyId) {
      return withDb((db) => {
        const company = db.companies.find((item) => item.id === companyId);
        return { googleCalendar: normalizeGoogleCalendarStatus(company?.googleCalendar) };
      });
    },

    async connectGoogleIntegration(companyId, body) {
      return withDb((db) => {
        const company = db.companies.find((item) => item.id === companyId);
        company.googleCalendar = {
          connected: Boolean(body.connected ?? true),
          calendarId: String(body.calendarId || "primary").trim(),
          accountEmail: String(body.accountEmail || "").trim(),
          lastSyncAt: body.lastSyncAt || new Date().toISOString(),
          oauthCompleted: false,
          refreshTokenEncrypted: "pending-oauth-token",
          accessTokenEncrypted: "",
          tokenExpiresAt: null,
        };
        company.updatedAt = new Date().toISOString();
        return { save: true, data: { googleCalendar: normalizeGoogleCalendarStatus(company.googleCalendar) } };
      });
    },

    async completeGoogleOAuthConnection(companyId, body) {
      return withDb((db) => {
        const company = db.companies.find((item) => item.id === companyId);
        company.googleCalendar = {
          ...defaultGoogleCalendarStatus(),
          ...(company.googleCalendar || {}),
          connected: true,
          accountEmail: String(body.accountEmail || company.googleCalendar?.accountEmail || "").trim(),
          refreshTokenEncrypted: String(body.refreshTokenEncrypted || ""),
          accessTokenEncrypted: String(body.accessTokenEncrypted || ""),
          tokenExpiresAt: body.tokenExpiresAt || null,
          oauthCompleted: true,
          lastSyncAt: new Date().toISOString(),
        };
        company.updatedAt = new Date().toISOString();
        return { save: true, data: { googleCalendar: normalizeGoogleCalendarStatus(company.googleCalendar) } };
      });
    },

    async disconnectGoogleIntegration(companyId) {
      return withDb((db) => {
        const company = db.companies.find((item) => item.id === companyId);
        company.googleCalendar = defaultGoogleCalendarStatus();
        company.updatedAt = new Date().toISOString();
        return { save: true, data: { googleCalendar: normalizeGoogleCalendarStatus(company.googleCalendar) } };
      });
    },
  };
}

function addMinutes(dateTime, minutes) {
  const date = new Date(`${dateTime}:00`);
  date.setMinutes(date.getMinutes() + minutes);
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  return `${iso.slice(0, 10)}T${iso.slice(11, 16)}`;
}

function defaultGoogleCalendarStatus() {
  return {
    connected: false,
    calendarId: "",
    accountEmail: "",
    lastSyncAt: null,
    syncMode: "manual",
    oauthCompleted: false,
    refreshTokenEncrypted: "",
    accessTokenEncrypted: "",
    tokenExpiresAt: null,
  };
}

function normalizeGoogleCalendarStatus(value) {
  return {
    ...defaultGoogleCalendarStatus(),
    ...(value || {}),
    connected: Boolean(value?.connected),
    calendarId: String(value?.calendarId || ""),
    accountEmail: String(value?.accountEmail || ""),
    lastSyncAt: value?.lastSyncAt || null,
    oauthCompleted: Boolean(value?.oauthCompleted),
  };
}

import { PrismaClient } from "@prisma/client";
import { syncGoogleCalendarAppointment } from "../google-calendar.js";

export function createPrismaAppRepository(options = {}) {
  const prisma = options.prismaClient || new PrismaClient();
  const googleCalendarConfig = options.googleCalendarConfig || {};

  function createTrialWindow() {
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    return {
      trialStartsAt: startsAt,
      trialEndsAt: endsAt,
    };
  }

  async function getSalonRecord(salonId) {
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      include: {
        googleConnections: {
          where: { isActive: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });
    if (!salon) throw new Error("Salao nao encontrado.");
    return salon;
  }

  async function getPublicSalon() {
    const salon = await prisma.salon.findFirst({
      where: { isActive: true },
      include: {
        googleConnections: {
          where: { isActive: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });
    if (!salon) throw new Error("Salao nao encontrado.");
    return salon;
  }

  async function getPublicSalonBySlug(salonSlug) {
    const normalizedSlug = String(salonSlug || "").trim().toLowerCase();
    if (!normalizedSlug) return getPublicSalon();
    const salon = await prisma.salon.findFirst({
      where: { slug: normalizedSlug, isActive: true },
      include: {
        googleConnections: {
          where: { isActive: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });
    if (!salon) throw new Error("Salao nao encontrado.");
    return salon;
  }

  return {
    async createOwnerAccount() {
      const [payload] = arguments;
      const ownerName = String(payload.ownerName || "").trim();
      const salonName = String(payload.salonName || "").trim();
      const email = String(payload.email || "").trim().toLowerCase();
      const phone = String(payload.phone || "").trim();
      const passwordHash = String(payload.passwordHash || "");
      const planCode = String(payload.plan || "").trim() || "professional";

      if (!ownerName || !salonName || !email || !phone || !passwordHash) {
        throw new Error("Preencha os campos obrigatorios para criar a conta.");
      }

      const existingUser = await prisma.user.findFirst({
        where: { email, isActive: true },
      });
      if (existingUser) throw new Error("Ja existe uma conta com este e-mail.");

      const baseSlug = slugify(salonName) || "agenda-pro-salao";
      let slug = baseSlug;
      let index = 2;
      while (await prisma.salon.findFirst({ where: { slug } })) {
        slug = `${baseSlug}-${index}`;
        index += 1;
      }
      const trial = createTrialWindow();

      const salon = await prisma.salon.create({
        data: {
          name: salonName,
          slug,
          phone,
          whatsappNumber: phone,
          email,
          legalName: String(payload.legalName || salonName).trim(),
          billingDocumentId: String(payload.billingDocumentId || "").trim() || null,
          billingMethod: String(payload.billingMethod || "BOLETO").trim().toUpperCase(),
          planCode,
          billingStatus: String(payload.billingStatus || "trialing").trim().toLowerCase(),
          trialStartsAt: trial.trialStartsAt,
          trialEndsAt: trial.trialEndsAt,
          subscriptionEndsAt: payload.subscriptionEndsAt ? new Date(payload.subscriptionEndsAt) : null,
          billingProvider: String(payload.billingProvider || "").trim().toLowerCase() || null,
          billingCustomerId: String(payload.billingCustomerId || "").trim() || null,
          billingSubscriptionId: String(payload.billingSubscriptionId || "").trim() || null,
          users: {
            create: {
              name: ownerName,
              email,
              passwordHash,
              role: "OWNER",
            },
          },
        },
        include: {
          users: true,
          googleConnections: {
            where: { isActive: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      });
      const user = salon.users[0];
      const mappedSalon = mapSalon(salon);
      return {
        user: {
          ...mapUser(user),
          passwordHash: user.passwordHash,
        },
        company: mappedSalon,
        salon: mappedSalon,
      };
    },

    async findUserByEmail() {
      const [email] = arguments;
      const user = await prisma.user.findFirst({
        where: {
          email: String(email || "").trim().toLowerCase(),
          isActive: true,
          salon: { isActive: true },
        },
        include: {
          salon: {
            include: {
              googleConnections: {
                where: { isActive: true },
                orderBy: { updatedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });
      if (!user) return null;
      const mappedUser = mapUser(user);
      const mappedSalon = mapSalon(user.salon);
      return {
        user: {
          ...mappedUser,
          passwordHash: user.passwordHash,
        },
        company: mappedSalon,
        salon: mappedSalon,
      };
    },
    async getSessionContext() {
      const [userId, salonId] = arguments;
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          salonId,
          isActive: true,
          salon: { isActive: true },
        },
        include: {
          salon: {
            include: {
              googleConnections: {
                where: { isActive: true },
                orderBy: { updatedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });
      if (!user) return null;
      const mappedSalon = mapSalon(user.salon);
      return {
        user: mapUser(user),
        company: mappedSalon,
        salon: mappedSalon,
      };
    },
    async getPublicCatalog() {
      const [input = {}] = arguments;
      const salon = await getPublicSalonBySlug(input.salonSlug);
      const [services, professionals] = await Promise.all([
        prisma.service.findMany({
          where: { salonId: salon.id, isActive: true, onlineBooking: true },
          orderBy: { name: "asc" },
        }),
        prisma.professional.findMany({
          where: { salonId: salon.id, isActive: true },
          include: {
            serviceLinks: true,
            schedules: {
              include: { breaks: true },
            },
          },
          orderBy: { name: "asc" },
        }),
      ]);

      const mappedServices = services.map(mapService);
      const serviceMap = new Map(mappedServices.map((item) => [item.id, item]));

      return {
        salon: mapSalon(salon),
        company: mapSalon(salon),
        services: mappedServices,
        professionals: professionals.map((professional) => mapProfessional(professional, serviceMap)),
      };
    },
    async getPublicAvailability() {
      const [input] = arguments;
      const salon = await getPublicSalonBySlug(input?.salonSlug);
      return computeAvailability(prisma, salon, input);
    },
    async createPublicAppointment() {
      const [body] = arguments;
      const salon = await getPublicSalonBySlug(body?.salonSlug);
      return createAppointmentForSalon(prisma, salon, body, {
        isPublic: true,
        googleCalendarConfig,
      });
    },
    async getDashboard() {
      return asyncDashboard(prisma, arguments[0]);
    },
    async getSalon() {
      const salon = await getSalonRecord(arguments[0]);
      return {
        salon: mapSalon(salon),
        company: mapSalon(salon),
      };
    },
    async updateSubscription() {
      const [salonId, payload] = arguments;
      const updated = await prisma.salon.update({
        where: { id: salonId },
        data: {
          ...(payload.planCode ? { planCode: String(payload.planCode || "").trim().toLowerCase() } : {}),
          ...(payload.billingProvider !== undefined ? { billingProvider: String(payload.billingProvider || "").trim().toLowerCase() || null } : {}),
          ...(payload.billingStatus ? { billingStatus: String(payload.billingStatus || "").trim().toLowerCase() } : {}),
          ...(payload.billingCustomerId !== undefined ? { billingCustomerId: String(payload.billingCustomerId || "").trim() || null } : {}),
          ...(payload.billingSubscriptionId !== undefined ? { billingSubscriptionId: String(payload.billingSubscriptionId || "").trim() || null } : {}),
          ...(payload.subscriptionEndsAt !== undefined ? { subscriptionEndsAt: payload.subscriptionEndsAt ? new Date(payload.subscriptionEndsAt) : null } : {}),
        },
        include: {
          googleConnections: {
            where: { isActive: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      });
      return {
        salon: mapSalon(updated),
        company: mapSalon(updated),
      };
    },
    async updateBillingProfile() {
      const [salonId, payload] = arguments;
      const updated = await prisma.salon.update({
        where: { id: salonId },
        data: {
          legalName: String(payload.legalName || "").trim() || null,
          billingDocumentId: String(payload.billingDocumentId || "").trim() || null,
          billingMethod: String(payload.billingMethod || "BOLETO").trim().toUpperCase(),
          ...(payload.email !== undefined ? { email: String(payload.email || "").trim() || null } : {}),
          ...(payload.phone !== undefined
            ? {
                phone: String(payload.phone || "").trim(),
                whatsappNumber: String(payload.phone || "").trim(),
              }
            : {}),
        },
        include: {
          googleConnections: {
            where: { isActive: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      });
      return {
        salon: mapSalon(updated),
        company: mapSalon(updated),
      };
    },
    async findSalonByBillingSubscriptionId() {
      const [subscriptionId] = arguments;
      if (!subscriptionId) return null;
      const salon = await prisma.salon.findFirst({
        where: { billingSubscriptionId: String(subscriptionId) },
        include: {
          googleConnections: {
            where: { isActive: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      });
      return salon ? mapSalon(salon) : null;
    },
    async updateSalon() {
      const [salonId, payload] = arguments;
      const updated = await prisma.salon.update({
        where: { id: salonId },
        data: {
          name: String(payload.name || "").trim(),
          slug: String(payload.slug || "").trim() || undefined,
          phone: String(payload.phone || "").trim(),
          whatsappNumber: String(payload.whatsappNumber || payload.phone || "").trim(),
          email: String(payload.email || "").trim() || null,
          addressLine1: String(payload.address || "").trim() || null,
        },
        include: {
          googleConnections: {
            where: { isActive: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      });
      return {
        salon: mapSalon(updated),
        company: mapSalon(updated),
      };
    },
    async listServices() {
      const services = await prisma.service.findMany({
        where: { salonId: arguments[0] },
        orderBy: { name: "asc" },
      });
      return { services: services.map(mapService) };
    },
    async createService() {
      const [salonId, payload] = arguments;
      const service = await prisma.service.create({
        data: {
          salonId,
          name: String(payload.name || "").trim(),
          slug: String(payload.slug || "").trim() || slugify(payload.name || ""),
          category: String(payload.category || "").trim() || null,
          description: String(payload.description || "").trim() || null,
          durationMin: Number(payload.durationMin ?? payload.duration ?? 0),
          priceCents: toPriceCents(payload.priceCents ?? payload.price),
          onlineBooking: payload.onlineBooking ?? true,
        },
      });
      return { service: mapService(service) };
    },
    async updateService() {
      const [, serviceId, payload] = arguments;
      const service = await prisma.service.update({
        where: { id: serviceId },
        data: {
          name: String(payload.name || "").trim(),
          slug: String(payload.slug || "").trim() || slugify(payload.name || ""),
          category: String(payload.category || "").trim() || null,
          description: String(payload.description || "").trim() || null,
          durationMin: Number(payload.durationMin ?? payload.duration ?? 0),
          priceCents: toPriceCents(payload.priceCents ?? payload.price),
          onlineBooking: payload.onlineBooking ?? true,
        },
      });
      return { service: mapService(service) };
    },
    async deleteService() {
      const [salonId, serviceId] = arguments;
      const activeAppointments = await prisma.appointment.count({
        where: {
          salonId,
          serviceId,
          status: { not: "CANCELED" },
        },
      });
      if (activeAppointments > 0) {
        throw new Error("Nao e possivel excluir um servico com agendamentos ativos.");
      }
      await prisma.professionalService.deleteMany({ where: { serviceId } });
      await prisma.service.delete({ where: { id: serviceId } });
      return { ok: true };
    },
    async listProfessionals() {
      const [salonId] = arguments;
      const [services, professionals] = await Promise.all([
        prisma.service.findMany({ where: { salonId }, orderBy: { name: "asc" } }),
        prisma.professional.findMany({
          where: { salonId },
          include: {
            serviceLinks: true,
            schedules: { include: { breaks: true } },
          },
          orderBy: { name: "asc" },
        }),
      ]);
      const serviceMap = new Map(services.map((service) => [service.id, mapService(service)]));
      return { professionals: professionals.map((professional) => mapProfessional(professional, serviceMap)) };
    },
    async createProfessional() {
      const [salonId, payload] = arguments;
      const professional = await prisma.professional.create({
        data: {
          salonId,
          name: String(payload.name || "").trim(),
          slug: String(payload.slug || "").trim() || slugify(payload.name || ""),
          specialty: String(payload.specialty || "").trim() || null,
          avatarUrl: String(payload.photoUrl || "").trim() || null,
          bio: String(payload.bio || "").trim() || null,
          serviceLinks: {
            create: (payload.serviceIds || []).map((serviceId) => ({ serviceId })),
          },
          schedules: {
            create: mapSchedulesForCreate(payload.workingHours || {}, payload.breaks || {}),
          },
        },
        include: {
          serviceLinks: true,
          schedules: { include: { breaks: true } },
        },
      });
      const services = await prisma.service.findMany({ where: { salonId } });
      const serviceMap = new Map(services.map((service) => [service.id, mapService(service)]));
      return { professional: mapProfessional(professional, serviceMap) };
    },
    async updateProfessional() {
      const [salonId, professionalId, payload] = arguments;
      await prisma.professionalService.deleteMany({ where: { professionalId } });
      await prisma.scheduleBreak.deleteMany({
        where: { professionalSchedule: { professionalId } },
      });
      await prisma.professionalSchedule.deleteMany({ where: { professionalId } });

      const professional = await prisma.professional.update({
        where: { id: professionalId },
        data: {
          name: String(payload.name || "").trim(),
          slug: String(payload.slug || "").trim() || slugify(payload.name || ""),
          specialty: String(payload.specialty || "").trim() || null,
          avatarUrl: String(payload.photoUrl || "").trim() || null,
          bio: String(payload.bio || "").trim() || null,
          serviceLinks: {
            create: (payload.serviceIds || []).map((serviceId) => ({ serviceId })),
          },
          schedules: {
            create: mapSchedulesForCreate(payload.workingHours || {}, payload.breaks || {}),
          },
        },
        include: {
          serviceLinks: true,
          schedules: { include: { breaks: true } },
        },
      });
      const services = await prisma.service.findMany({ where: { salonId } });
      const serviceMap = new Map(services.map((service) => [service.id, mapService(service)]));
      return { professional: mapProfessional(professional, serviceMap) };
    },
    async deleteProfessional() {
      const [salonId, professionalId] = arguments;
      const activeAppointments = await prisma.appointment.count({
        where: {
          salonId,
          professionalId,
          status: { not: "CANCELED" },
        },
      });
      if (activeAppointments > 0) {
        throw new Error("Nao e possivel excluir um profissional com agendamentos ativos.");
      }
      await prisma.professionalService.deleteMany({ where: { professionalId } });
      await prisma.scheduleBreak.deleteMany({
        where: { professionalSchedule: { professionalId } },
      });
      await prisma.professionalSchedule.deleteMany({ where: { professionalId } });
      await prisma.professional.delete({ where: { id: professionalId } });
      return { ok: true };
    },
    async listClients() {
      const customers = await prisma.customer.findMany({
        where: { salonId: arguments[0] },
        include: {
          appointments: {
            orderBy: { startAt: "desc" },
            include: {
              professional: true,
              service: true,
            },
          },
        },
        orderBy: { fullName: "asc" },
      });
      return {
        clients: customers.map((customer) => ({
          id: customer.id,
          name: customer.fullName,
          fullName: customer.fullName,
          phone: customer.phone,
          email: customer.email || "",
          notes: customer.notes || "",
          appointmentsCount: customer.appointments.length,
          lastServiceAt: customer.appointments[0]?.startAt?.toISOString() || null,
          history: customer.appointments.slice(0, 5).map(mapAppointment),
        })),
      };
    },
    async createClient() {
      const [salonId, payload] = arguments;
      const customer = await prisma.customer.create({
        data: {
          salonId,
          fullName: String(payload.fullName || payload.name || "").trim(),
          phone: String(payload.phone || "").trim(),
          email: String(payload.email || "").trim() || null,
          notes: String(payload.notes || "").trim() || null,
        },
      });
      return { client: mapCustomer(customer) };
    },
    async updateClient() {
      const [, clientId, payload] = arguments;
      const customer = await prisma.customer.update({
        where: { id: clientId },
        data: {
          fullName: String(payload.fullName || payload.name || "").trim(),
          phone: String(payload.phone || "").trim(),
          email: String(payload.email || "").trim() || null,
          notes: String(payload.notes || "").trim() || null,
        },
      });
      return { client: mapCustomer(customer) };
    },
    async deleteClient() {
      const [, clientId] = arguments;
      const appointments = await prisma.appointment.count({ where: { customerId: clientId } });
      if (appointments > 0) {
        throw new Error("Nao e possivel excluir um cliente com historico de agendamentos.");
      }
      await prisma.customer.delete({ where: { id: clientId } });
      return { ok: true };
    },
    async listAppointments() {
      const [salonId, filters = {}] = arguments;
      const normalizedStatus = filters.status ? normalizeAppointmentStatus(filters.status, "") : "";
      const where = {
        salonId,
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
        ...(filters.professionalId ? { professionalId: filters.professionalId } : {}),
        ...(filters.date
          ? {
              startAt: {
                gte: new Date(`${filters.date}T00:00:00.000-03:00`),
                lt: new Date(`${filters.date}T23:59:59.999-03:00`),
              },
            }
          : {}),
      };
      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          customer: true,
          professional: true,
          service: true,
        },
        orderBy: { startAt: "asc" },
      });
      return { appointments: appointments.map(mapAppointment) };
    },
    async createAppointment() {
      const [salonId, , body] = arguments;
      const salon = await getSalonRecord(salonId);
      return createAppointmentForSalon(prisma, salon, body, {
        isPublic: false,
        googleCalendarConfig,
      });
    },
    async updateAppointment() {
      const [salonId, salonLike, appointmentId, body] = arguments;
      const salon = salonLike?.id ? salonLike : await getSalonRecord(salonId);
      return updateAppointmentForSalon(prisma, salon, appointmentId, body, {
        googleCalendarConfig,
      });
    },
    async listNotifications() {
      const [salonId] = arguments;
      const logs = await prisma.notificationLog.findMany({
        where: { salonId },
        include: {
          appointment: {
            include: {
              customer: true,
              professional: true,
              service: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        notifications: logs.map((item) => ({
          id: item.id,
          type: item.templateKey,
          channels: [item.channel.toLowerCase()],
          message: item.errorMessage || "",
          createdAt: item.createdAt.toISOString(),
          appointment: item.appointment ? mapAppointment(item.appointment) : null,
          clientName: item.appointment?.customer?.fullName || "Cliente",
        })),
      };
    },
    async getGoogleIntegration() {
      const salon = await getSalonRecord(arguments[0]);
      return { googleCalendar: mapGoogleCalendarStatus(salon.googleConnections?.[0]) };
    },
    async connectGoogleIntegration() {
      const [salonId, body] = arguments;
      const connection = await prisma.$transaction(async (tx) => {
        await tx.googleCalendarConnection.updateMany({
          where: { salonId, isActive: true },
          data: { isActive: false },
        });

        return tx.googleCalendarConnection.create({
          data: {
            salonId,
            googleAccountEmail: String(body.accountEmail || "").trim(),
            calendarId: String(body.calendarId || "primary").trim(),
            refreshTokenEncrypted: "pending-oauth-token",
            accessTokenEncrypted: null,
            tokenExpiresAt: null,
            isActive: Boolean(body.connected ?? true),
          },
        });
      });
      return { googleCalendar: mapGoogleCalendarStatus(connection) };
    },
    async completeGoogleOAuthConnection() {
      const [salonId, payload] = arguments;
      const current = await prisma.googleCalendarConnection.findFirst({
        where: { salonId, isActive: true },
        orderBy: { updatedAt: "desc" },
      });

      const connection = current
        ? await prisma.googleCalendarConnection.update({
            where: { id: current.id },
            data: {
              googleAccountEmail: String(payload.accountEmail || current.googleAccountEmail || "").trim(),
              refreshTokenEncrypted: String(payload.refreshTokenEncrypted || current.refreshTokenEncrypted || ""),
              accessTokenEncrypted: String(payload.accessTokenEncrypted || current.accessTokenEncrypted || ""),
              tokenExpiresAt: payload.tokenExpiresAt || null,
              isActive: true,
            },
          })
        : await prisma.googleCalendarConnection.create({
            data: {
              salonId,
              googleAccountEmail: String(payload.accountEmail || "").trim(),
              calendarId: String(payload.calendarId || "primary").trim(),
              refreshTokenEncrypted: String(payload.refreshTokenEncrypted || ""),
              accessTokenEncrypted: String(payload.accessTokenEncrypted || ""),
              tokenExpiresAt: payload.tokenExpiresAt || null,
              isActive: true,
            },
          });

      return { googleCalendar: mapGoogleCalendarStatus(connection) };
    },
    async disconnectGoogleIntegration() {
      const [salonId] = arguments;
      await prisma.googleCalendarConnection.updateMany({
        where: { salonId, isActive: true },
        data: { isActive: false },
      });
      return { googleCalendar: mapGoogleCalendarStatus(null) };
    },
  };
}

async function asyncDashboard(prisma, salonId) {
  const [professionals, services, customers, appointments, todayAppointments] = await Promise.all([
    prisma.professional.count({ where: { salonId } }),
    prisma.service.count({ where: { salonId } }),
    prisma.customer.count({ where: { salonId } }),
    prisma.appointment.count({ where: { salonId, status: { not: "CANCELED" } } }),
    prisma.appointment.count({
      where: {
        salonId,
        status: { not: "CANCELED" },
        startAt: {
          gte: startOfToday(),
          lt: endOfToday(),
        },
      },
    }),
  ]);

  return {
    stats: {
      professionals,
      services,
      clients: customers,
      appointments,
      today: todayAppointments,
    },
  };
}

async function computeAvailability(prisma, salon, input) {
  const serviceId = String(input?.serviceId || "").trim();
  const professionalId = String(input?.professionalId || "").trim();
  const date = String(input?.date || "").trim();
  const excludeAppointmentId = String(input?.excludeAppointmentId || "").trim();

  if (!serviceId || !professionalId || !date) return { slots: [] };

  const [service, professional, blockedTimes, appointments] = await Promise.all([
    prisma.service.findFirst({
      where: { id: serviceId, salonId: salon.id, isActive: true, onlineBooking: true },
    }),
    prisma.professional.findFirst({
      where: { id: professionalId, salonId: salon.id, isActive: true },
      include: {
        serviceLinks: true,
        schedules: { include: { breaks: true } },
      },
    }),
    prisma.blockedTime.findMany({
      where: {
        salonId: salon.id,
        startAt: { lt: endOfLocalDate(date) },
        endAt: { gt: startOfLocalDate(date) },
        OR: [{ scope: "SALON" }, { professionalId }],
      },
    }),
    prisma.appointment.findMany({
      where: {
        salonId: salon.id,
        professionalId,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        status: { not: "CANCELED" },
        startAt: { lt: endOfLocalDate(date) },
        endAt: { gt: startOfLocalDate(date) },
      },
      orderBy: { startAt: "asc" },
    }),
  ]);

  if (!service || !professional) return { slots: [] };
  if (!(professional.serviceLinks || []).some((item) => item.serviceId === service.id)) return { slots: [] };

  const weekday = new Date(`${date}T12:00:00`).getDay();
  const windows = (professional.schedules || []).filter((schedule) => schedule.weekday === weekday);
  if (!windows.length) return { slots: [] };

  const breakRanges = windows.flatMap((schedule) => (schedule.breaks || []).map((item) => ({
    start: item.startTime,
    end: item.endTime,
  })));

  const blockedRanges = blockedTimes.map((item) => ({
    start: toTimeString(item.startAt),
    end: toTimeString(item.endAt),
  }));

  const appointmentRanges = appointments.map((item) => ({
    start: toTimeString(item.startAt),
    end: toTimeString(item.endAt),
  }));

  const rangesToAvoid = [...breakRanges, ...blockedRanges, ...appointmentRanges];
  const duration = service.durationMin + (service.cleanupBufferMin || 0) + (professional.bufferBeforeMin || 0) + (professional.bufferAfterMin || 0);
  const slotInterval = salon.slotIntervalMinutes || 15;
  const nowLocal = toDateTimeKey(new Date());
  const minBookingDateTime = addMinutesKey(nowLocal, salon.bookingLeadMinutes || 0);
  const slots = [];

  for (const window of windows) {
    let cursor = toMinutes(window.startTime);
    const limit = toMinutes(window.endTime);

    while (cursor + duration <= limit) {
      const candidateStart = formatMinutes(cursor);
      const candidateEnd = formatMinutes(cursor + duration);
      const startAt = `${date}T${candidateStart}`;

      if (!overlapsAny(candidateStart, candidateEnd, rangesToAvoid) && startAt >= minBookingDateTime) {
        slots.push({
          startAt,
          endAt: `${date}T${candidateEnd}`,
          label: `${candidateStart} - ${candidateEnd}`,
        });
      }

      cursor += slotInterval;
    }
  }

  return { slots };
}

async function createAppointmentForSalon(prisma, salon, body, options = {}) {
  const isPublic = Boolean(options.isPublic);
  const googleCalendarConfig = options.googleCalendarConfig || {};
  const serviceId = String(body.serviceId || "").trim();
  const professionalId = String(body.professionalId || "").trim();
  const startAtKey = normalizeDateTimeKey(body.startAt || "");
  const requestedStatus = normalizeAppointmentStatus(body.status, isPublic ? "PENDING" : "CONFIRMED");
  const notes = String(body.notes || "").trim() || String(body.client?.notes || "").trim();

  if (!serviceId || !professionalId || !startAtKey) {
    throw new Error("Dados obrigatorios do agendamento nao foram informados.");
  }

  const [service, professional, availability] = await Promise.all([
    prisma.service.findFirst({
      where: { id: serviceId, salonId: salon.id, isActive: true },
    }),
    prisma.professional.findFirst({
      where: { id: professionalId, salonId: salon.id, isActive: true },
      include: { serviceLinks: true },
    }),
    computeAvailability(prisma, salon, {
      serviceId,
      professionalId,
      date: startAtKey.slice(0, 10),
    }),
  ]);

  if (!service) throw new Error("Servico nao encontrado.");
  if (!professional) throw new Error("Profissional nao encontrado.");
  if (!(professional.serviceLinks || []).some((item) => item.serviceId === service.id)) {
    throw new Error("Esse profissional nao realiza o servico selecionado.");
  }
  if (!availability.slots.some((slot) => slot.startAt === startAtKey)) {
    throw new Error("Horario indisponivel para este profissional.");
  }

  const customerInput = body.client || {};
  const customerName = String(customerInput.fullName || customerInput.name || "").trim();
  const customerPhone = String(customerInput.phone || "").trim();
  if (!customerName || !customerPhone) {
    throw new Error("Nome completo e telefone sao obrigatorios.");
  }

  const customer = await upsertPrismaCustomer(prisma, salon.id, customerInput);
  const startAt = fromDateTimeKey(startAtKey);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
  const googleConnection = salon.googleConnections?.[0] || null;
  const googleSyncState = buildGoogleSyncState(googleConnection, requestedStatus === "CANCELED" ? "cancel" : "create");

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        salonId: salon.id,
        customerId: customer.id,
        professionalId: professional.id,
        serviceId: service.id,
        status: requestedStatus,
        source: isPublic ? "public_booking" : "admin",
        startAt,
        endAt,
        customerNameSnapshot: customer.fullName,
        customerPhoneSnapshot: customer.phone,
        serviceNameSnapshot: service.name,
        servicePriceCents: service.priceCents,
        durationMinSnapshot: service.durationMin,
        internalNotes: notes || null,
        googleCalendarEventId: googleSyncState.googleCalendarEventId,
        googleSyncStatus: googleSyncState.googleSyncStatus,
        googleSyncError: googleSyncState.googleSyncError,
        googleSyncedAt: googleSyncState.googleSyncedAt,
        googleTargetCalendarId: googleSyncState.googleTargetCalendarId,
      },
      include: {
        customer: true,
        professional: true,
        service: true,
      },
    });

    await createNotificationLogs(tx, salon.id, created, customer.phone, "booking_created", ["WHATSAPP"]);
    return created;
  });

  const synchronizedAppointment = await finalizeGoogleCalendarSync(prisma, salon, appointment, "create", googleCalendarConfig);

  return {
    appointment: mapAppointment(synchronizedAppointment),
    notificationsQueued: {
      channels: ["whatsapp"],
      message: buildNotificationMessage(customer.fullName, salon.name, "confirmacao", startAtKey),
    },
  };
}

async function updateAppointmentForSalon(prisma, salon, appointmentId, body, options = {}) {
  const googleCalendarConfig = options.googleCalendarConfig || {};
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, salonId: salon.id },
    include: {
      customer: true,
      professional: { include: { serviceLinks: true } },
      service: true,
    },
  });
  if (!appointment) throw new Error("Agendamento nao encontrado.");

  const nextProfessionalId = String(body.professionalId || appointment.professionalId).trim();
  const nextServiceId = String(body.serviceId || appointment.serviceId).trim();
  const nextClientId = String(body.clientId || appointment.customerId).trim();
  const nextStartAtKey = body.startAt ? normalizeDateTimeKey(body.startAt) : toDateTimeKey(appointment.startAt);
  const nextStatus = body.status ? normalizeAppointmentStatus(body.status, appointment.status) : appointment.status;
  const nextNotes = body.notes !== undefined ? String(body.notes || "").trim() : appointment.internalNotes || "";

  const [service, professional, customer] = await Promise.all([
    prisma.service.findFirst({ where: { id: nextServiceId, salonId: salon.id, isActive: true } }),
    prisma.professional.findFirst({
      where: { id: nextProfessionalId, salonId: salon.id, isActive: true },
      include: { serviceLinks: true },
    }),
    prisma.customer.findFirst({ where: { id: nextClientId, salonId: salon.id } }),
  ]);

  if (!service) throw new Error("Servico nao encontrado.");
  if (!professional) throw new Error("Profissional nao encontrado.");
  if (!customer) throw new Error("Cliente nao encontrado.");
  if (!(professional.serviceLinks || []).some((item) => item.serviceId === service.id)) {
    throw new Error("Esse profissional nao realiza o servico selecionado.");
  }

  if (body.startAt || body.professionalId || body.serviceId) {
    const availability = await computeAvailability(prisma, salon, {
      serviceId: nextServiceId,
      professionalId: nextProfessionalId,
      date: nextStartAtKey.slice(0, 10),
      excludeAppointmentId: appointment.id,
    });
    if (!availability.slots.some((slot) => slot.startAt === nextStartAtKey)) {
      throw new Error("Horario indisponivel para este profissional.");
    }
  }
  const googleConnection = salon.googleConnections?.[0] || null;
  const googleAction =
    nextStatus === "CANCELED"
      ? "cancel"
      : body.startAt || body.professionalId || body.serviceId
        ? "update"
        : body.status && nextStatus !== appointment.status
          ? "update"
          : "noop";
  const googleSyncState = buildGoogleSyncState(googleConnection, googleAction, appointment.googleCalendarEventId);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        customerId: customer.id,
        professionalId: professional.id,
        serviceId: service.id,
        status: nextStatus,
        startAt: fromDateTimeKey(nextStartAtKey),
        endAt: new Date(fromDateTimeKey(nextStartAtKey).getTime() + service.durationMin * 60000),
        customerNameSnapshot: customer.fullName,
        customerPhoneSnapshot: customer.phone,
        serviceNameSnapshot: service.name,
        servicePriceCents: service.priceCents,
        durationMinSnapshot: service.durationMin,
        internalNotes: nextNotes || null,
        canceledAt: nextStatus === "CANCELED" ? new Date() : null,
        googleCalendarEventId: googleSyncState.googleCalendarEventId,
        googleSyncStatus: googleSyncState.googleSyncStatus,
        googleSyncError: googleSyncState.googleSyncError,
        googleSyncedAt: googleSyncState.googleSyncedAt,
        googleTargetCalendarId: googleSyncState.googleTargetCalendarId,
      },
      include: {
        customer: true,
        professional: true,
        service: true,
      },
    });

    const templateKey =
      nextStatus === "CANCELED"
        ? "booking_canceled"
        : body.startAt || body.professionalId || body.serviceId
          ? "booking_rescheduled"
          : "booking_updated";

    await createNotificationLogs(tx, salon.id, result, customer.phone, templateKey, ["WHATSAPP"]);
    return result;
  });

  const syncAction = nextStatus === "CANCELED" ? "cancel" : appointment.googleCalendarEventId ? "update" : "create";
  const synchronizedAppointment = await finalizeGoogleCalendarSync(prisma, salon, updated, syncAction, googleCalendarConfig);
  return { appointment: mapAppointment(synchronizedAppointment) };
}

async function upsertPrismaCustomer(prisma, salonId, customerInput) {
  const phone = String(customerInput.phone || "").trim();
  const email = String(customerInput.email || "").trim().toLowerCase();
  const fullName = String(customerInput.fullName || customerInput.name || "").trim();
  const notes = String(customerInput.notes || "").trim();

  const existing = await prisma.customer.findFirst({
    where: {
      salonId,
      OR: [{ phone }, ...(email ? [{ email }] : [])],
    },
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        fullName,
        phone,
        email: email || null,
        notes: notes || null,
      },
    });
  }

  return prisma.customer.create({
    data: {
      salonId,
      fullName,
      phone,
      email: email || null,
      notes: notes || null,
    },
  });
}

async function createNotificationLogs(prismaOrTx, salonId, appointment, recipient, templateKey, channels) {
  if (!recipient) return;
  for (const channel of channels) {
    await prismaOrTx.notificationLog.create({
      data: {
        salonId,
        appointmentId: appointment.id,
        channel,
        templateKey,
        recipient,
        status: "PENDING",
      },
    });
  }
}

function mapSalon(salon) {
  return {
    id: salon.id,
    name: salon.name,
    slug: salon.slug,
    address: salon.addressLine1 || "",
    phone: salon.phone,
    whatsappNumber: salon.whatsappNumber || salon.phone,
    email: salon.email || "",
    legalName: salon.legalName || "",
    billingDocumentId: salon.billingDocumentId || "",
    billingMethod: salon.billingMethod || "BOLETO",
    logoUrl: "",
    instagram: "",
    facebook: "",
    holidays: [],
    openOnSaturday: true,
    openOnSunday: false,
    reminderChannels: ["whatsapp"],
    subscription: {
      planCode: String(salon.planCode || "starter"),
      billingStatus: String(salon.billingStatus || "trialing"),
      trialStartsAt: salon.trialStartsAt?.toISOString?.() || null,
      trialEndsAt: salon.trialEndsAt?.toISOString?.() || null,
      subscriptionEndsAt: salon.subscriptionEndsAt?.toISOString?.() || null,
      billingProvider: salon.billingProvider || "",
      billingCustomerId: salon.billingCustomerId || "",
      billingSubscriptionId: salon.billingSubscriptionId || "",
    },
    googleCalendar: mapGoogleCalendarStatus(salon.googleConnections?.[0]),
  };
}

function mapUser(user) {
  return {
    id: user.id,
    companyId: user.salonId,
    salonId: user.salonId,
    name: user.name,
    email: user.email,
    role: String(user.role || "").toLowerCase(),
  };
}

function mapService(service) {
  return {
    id: service.id,
    salonId: service.salonId,
    companyId: service.salonId,
    name: service.name,
    category: service.category || "",
    duration: service.durationMin,
    durationMin: service.durationMin,
    price: service.priceCents / 100,
    priceCents: service.priceCents,
    description: service.description || "",
    onlineBooking: service.onlineBooking,
  };
}

function mapProfessional(professional, serviceMap) {
  const workingHours = {};
  const breaks = {};
  for (const schedule of professional.schedules || []) {
    const weekday = String(schedule.weekday);
    if (!workingHours[weekday]) workingHours[weekday] = [];
    workingHours[weekday].push({ start: schedule.startTime, end: schedule.endTime });

    if (schedule.breaks?.length) {
      if (!breaks[weekday]) breaks[weekday] = [];
      for (const item of schedule.breaks) {
        breaks[weekday].push({ start: item.startTime, end: item.endTime });
      }
    }
  }

  return {
    id: professional.id,
    companyId: professional.salonId,
    salonId: professional.salonId,
    name: professional.name,
    specialty: professional.specialty || "",
    photoUrl: professional.avatarUrl || "",
    bio: professional.bio || "",
    serviceIds: (professional.serviceLinks || []).map((item) => item.serviceId),
    serviceNames: (professional.serviceLinks || [])
      .map((item) => serviceMap.get(item.serviceId)?.name)
      .filter(Boolean),
    workingHours,
    breaks,
    daysOff: [],
  };
}

function mapCustomer(customer) {
  return {
    id: customer.id,
    name: customer.fullName,
    fullName: customer.fullName,
    phone: customer.phone,
    email: customer.email || "",
    notes: customer.notes || "",
  };
}

function mapAppointment(appointment) {
  return {
    id: appointment.id,
    salonId: appointment.salonId,
    companyId: appointment.salonId,
    professionalId: appointment.professionalId,
    serviceId: appointment.serviceId,
    clientId: appointment.customerId,
    status: mapStatusToLegacy(appointment.status),
    startAt: toDateTimeKey(appointment.startAt),
    endAt: toDateTimeKey(appointment.endAt),
    notes: appointment.internalNotes || "",
    source: appointment.source,
    clientName: appointment.customer?.fullName || appointment.customerNameSnapshot || "Cliente",
    customerName: appointment.customer?.fullName || appointment.customerNameSnapshot || "Cliente",
    clientPhone: appointment.customer?.phone || appointment.customerPhoneSnapshot || "",
    clientEmail: appointment.customer?.email || "",
    professionalName: appointment.professional?.name || "",
    serviceName: appointment.service?.name || appointment.serviceNameSnapshot || "",
    serviceDuration: appointment.service?.durationMin || appointment.durationMinSnapshot || 0,
    servicePrice: appointment.service ? appointment.service.priceCents / 100 : appointment.servicePriceCents / 100,
    googleSync: {
      status: String(appointment.googleSyncStatus || "not_configured"),
      eventId: appointment.googleCalendarEventId || "",
      calendarId: appointment.googleTargetCalendarId || "",
      syncedAt: appointment.googleSyncedAt?.toISOString?.() || null,
      error: appointment.googleSyncError || "",
    },
  };
}

function mapGoogleCalendarStatus(connection) {
  if (!connection) {
    return {
      connected: false,
      calendarId: "",
      accountEmail: "",
      lastSyncAt: null,
      syncMode: "manual",
      oauthCompleted: false,
    };
  }

  return {
    connected: Boolean(connection.isActive),
    calendarId: connection.calendarId,
    accountEmail: connection.googleAccountEmail,
    lastSyncAt: connection.updatedAt?.toISOString?.() || null,
    syncMode: "manual",
    oauthCompleted: Boolean(
      connection.refreshTokenEncrypted &&
        connection.refreshTokenEncrypted !== "pending-oauth-token",
    ),
  };
}

function mapSchedulesForCreate(workingHours, breakMap) {
  return Object.entries(workingHours).flatMap(([weekday, ranges]) =>
    (Array.isArray(ranges) ? ranges : []).map((range) => ({
      weekday: Number(weekday),
      startTime: String(range.start || ""),
      endTime: String(range.end || ""),
      breaks: {
        create: ((breakMap?.[weekday] || []).map((item) => ({
          startTime: String(item.start || ""),
          endTime: String(item.end || ""),
        }))),
      },
    })),
  );
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toPriceCents(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return numeric > 1000 ? Math.round(numeric) : Math.round(numeric * 100);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function endOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
}

function mapStatusToLegacy(status) {
  return {
    PENDING: "pendente",
    CONFIRMED: "confirmado",
    COMPLETED: "concluido",
    CANCELED: "cancelado",
    NO_SHOW: "faltou",
  }[status] || String(status || "").toLowerCase();
}

function normalizeAppointmentStatus(value, fallback = "CONFIRMED") {
  const normalized = String(value || "").trim().toUpperCase();
  if (["PENDING", "CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"].includes(normalized)) {
    return normalized;
  }

  const mapped = {
    PENDENTE: "PENDING",
    CONFIRMADO: "CONFIRMED",
    CONCLUIDO: "COMPLETED",
    CANCELADO: "CANCELED",
    FALTOU: "NO_SHOW",
  }[normalized];

  return mapped || fallback;
}

function normalizeDateTimeKey(value) {
  const raw = String(value || "").trim().replace(" ", "T");
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) return "";
  return `${match[1]}T${match[2]}`;
}

function fromDateTimeKey(value) {
  const normalized = normalizeDateTimeKey(value);
  return new Date(`${normalized}:00-03:00`);
}

function toDateTimeKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function startOfLocalDate(date) {
  return new Date(`${date}T00:00:00-03:00`);
}

function endOfLocalDate(date) {
  return new Date(`${date}T23:59:59-03:00`);
}

function toTimeString(value) {
  const date = value instanceof Date ? value : new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toMinutes(value) {
  const [hour, minute] = String(value || "00:00").split(":").map(Number);
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

function addMinutesKey(dateTimeKey, minutes) {
  const date = fromDateTimeKey(dateTimeKey);
  date.setMinutes(date.getMinutes() + minutes);
  return toDateTimeKey(date);
}

function buildNotificationMessage(customerName, salonName, typeLabel, startAtKey) {
  return `${customerName}, seu ${typeLabel} na ${salonName} esta previsto para ${formatDateTimeKey(startAtKey)}.`;
}

function formatDateTimeKey(value) {
  return fromDateTimeKey(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function buildGoogleSyncState(connection, action, existingEventId = null) {
  const normalizedAction = action || "noop";

  if (!connection?.isActive) {
    return {
      googleCalendarEventId: normalizedAction === "cancel" ? null : existingEventId,
      googleSyncStatus: "not_configured",
      googleSyncError: "",
      googleSyncedAt: null,
      googleTargetCalendarId: null,
    };
  }

  const hasOAuthTokens = Boolean(
    connection.refreshTokenEncrypted &&
      connection.refreshTokenEncrypted !== "pending-oauth-token",
  );

  if (!hasOAuthTokens) {
    return {
      googleCalendarEventId: normalizedAction === "cancel" ? null : existingEventId,
      googleSyncStatus: "pending_oauth",
      googleSyncError: "Conta Google conectada, mas ainda sem autorizacao OAuth concluida.",
      googleSyncedAt: null,
      googleTargetCalendarId: connection.calendarId || "primary",
    };
  }

  const statusByAction = {
    create: "pending_create",
    update: "pending_update",
    cancel: "pending_cancel",
    noop: existingEventId ? "synced" : "pending_create",
  };

  return {
    googleCalendarEventId: normalizedAction === "cancel" ? existingEventId : existingEventId,
    googleSyncStatus: statusByAction[normalizedAction] || "pending_update",
    googleSyncError: "",
    googleSyncedAt: normalizedAction === "noop" && existingEventId ? new Date() : null,
    googleTargetCalendarId: connection.calendarId || "primary",
  };
}

async function finalizeGoogleCalendarSync(prisma, salon, appointment, action, googleCalendarConfig) {
  const connection = await prisma.googleCalendarConnection.findFirst({
    where: { salonId: salon.id, isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!connection) return appointment;

  try {
    const result = await syncGoogleCalendarAppointment({
      appointment,
      salon,
      connection,
      clientId: googleCalendarConfig.clientId,
      clientSecret: googleCalendarConfig.clientSecret,
      decryptValue: googleCalendarConfig.decryptValue || ((value) => value),
      encryptValue: googleCalendarConfig.encryptValue || ((value) => value),
      action,
    });

    const updated = await prisma.$transaction(async (tx) => {
      if (result.connectionUpdate) {
        await tx.googleCalendarConnection.update({
          where: { id: connection.id },
          data: {
            accessTokenEncrypted: result.connectionUpdate.accessTokenEncrypted,
            tokenExpiresAt: result.connectionUpdate.tokenExpiresAt,
          },
        });
      }

      return tx.appointment.update({
        where: { id: appointment.id },
        data: {
          googleCalendarEventId: result.googleCalendarEventId,
          googleSyncStatus: result.googleSyncStatus,
          googleSyncError: result.googleSyncError || null,
          googleSyncedAt: result.googleSyncedAt,
          googleTargetCalendarId: result.googleTargetCalendarId,
        },
        include: {
          customer: true,
          professional: true,
          service: true,
        },
      });
    });

    return updated;
  } catch (error) {
    return prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        googleSyncStatus: "sync_error",
        googleSyncError: error.message || "Falha ao sincronizar com Google Agenda.",
        googleSyncedAt: null,
      },
      include: {
        customer: true,
        professional: true,
        service: true,
      },
    });
  }
}

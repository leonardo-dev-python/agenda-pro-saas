import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { hashPassword } from "./auth.js";

export function createDatabaseGateway(options) {
  const { baseDir, tokenSecret } = options;
  const dataDir = join(baseDir, "data");
  const dbPath = join(dataDir, "database.json");

  async function ensureDatabase() {
    await mkdir(dataDir, { recursive: true });

    try {
      await access(dbPath);
      const db = await readDatabase();
      const migrated = migrateDatabase(db, tokenSecret);
      await writeDatabase(migrated);
    } catch {
      await writeDatabase(createDefaultDatabase(tokenSecret));
    }
  }

  async function readDatabase() {
    const raw = await readFile(dbPath, "utf8");
    return JSON.parse(raw);
  }

  async function writeDatabase(data) {
    await writeFile(dbPath, JSON.stringify(data, null, 2), "utf8");
  }

  return {
    dataDir,
    dbPath,
    ensureDatabase,
    readDatabase,
    writeDatabase,
  };
}

function migrateDatabase(db, tokenSecret) {
  const next = structuredClone(db);

  next.app = "agenda-pro";
  next.version = 4;
  next.companies = Array.isArray(next.companies) ? next.companies : [];
  next.users = Array.isArray(next.users) ? next.users : [];
  next.services = Array.isArray(next.services) ? next.services : [];
  next.professionals = Array.isArray(next.professionals) ? next.professionals : [];
  next.clients = Array.isArray(next.clients) ? next.clients : [];
  next.appointments = Array.isArray(next.appointments) ? next.appointments : [];
  next.notifications = Array.isArray(next.notifications) ? next.notifications : [];

  if (!next.companies.length && !next.users.length) {
    return createDefaultDatabase(tokenSecret);
  }

  for (const company of next.companies) {
    company.reminderChannels = normalizeChannels(company.reminderChannels);
    company.updatedAt = company.updatedAt || new Date().toISOString();
    company.createdAt = company.createdAt || company.updatedAt;
  }

  return next;
}

function createDefaultDatabase(tokenSecret) {
  const now = new Date().toISOString();
  const companyId = "company-default";
  const service1 = "service-corte-feminino";
  const service2 = "service-barba";
  const service3 = "service-manicure";
  const professional1 = "professional-marina";
  const professional2 = "professional-rodrigo";
  const professional3 = "professional-jessica";

  return {
    app: "agenda-pro",
    version: 4,
    companies: [
      {
        id: companyId,
        name: "Studio Aura Beauty",
        slug: "studio-aura-beauty",
        address: "Av. Central, 250 - Centro",
        phone: "(11) 99999-0000",
        whatsappNumber: "(11) 99999-0000",
        email: "contato@studioaura.local",
        logoUrl: "",
        instagram: "@studioaura.beauty",
        facebook: "facebook.com/studioaura.beauty",
        holidays: ["2026-12-25", "2026-01-01"],
        openOnSaturday: true,
        openOnSunday: false,
        reminderChannels: ["whatsapp"],
        googleCalendar: {
          connected: false,
          calendarId: "",
          accountEmail: "",
          lastSyncAt: null
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
    users: [
      {
        id: "user-owner",
        companyId,
        name: "Leona",
        email: "owner@agendapro.local",
        passwordHash: hashPassword("agenda123", tokenSecret),
        role: "owner",
        createdAt: now,
      },
    ],
    services: [
      {
        id: service1,
        companyId,
        name: "Corte feminino",
        category: "Cabelo",
        duration: 60,
        price: 120,
        description: "Corte com finalizacao e alinhamento do visual.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: service2,
        companyId,
        name: "Barba completa",
        category: "Barbearia",
        duration: 35,
        price: 55,
        description: "Modelagem de barba com acabamento detalhado.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: service3,
        companyId,
        name: "Manicure",
        category: "Unhas",
        duration: 45,
        price: 40,
        description: "Cuidado completo das unhas com esmaltação simples.",
        createdAt: now,
        updatedAt: now,
      },
    ],
    professionals: [
      {
        id: professional1,
        companyId,
        name: "Marina Alves",
        specialty: "Corte e coloracao",
        photoUrl: "",
        bio: "Especialista em corte feminino e acabamento natural.",
        serviceIds: [service1],
        workingHours: weekdaySchedule("09:00", "18:00"),
        breaks: weekdayBreak("12:00", "13:00"),
        daysOff: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: professional2,
        companyId,
        name: "Rodrigo Nunes",
        specialty: "Barbearia",
        photoUrl: "",
        bio: "Atendimento focado em barba, corte masculino e acabamento classico.",
        serviceIds: [service2],
        workingHours: weekdaySchedule("10:00", "19:00"),
        breaks: weekdayBreak("13:00", "14:00"),
        daysOff: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: professional3,
        companyId,
        name: "Jessica Prado",
        specialty: "Unhas",
        photoUrl: "",
        bio: "Responsavel por manicure e rotina de cuidados rapidos.",
        serviceIds: [service3],
        workingHours: {
          ...weekdaySchedule("09:00", "18:00"),
          "6": [{ start: "08:00", end: "13:00" }],
        },
        breaks: weekdayBreak("12:30", "13:30"),
        daysOff: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
    clients: [],
    appointments: [],
    notifications: [],
  };
}

function weekdaySchedule(start, end) {
  return {
    "1": [{ start, end }],
    "2": [{ start, end }],
    "3": [{ start, end }],
    "4": [{ start, end }],
    "5": [{ start, end }],
  };
}

function weekdayBreak(start, end) {
  return {
    "1": [{ start, end }],
    "2": [{ start, end }],
    "3": [{ start, end }],
    "4": [{ start, end }],
    "5": [{ start, end }],
  };
}

function normalizeChannels(value) {
  const items = Array.isArray(value) ? value : [];
  const channels = items
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => item === "email" || item === "sms" || item === "whatsapp");
  return channels.length ? [...new Set(channels)] : ["whatsapp"];
}

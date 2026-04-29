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

  return {
    app: "agenda-pro",
    version: 4,
    companies: [
      {
        id: companyId,
        name: "Meu Salao",
        slug: "meu-salao",
        address: "",
        phone: "(11) 99999-0000",
        whatsappNumber: "(11) 99999-0000",
        email: "",
        logoUrl: "",
        instagram: "",
        facebook: "",
        holidays: [],
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
    services: [],
    professionals: [],
    clients: [],
    appointments: [],
    notifications: [],
  };
}

function normalizeChannels(value) {
  const items = Array.isArray(value) ? value : [];
  const channels = items
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => item === "email" || item === "sms" || item === "whatsapp");
  return channels.length ? [...new Set(channels)] : ["whatsapp"];
}

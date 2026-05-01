import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/auth.js";

const prisma = new PrismaClient();
const TOKEN_SECRET = process.env.JWT_SECRET || "agenda-pro-local-secret";

const salonSeed = {
  id: "salon-default",
  name: "Estabelecimento em configuracao",
  slug: "estabelecimento-em-configuracao",
  phone: "",
  whatsappNumber: "",
  email: "",
  addressLine1: "",
  city: "",
  state: "",
  bookingLeadMinutes: 60,
  slotIntervalMinutes: 15,
  isActive: true,
};

async function main() {
  await prisma.notificationLog.deleteMany();
  await prisma.googleCalendarConnection.deleteMany();
  await prisma.blockedTime.deleteMany();
  await prisma.scheduleBreak.deleteMany();
  await prisma.professionalSchedule.deleteMany();
  await prisma.professionalService.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.user.deleteMany();
  await prisma.salon.deleteMany();

  await prisma.salon.create({
    data: {
      ...salonSeed,
      users: {
        create: {
          id: "user-owner",
          name: "Administrador",
          email: "admin@agendapro.local",
          passwordHash: hashPassword("agenda123", TOKEN_SECRET),
          role: "OWNER",
          isActive: true,
        },
      },
    },
  });

  console.log("Prisma seed concluido com sucesso.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

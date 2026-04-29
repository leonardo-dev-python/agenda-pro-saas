import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/auth.js";

const prisma = new PrismaClient();
const TOKEN_SECRET = process.env.JWT_SECRET || "agenda-pro-local-secret";

const salonSeed = {
  id: "salon-default",
  name: "Studio Aura Beauty",
  slug: "studio-aura-beauty",
  phone: "(11) 99999-0000",
  whatsappNumber: "(11) 99999-0000",
  email: "contato@studioaura.local",
  addressLine1: "Av. Central, 250 - Centro",
  city: "Sao Paulo",
  state: "SP",
  bookingLeadMinutes: 60,
  slotIntervalMinutes: 15,
  isActive: true,
};

const services = [
  {
    id: "service-corte-feminino",
    name: "Corte feminino",
    slug: "corte-feminino",
    category: "Cabelo",
    description: "Corte com finalizacao e alinhamento do visual.",
    durationMin: 60,
    priceCents: 12000,
  },
  {
    id: "service-barba",
    name: "Barba completa",
    slug: "barba-completa",
    category: "Barbearia",
    description: "Modelagem de barba com acabamento detalhado.",
    durationMin: 35,
    priceCents: 5500,
  },
  {
    id: "service-manicure",
    name: "Manicure",
    slug: "manicure",
    category: "Unhas",
    description: "Cuidado completo das unhas com esmaltação simples.",
    durationMin: 45,
    priceCents: 4000,
  },
];

const professionals = [
  {
    id: "professional-marina",
    name: "Marina Alves",
    slug: "marina-alves",
    specialty: "Corte e coloracao",
    bio: "Especialista em corte feminino e acabamento natural.",
    serviceIds: ["service-corte-feminino"],
    schedules: buildWeekdaySchedules("09:00", "18:00", "12:00", "13:00"),
  },
  {
    id: "professional-rodrigo",
    name: "Rodrigo Nunes",
    slug: "rodrigo-nunes",
    specialty: "Barbearia",
    bio: "Atendimento focado em barba, corte masculino e acabamento classico.",
    serviceIds: ["service-barba"],
    schedules: buildWeekdaySchedules("10:00", "19:00", "13:00", "14:00"),
  },
  {
    id: "professional-jessica",
    name: "Jessica Prado",
    slug: "jessica-prado",
    specialty: "Unhas",
    bio: "Responsavel por manicure e rotina de cuidados rapidos.",
    serviceIds: ["service-manicure"],
    schedules: [
      ...buildWeekdaySchedules("09:00", "18:00", "12:30", "13:30"),
      {
        weekday: 6,
        startTime: "08:00",
        endTime: "13:00",
        breaks: [],
      },
    ],
  },
];

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
          name: "Leona",
          email: "owner@agendapro.local",
          passwordHash: hashPassword("agenda123", TOKEN_SECRET),
          role: "OWNER",
          isActive: true,
        },
      },
    },
  });

  await prisma.service.createMany({
    data: services.map((service) => ({
      ...service,
      salonId: salonSeed.id,
      isActive: true,
      onlineBooking: true,
    })),
  });

  for (const professional of professionals) {
    await prisma.professional.create({
      data: {
        id: professional.id,
        salonId: salonSeed.id,
        name: professional.name,
        slug: professional.slug,
        specialty: professional.specialty,
        bio: professional.bio,
        isActive: true,
        serviceLinks: {
          create: professional.serviceIds.map((serviceId) => ({
            serviceId,
          })),
        },
        schedules: {
          create: professional.schedules.map((schedule) => ({
            weekday: schedule.weekday,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            breaks: {
              create: schedule.breaks.map((item) => ({
                startTime: item.startTime,
                endTime: item.endTime,
              })),
            },
          })),
        },
      },
    });
  }

  console.log("Prisma seed concluido com sucesso.");
}

function buildWeekdaySchedules(startTime, endTime, breakStart, breakEnd) {
  return [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startTime,
    endTime,
    breaks: breakStart && breakEnd ? [{ startTime: breakStart, endTime: breakEnd }] : [],
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

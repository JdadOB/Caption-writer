import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "changeme";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  const managerPassword = await bcrypt.hash("manager123", 10);
  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: {
      email: "manager@example.com",
      name: "Sample Manager",
      passwordHash: managerPassword,
      role: "MANAGER",
    },
  });

  const creatorPassword = await bcrypt.hash("creator123", 10);
  const creator = await prisma.user.upsert({
    where: { email: "creator@example.com" },
    update: {},
    create: {
      email: "creator@example.com",
      name: "Sample Creator",
      passwordHash: creatorPassword,
      role: "CREATOR",
    },
  });

  await prisma.assignment.upsert({
    where: { managerId_creatorId: { managerId: manager.id, creatorId: creator.id } },
    update: {},
    create: { managerId: manager.id, creatorId: creator.id },
  });

  console.log("Seeded:");
  console.log("  Admin:   ", admin.email, "/", adminPassword);
  console.log("  Manager: ", manager.email, "/ manager123");
  console.log("  Creator: ", creator.email, "/ creator123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "./prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.siteSetting.findMany();
  console.log("SITE SETTINGS:", JSON.stringify(settings, null, 2));
}

main().finally(() => prisma.$disconnect());

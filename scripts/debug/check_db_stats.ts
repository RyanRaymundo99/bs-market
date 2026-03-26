import { PrismaClient } from "../../prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  console.log("TOTAL USERS:", count);
}

main().finally(() => prisma.$disconnect());

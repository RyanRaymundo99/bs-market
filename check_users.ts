import { PrismaClient } from "./prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  console.log("LATEST USERS:");
  users.forEach(u => console.log(u.email, u.name));
}

main().finally(() => prisma.$disconnect());

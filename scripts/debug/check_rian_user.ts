import { PrismaClient } from "../../prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "rian981265@gmail.com" },
    include: { orders: { orderBy: { createdAt: "desc" }, take: 5 } }
  });
  console.log("USER:", user?.email, user?.name);
  console.log("ORDERS:", JSON.stringify(user?.orders, null, 2));
}

main().finally(() => prisma.$disconnect());


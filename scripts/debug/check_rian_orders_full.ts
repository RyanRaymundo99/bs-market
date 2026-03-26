import { PrismaClient } from "./prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "rian981265@gmail.com" },
    include: { orders: { orderBy: { createdAt: "desc" } } }
  });
  console.log("USER:", user?.email, user?.name);
  console.log("TOTAL ORDERS:", user?.orders.length);
  user?.orders.forEach(o => {
    console.log(`- Created: ${o.createdAt}, Status: ${o.status}, Amount: ${o.amount}`);
  });
}

main().finally(() => prisma.$disconnect());

import { PrismaClient } from "./prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { contains: "layrton" } },
  });
  if (user) {
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });
    console.log(`USER: ${user.email} (${user.name})`);
    console.log(`TOTAL ORDERS: ${orders.length}`);
    orders.forEach(o => {
      console.log(`- Created: ${o.createdAt}, Status: ${o.status}, Amount: ${o.amount}, External: ${o.externalOrderId}`);
    });
  }
}

main().finally(() => prisma.$disconnect());

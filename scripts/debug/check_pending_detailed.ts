import { PrismaClient } from "../../prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  const pendingOrders = await prisma.order.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  console.log("PENDING ORDERS:");
  pendingOrders.forEach(o => {
    console.log(`ID: ${o.id}, Amount: ${o.amount}, Created: ${o.createdAt}, External: ${o.externalOrderId}`);
  });
}

main().finally(() => prisma.$disconnect());


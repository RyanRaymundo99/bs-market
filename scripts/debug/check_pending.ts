import { PrismaClient } from "../../prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  const pendingOrders = await prisma.order.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  console.log("PENDING ORDERS COUNT:", pendingOrders.length);
  console.log(JSON.stringify(pendingOrders.map(o => ({
    id: o.id,
    amount: o.amount,
    createdAt: o.createdAt,
    externalOrderId: o.externalOrderId
  })), null, 2));

  const pendingDeposits = await prisma.deposit.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  console.log("\nPENDING DEPOSITS COUNT:", pendingDeposits.length);
}

main().finally(() => prisma.$disconnect());


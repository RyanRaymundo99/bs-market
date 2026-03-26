import { PrismaClient } from "./prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: true },
    });
    console.log("LATEST ORDERS:");
    console.log(JSON.stringify(orders.map(o => ({
      id: o.id,
      user: o.user.email,
      amount: o.amount,
      status: o.status,
      externalOrderId: o.externalOrderId,
      createdAt: o.createdAt
    })), null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

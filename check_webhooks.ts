import { PrismaClient } from "./prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const events = await prisma.webhookEvent.findMany({
      where: { source: "mercadopago" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    console.log("LAST 10 MERCADOPAGO WEBHOOKS:");
    console.log(JSON.stringify(events, null, 2));

    const pendingOrders = await prisma.order.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    console.log("\nLATEST PENDING ORDERS:");
    console.log(JSON.stringify(pendingOrders, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

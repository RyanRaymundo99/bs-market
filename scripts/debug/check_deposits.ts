import { PrismaClient } from "./prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const deposits = await prisma.deposit.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: true },
    });
    console.log("LATEST DEPOSITS:");
    console.log(JSON.stringify(deposits.map(d => ({
      id: d.id,
      user: d.user.email,
      amount: d.amount,
      status: d.status,
      paymentId: d.paymentId,
      externalId: d.externalId,
      createdAt: d.createdAt
    })), null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

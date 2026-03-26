import { PrismaClient } from "./prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: { contains: "layrton" } },
    });
    console.log("USER:", JSON.stringify(user, null, 2));

    if (user) {
      const deposits = await prisma.deposit.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5
      });
      console.log("\nDEPOSITS FOR USER:", JSON.stringify(deposits, null, 2));

      const orders = await prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5
      });
      console.log("\nORDERS FOR USER:", JSON.stringify(orders, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

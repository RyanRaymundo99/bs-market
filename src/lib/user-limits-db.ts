import prisma from "@/lib/prisma";

export async function ensureUserLimitsColumns(): Promise<void> {
  try {
    // Check if the dailyDepositLimit column exists
    const hasColumn = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user'
        AND column_name = 'dailyDepositLimit'
      ) as exists;
    `;

    if (!hasColumn[0]?.exists) {
      console.log("Adding dailyDepositLimit column to user table...");
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "user" 
        ADD COLUMN IF NOT EXISTS "dailyDepositLimit" decimal(20, 2) NOT NULL DEFAULT 5000.00;
      `);
      console.log("dailyDepositLimit column added successfully.");
    }
  } catch (error) {
    console.error("Error ensuring user limits columns:", error);
  }
}

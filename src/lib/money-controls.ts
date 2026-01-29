import prisma from "@/lib/prisma";

export type MoneyControls = {
  depositsDisabled: boolean;
  withdrawalsDisabled: boolean;
  depositsDisabledMessage: string;
  withdrawalsDisabledMessage: string;
  updatedAt: Date;
  updatedBy: string | null;
};

const DEFAULT_DEPOSITS_MESSAGE =
  "Deposits are temporarily disabled. The site is being updated. Soon you will be able to continue your business.";
const DEFAULT_WITHDRAWALS_MESSAGE =
  "Withdrawals are temporarily disabled. The site is being updated. Soon you will be able to continue your business.";

async function ensureMoneyControlsTable(): Promise<void> {
  // This project checks in a generated Prisma client and doesn't keep migrations in-repo.
  // To keep this feature deployable without regenerating Prisma, we store settings in a
  // dedicated Postgres table using raw SQL, created on-demand.

  // First, check if the table exists and what columns it has
  const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'site_settings'
    ) as exists;
  `;

  if (!tableExists[0]?.exists) {
    // Create new table with separate flags
    await prisma.$executeRaw`
      CREATE TABLE "site_settings" (
        "id" integer PRIMARY KEY,
        "depositsDisabled" boolean NOT NULL DEFAULT false,
        "withdrawalsDisabled" boolean NOT NULL DEFAULT false,
        "depositsDisabledMessage" text NOT NULL DEFAULT ${DEFAULT_DEPOSITS_MESSAGE},
        "withdrawalsDisabledMessage" text NOT NULL DEFAULT ${DEFAULT_WITHDRAWALS_MESSAGE},
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "updatedBy" text
      );
    `;

    await prisma.$executeRaw`
      INSERT INTO "site_settings" ("id")
      VALUES (1)
      ON CONFLICT ("id") DO NOTHING;
    `;
  } else {
    // Table exists - migrate from old schema if needed
    // Check if old columns exist
    const hasOldColumns = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'site_settings'
        AND column_name = 'moneyDisabled'
      ) as exists;
    `;

    if (hasOldColumns[0]?.exists) {
      // Migrate from old schema
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "site_settings"
        ADD COLUMN IF NOT EXISTS "depositsDisabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "withdrawalsDisabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "depositsDisabledMessage" text NOT NULL DEFAULT '${DEFAULT_DEPOSITS_MESSAGE.replace(/'/g, "''")}',
        ADD COLUMN IF NOT EXISTS "withdrawalsDisabledMessage" text NOT NULL DEFAULT '${DEFAULT_WITHDRAWALS_MESSAGE.replace(/'/g, "''")}';
      `);

      // Migrate data: if moneyDisabled was true, set both to true
      await prisma.$executeRaw`
        UPDATE "site_settings"
        SET 
          "depositsDisabled" = COALESCE("moneyDisabled", false),
          "withdrawalsDisabled" = COALESCE("moneyDisabled", false),
          "depositsDisabledMessage" = COALESCE("moneyDisabledMessage", ${DEFAULT_DEPOSITS_MESSAGE}),
          "withdrawalsDisabledMessage" = COALESCE("moneyDisabledMessage", ${DEFAULT_WITHDRAWALS_MESSAGE})
        WHERE "id" = 1;
      `;
    } else {
      // Ensure new columns exist (in case migration was partial)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "site_settings"
        ADD COLUMN IF NOT EXISTS "depositsDisabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "withdrawalsDisabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "depositsDisabledMessage" text NOT NULL DEFAULT '${DEFAULT_DEPOSITS_MESSAGE.replace(/'/g, "''")}',
        ADD COLUMN IF NOT EXISTS "withdrawalsDisabledMessage" text NOT NULL DEFAULT '${DEFAULT_WITHDRAWALS_MESSAGE.replace(/'/g, "''")}';
      `);

      await prisma.$executeRaw`
        INSERT INTO "site_settings" ("id")
        VALUES (1)
        ON CONFLICT ("id") DO NOTHING;
      `;
    }
  }
}

export async function getMoneyControls(): Promise<MoneyControls> {
  await ensureMoneyControlsTable();

  const rows = await prisma.$queryRaw<
    Array<{
      depositsDisabled: boolean;
      withdrawalsDisabled: boolean;
      depositsDisabledMessage: string;
      withdrawalsDisabledMessage: string;
      updatedAt: Date;
      updatedBy: string | null;
    }>
  >`
    SELECT "depositsDisabled", "withdrawalsDisabled", "depositsDisabledMessage", "withdrawalsDisabledMessage", "updatedAt", "updatedBy"
    FROM "site_settings"
    WHERE "id" = 1
    LIMIT 1;
  `;

  if (!rows[0]) {
    // Extremely defensive: should not happen because we insert id=1 above.
    return {
      depositsDisabled: false,
      withdrawalsDisabled: false,
      depositsDisabledMessage: DEFAULT_DEPOSITS_MESSAGE,
      withdrawalsDisabledMessage: DEFAULT_WITHDRAWALS_MESSAGE,
      updatedAt: new Date(),
      updatedBy: null,
    };
  }

  return rows[0];
}

export async function setMoneyControls(params: {
  depositsDisabled: boolean;
  withdrawalsDisabled: boolean;
  depositsDisabledMessage?: string;
  withdrawalsDisabledMessage?: string;
  updatedBy?: string | null;
  notifyUsers?: boolean;
}): Promise<{ moneyControls: MoneyControls; notifiedUsers: number }> {
  const current = await getMoneyControls();

  await prisma.$executeRaw`
    UPDATE "site_settings"
    SET
      "depositsDisabled" = ${params.depositsDisabled},
      "withdrawalsDisabled" = ${params.withdrawalsDisabled},
      "depositsDisabledMessage" = ${params.depositsDisabledMessage || DEFAULT_DEPOSITS_MESSAGE},
      "withdrawalsDisabledMessage" = ${params.withdrawalsDisabledMessage || DEFAULT_WITHDRAWALS_MESSAGE},
      "updatedAt" = now(),
      "updatedBy" = ${params.updatedBy ?? null}
    WHERE "id" = 1;
  `;

  const next = await getMoneyControls();

  let notifiedUsers = 0;
  const shouldNotify =
    Boolean(params.notifyUsers) &&
    (current.depositsDisabled !== next.depositsDisabled ||
      current.withdrawalsDisabled !== next.withdrawalsDisabled ||
      current.depositsDisabledMessage !== next.depositsDisabledMessage ||
      current.withdrawalsDisabledMessage !== next.withdrawalsDisabledMessage);

  if (shouldNotify) {
    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length > 0) {
      // Build notification messages based on what changed
      const changes: string[] = [];
      if (next.depositsDisabled) {
        changes.push("deposits");
      }
      if (next.withdrawalsDisabled) {
        changes.push("withdrawals");
      }

      const title =
        changes.length > 0
          ? "Platform update in progress"
          : "Platform is back online";

      let message = "";
      if (changes.length === 2) {
        message =
          next.depositsDisabledMessage ||
          next.withdrawalsDisabledMessage ||
          "Deposits and withdrawals are temporarily disabled.";
      } else if (next.depositsDisabled) {
        message = next.depositsDisabledMessage;
      } else if (next.withdrawalsDisabled) {
        message = next.withdrawalsDisabledMessage;
      } else {
        message = "Deposits and withdrawals are available again.";
      }

      const data = users.map((u) => ({
        userId: u.id,
        type: "money_controls",
        title,
        message,
        read: false,
        metadata: {
          depositsDisabled: next.depositsDisabled,
          withdrawalsDisabled: next.withdrawalsDisabled,
          updatedAt: next.updatedAt.toISOString(),
          updatedBy: next.updatedBy,
        },
      }));

      // Chunk to avoid oversized insert payloads.
      const chunkSize = 1000;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const result = await prisma.notification.createMany({ data: chunk });
        notifiedUsers += result.count;
      }
    }
  }

  return { moneyControls: next, notifiedUsers };
}

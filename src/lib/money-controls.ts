import prisma from "@/lib/prisma";

export type MoneyControls = {
  moneyDisabled: boolean;
  moneyDisabledMessage: string;
  updatedAt: Date;
  updatedBy: string | null;
};

const DEFAULT_MESSAGE =
  "The site is being updated. Deposits and withdrawals are temporarily disabled. Soon you will be able to continue your business.";

async function ensureMoneyControlsTable(): Promise<void> {
  // This project checks in a generated Prisma client and doesn't keep migrations in-repo.
  // To keep this feature deployable without regenerating Prisma, we store settings in a
  // dedicated Postgres table using raw SQL, created on-demand.
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "site_settings" (
      "id" integer PRIMARY KEY,
      "moneyDisabled" boolean NOT NULL DEFAULT false,
      "moneyDisabledMessage" text NOT NULL DEFAULT 'The site is being updated. Deposits and withdrawals are temporarily disabled. Soon you will be able to continue your business.',
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "updatedBy" text
    );
  `;

  await prisma.$executeRaw`
    INSERT INTO "site_settings" ("id")
    VALUES (1)
    ON CONFLICT ("id") DO NOTHING;
  `;
}

export async function getMoneyControls(): Promise<MoneyControls> {
  await ensureMoneyControlsTable();

  const rows = await prisma.$queryRaw<
    Array<{
      moneyDisabled: boolean;
      moneyDisabledMessage: string;
      updatedAt: Date;
      updatedBy: string | null;
    }>
  >`
    SELECT "moneyDisabled", "moneyDisabledMessage", "updatedAt", "updatedBy"
    FROM "site_settings"
    WHERE "id" = 1
    LIMIT 1;
  `;

  if (!rows[0]) {
    // Extremely defensive: should not happen because we insert id=1 above.
    return {
      moneyDisabled: false,
      moneyDisabledMessage: DEFAULT_MESSAGE,
      updatedAt: new Date(),
      updatedBy: null,
    };
  }

  return rows[0];
}

export async function setMoneyControls(params: {
  moneyDisabled: boolean;
  moneyDisabledMessage: string;
  updatedBy?: string | null;
  notifyUsers?: boolean;
}): Promise<{ moneyControls: MoneyControls; notifiedUsers: number }> {
  const current = await getMoneyControls();

  await prisma.$executeRaw`
    UPDATE "site_settings"
    SET
      "moneyDisabled" = ${params.moneyDisabled},
      "moneyDisabledMessage" = ${params.moneyDisabledMessage || DEFAULT_MESSAGE},
      "updatedAt" = now(),
      "updatedBy" = ${params.updatedBy ?? null}
    WHERE "id" = 1;
  `;

  const next = await getMoneyControls();

  let notifiedUsers = 0;
  const shouldNotify =
    Boolean(params.notifyUsers) &&
    (current.moneyDisabled !== next.moneyDisabled ||
      current.moneyDisabledMessage !== next.moneyDisabledMessage);

  if (shouldNotify) {
    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length > 0) {
      const title = next.moneyDisabled
        ? "Platform update in progress"
        : "Platform is back online";

      const message = next.moneyDisabled
        ? next.moneyDisabledMessage
        : "Deposits and withdrawals are available again.";

      const data = users.map((u) => ({
        userId: u.id,
        type: "money_controls",
        title,
        message,
        read: false,
        metadata: {
          moneyDisabled: next.moneyDisabled,
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


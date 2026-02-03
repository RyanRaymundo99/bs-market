"use server";

import prisma from "@/lib/prisma";

const BACKUP_VERSION = 1;

/** Convert Prisma rows to JSON-safe values (Decimal -> number, Date -> ISO string) */
function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) {
      out[k] = v;
    } else if (
      typeof v === "object" &&
      v !== null &&
      typeof (v as { toNumber?: () => number }).toNumber === "function"
    ) {
      out[k] = (v as { toNumber: () => number }).toNumber();
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (Array.isArray(v)) {
      out[k] = v.map((x) =>
        typeof x === "object" && x !== null && !(x instanceof Date)
          ? serializeRow(x as Record<string, unknown>)
          : x instanceof Date
          ? x.toISOString()
          : x
      );
    } else if (typeof v === "object") {
      out[k] = serializeRow(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Convert JSON backup values back for Prisma (ISO string -> Date, number stays for Decimal) */
function deserializeRow<T extends Record<string, unknown>>(
  row: T,
  dateKeys: string[]
): T {
  const out = { ...row } as T;
  for (const k of dateKeys) {
    if (k in out && typeof (out as Record<string, unknown>)[k] === "string") {
      (out as Record<string, unknown>)[k] = new Date(
        (out as Record<string, unknown>)[k] as string
      );
    }
  }
  return out;
}

const USER_DATE_KEYS = [
  "createdAt",
  "updatedAt",
  "kycSubmittedAt",
  "kycReviewedAt",
];
const ACCOUNT_DATE_KEYS = [
  "accessTokenExpiresAt",
  "refreshTokenExpiresAt",
  "createdAt",
  "updatedAt",
];
const BALANCE_DATE_KEYS = ["createdAt", "updatedAt"];
const DEPOSIT_DATE_KEYS = ["confirmedAt", "createdAt", "updatedAt"];
const WITHDRAWAL_DATE_KEYS = ["processedAt", "createdAt", "updatedAt"];
const ORDER_DATE_KEYS = ["executedAt", "createdAt", "updatedAt"];
const P2P_OFFER_DATE_KEYS = ["expiresAt", "createdAt", "updatedAt"];
const P2P_TRADE_DATE_KEYS = ["expiresAt", "createdAt", "updatedAt"];
const TRANSACTION_DATE_KEYS = ["createdAt"];
const NOTIFICATION_DATE_KEYS = ["createdAt", "readAt"];
const USER_NOTE_DATE_KEYS = ["createdAt"];
const SUPPORT_ISSUE_DATE_KEYS = ["createdAt", "updatedAt"];
const COMMUNICATION_LOG_DATE_KEYS = ["sentAt"];
const ADMIN_ALERT_DATE_KEYS = ["updatedAt"];

export type BackupPayload = {
  version: number;
  exportedAt: string;
  user: Record<string, unknown>[];
  account: Record<string, unknown>[];
  balance: Record<string, unknown>[];
  transaction: Record<string, unknown>[];
  deposit: Record<string, unknown>[];
  withdrawal: Record<string, unknown>[];
  order: Record<string, unknown>[];
  notification: Record<string, unknown>[];
  userNote: Record<string, unknown>[];
  communicationLog: Record<string, unknown>[];
  supportIssue: Record<string, unknown>[];
  p2pOffer: Record<string, unknown>[];
  p2PTrade: Record<string, unknown>[];
  adminAlertSettings: Record<string, unknown>[];
};

export async function exportBackup(): Promise<BackupPayload> {
  const [
    user,
    account,
    balance,
    transaction,
    deposit,
    withdrawal,
    order,
    notification,
    userNote,
    communicationLog,
    supportIssue,
    p2pOffer,
    p2PTrade,
    adminAlertSettings,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.account.findMany(),
    prisma.balance.findMany(),
    prisma.transaction.findMany(),
    prisma.deposit.findMany(),
    prisma.withdrawal.findMany(),
    prisma.order.findMany(),
    prisma.notification.findMany(),
    prisma.userNote.findMany(),
    prisma.communicationLog.findMany(),
    prisma.supportIssue.findMany(),
    prisma.p2POffer.findMany(),
    prisma.p2PTrade.findMany(),
    prisma.adminAlertSettings.findMany(),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    user: user.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    account: account.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    balance: balance.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    transaction: transaction.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    deposit: deposit.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    withdrawal: withdrawal.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    order: order.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    notification: notification.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    userNote: userNote.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    communicationLog: communicationLog.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    supportIssue: supportIssue.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    p2pOffer: p2pOffer.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    p2PTrade: p2PTrade.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
    adminAlertSettings: adminAlertSettings.map((r) =>
      serializeRow(r as unknown as Record<string, unknown>)
    ),
  };
}

export async function restoreBackup(
  data: BackupPayload,
  options: { dryRun?: boolean } = {}
): Promise<{ ok: boolean; message: string; counts?: Record<string, number> }> {
  if (data.version !== BACKUP_VERSION) {
    return {
      ok: false,
      message: `Unsupported backup version: ${data.version}`,
    };
  }

  const counts: Record<string, number> = {};
  const { dryRun = false } = options;

  if (dryRun) {
    counts.user = data.user?.length ?? 0;
    counts.account = data.account?.length ?? 0;
    counts.balance = data.balance?.length ?? 0;
    counts.transaction = data.transaction?.length ?? 0;
    counts.deposit = data.deposit?.length ?? 0;
    counts.withdrawal = data.withdrawal?.length ?? 0;
    counts.order = data.order?.length ?? 0;
    counts.notification = data.notification?.length ?? 0;
    counts.userNote = data.userNote?.length ?? 0;
    counts.communicationLog = data.communicationLog?.length ?? 0;
    counts.supportIssue = data.supportIssue?.length ?? 0;
    counts.p2pOffer = data.p2pOffer?.length ?? 0;
    counts.p2PTrade = data.p2PTrade?.length ?? 0;
    counts.adminAlertSettings = data.adminAlertSettings?.length ?? 0;
    return { ok: true, message: "Dry run – no changes made", counts };
  }

  try {
    for (const row of data.user ?? []) {
      const u = deserializeRow(
        row as Record<string, unknown>,
        USER_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.user.upsert({
        where: { id: u.id as string },
        create: u as Parameters<typeof prisma.user.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(u).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.user.update>[0]["data"],
      });
    }
    counts.user = data.user?.length ?? 0;

    for (const row of data.account ?? []) {
      const a = deserializeRow(
        row as Record<string, unknown>,
        ACCOUNT_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.account.upsert({
        where: { id: a.id as string },
        create: a as Parameters<typeof prisma.account.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(a).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.account.update>[0]["data"],
      });
    }
    counts.account = data.account?.length ?? 0;

    for (const row of data.balance ?? []) {
      const b = deserializeRow(
        row as Record<string, unknown>,
        BALANCE_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.balance.upsert({
        where: { id: b.id as string },
        create: b as Parameters<typeof prisma.balance.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(b).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.balance.update>[0]["data"],
      });
    }
    counts.balance = data.balance?.length ?? 0;

    for (const row of data.transaction ?? []) {
      const t = deserializeRow(
        row as Record<string, unknown>,
        TRANSACTION_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.transaction.upsert({
        where: { id: t.id as string },
        create: t as Parameters<typeof prisma.transaction.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(t).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.transaction.update>[0]["data"],
      });
    }
    counts.transaction = data.transaction?.length ?? 0;

    for (const row of data.deposit ?? []) {
      const d = deserializeRow(
        row as Record<string, unknown>,
        DEPOSIT_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.deposit.upsert({
        where: { id: d.id as string },
        create: d as Parameters<typeof prisma.deposit.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(d).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.deposit.update>[0]["data"],
      });
    }
    counts.deposit = data.deposit?.length ?? 0;

    for (const row of data.withdrawal ?? []) {
      const w = deserializeRow(
        row as Record<string, unknown>,
        WITHDRAWAL_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.withdrawal.upsert({
        where: { id: w.id as string },
        create: w as Parameters<typeof prisma.withdrawal.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(w).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.withdrawal.update>[0]["data"],
      });
    }
    counts.withdrawal = data.withdrawal?.length ?? 0;

    for (const row of data.order ?? []) {
      const o = deserializeRow(
        row as Record<string, unknown>,
        ORDER_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.order.upsert({
        where: { id: o.id as string },
        create: o as Parameters<typeof prisma.order.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(o).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.order.update>[0]["data"],
      });
    }
    counts.order = data.order?.length ?? 0;

    for (const row of data.notification ?? []) {
      const n = deserializeRow(
        row as Record<string, unknown>,
        NOTIFICATION_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.notification.upsert({
        where: { id: n.id as string },
        create: n as Parameters<typeof prisma.notification.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(n).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.notification.update>[0]["data"],
      });
    }
    counts.notification = data.notification?.length ?? 0;

    for (const row of data.userNote ?? []) {
      const un = deserializeRow(
        row as Record<string, unknown>,
        USER_NOTE_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.userNote.upsert({
        where: { id: un.id as string },
        create: un as Parameters<typeof prisma.userNote.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(un).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.userNote.update>[0]["data"],
      });
    }
    counts.userNote = data.userNote?.length ?? 0;

    for (const row of data.communicationLog ?? []) {
      const c = deserializeRow(
        row as Record<string, unknown>,
        COMMUNICATION_LOG_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.communicationLog.upsert({
        where: { id: c.id as string },
        create: c as Parameters<
          typeof prisma.communicationLog.create
        >[0]["data"],
        update: Object.fromEntries(
          Object.entries(c).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.communicationLog.update>[0]["data"],
      });
    }
    counts.communicationLog = data.communicationLog?.length ?? 0;

    for (const row of data.supportIssue ?? []) {
      const s = deserializeRow(
        row as Record<string, unknown>,
        SUPPORT_ISSUE_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.supportIssue.upsert({
        where: { id: s.id as string },
        create: s as Parameters<typeof prisma.supportIssue.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(s).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.supportIssue.update>[0]["data"],
      });
    }
    counts.supportIssue = data.supportIssue?.length ?? 0;

    for (const row of data.p2pOffer ?? []) {
      const p = deserializeRow(
        row as Record<string, unknown>,
        P2P_OFFER_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.p2POffer.upsert({
        where: { id: p.id as string },
        create: p as Parameters<typeof prisma.p2POffer.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(p).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.p2POffer.update>[0]["data"],
      });
    }
    counts.p2pOffer = data.p2pOffer?.length ?? 0;

    for (const row of data.p2PTrade ?? []) {
      const pt = deserializeRow(
        row as Record<string, unknown>,
        P2P_TRADE_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.p2PTrade.upsert({
        where: { id: pt.id as string },
        create: pt as Parameters<typeof prisma.p2PTrade.create>[0]["data"],
        update: Object.fromEntries(
          Object.entries(pt).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.p2PTrade.update>[0]["data"],
      });
    }
    counts.p2PTrade = data.p2PTrade?.length ?? 0;

    for (const row of data.adminAlertSettings ?? []) {
      const a = deserializeRow(
        row as Record<string, unknown>,
        ADMIN_ALERT_DATE_KEYS
      ) as Record<string, unknown>;
      await prisma.adminAlertSettings.upsert({
        where: { id: a.id as string },
        create: a as Parameters<
          typeof prisma.adminAlertSettings.create
        >[0]["data"],
        update: Object.fromEntries(
          Object.entries(a).filter(([k]) => k !== "id")
        ) as Parameters<typeof prisma.adminAlertSettings.update>[0]["data"],
      });
    }
    counts.adminAlertSettings = data.adminAlertSettings?.length ?? 0;

    return { ok: true, message: "Restore completed", counts };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Restore failed: ${msg}` };
  }
}

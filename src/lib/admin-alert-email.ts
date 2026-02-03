import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const DEFAULT_EMAILS = ["rian981265@gmail.com"];

function parseEmails(row: { emails: unknown; email: string | null }): string[] {
  if (Array.isArray(row.emails) && row.emails.length > 0) {
    return row.emails.filter((e): e is string => typeof e === "string" && e.trim().length > 0);
  }
  if (row.email?.trim()) {
    return [row.email.trim()];
  }
  return DEFAULT_EMAILS;
}

export type AdminAlertSettings = {
  id: string;
  emails: string[];
  notifyDepositOver500: boolean;
  notifyWithdrawOver500: boolean;
  notifyNewAccount: boolean;
  notifyKycReady: boolean;
  updatedAt: Date;
};

/** Get admin email alert settings (singleton: creates default row if missing). */
export async function getAdminAlertSettings(): Promise<AdminAlertSettings> {
  let row = await prisma.adminAlertSettings.findFirst();
  if (!row) {
    row = await prisma.adminAlertSettings.create({
      data: {
        emails: DEFAULT_EMAILS,
        notifyDepositOver500: true,
        notifyWithdrawOver500: true,
        notifyNewAccount: true,
        notifyKycReady: true,
      },
    });
  }
  const emails = parseEmails(row);
  return {
    id: row.id,
    emails,
    notifyDepositOver500: row.notifyDepositOver500,
    notifyWithdrawOver500: row.notifyWithdrawOver500,
    notifyNewAccount: row.notifyNewAccount,
    notifyKycReady: row.notifyKycReady,
    updatedAt: row.updatedAt,
  };
}

/** Update admin email alert settings. Creates row if missing. */
export async function updateAdminAlertSettings(data: {
  emails?: string[];
  notifyDepositOver500?: boolean;
  notifyWithdrawOver500?: boolean;
  notifyNewAccount?: boolean;
  notifyKycReady?: boolean;
}): Promise<AdminAlertSettings> {
  const current = await getAdminAlertSettings();
  const updateData: {
    emails?: string[];
    notifyDepositOver500?: boolean;
    notifyWithdrawOver500?: boolean;
    notifyNewAccount?: boolean;
    notifyKycReady?: boolean;
  } = {};
  if (data.emails !== undefined) {
    const raw = Array.isArray(data.emails) ? data.emails : [];
    const list: string[] = [];
    for (const e of raw) {
      const s = typeof e === "string" ? e.trim() : "";
      if (s) list.push(s);
    }
    updateData.emails = list.length > 0 ? list : DEFAULT_EMAILS;
  }
  if (data.notifyDepositOver500 !== undefined) updateData.notifyDepositOver500 = data.notifyDepositOver500;
  if (data.notifyWithdrawOver500 !== undefined) updateData.notifyWithdrawOver500 = data.notifyWithdrawOver500;
  if (data.notifyNewAccount !== undefined) updateData.notifyNewAccount = data.notifyNewAccount;
  if (data.notifyKycReady !== undefined) updateData.notifyKycReady = data.notifyKycReady;

  try {
    const updated = await prisma.adminAlertSettings.update({
      where: { id: current.id },
      data: updateData,
    });
    return {
      id: updated.id,
      emails: parseEmails(updated),
      notifyDepositOver500: updated.notifyDepositOver500,
      notifyWithdrawOver500: updated.notifyWithdrawOver500,
      notifyNewAccount: updated.notifyNewAccount,
      notifyKycReady: updated.notifyKycReady,
      updatedAt: updated.updatedAt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code;
    const isRecordNotFound =
      code === "P2025" ||
      msg.includes("Record to update not found") ||
      msg.includes("P2025");
    if (isRecordNotFound) {
      const created = await prisma.adminAlertSettings.create({
        data: {
          emails: updateData.emails ?? current.emails,
          notifyDepositOver500: updateData.notifyDepositOver500 ?? current.notifyDepositOver500,
          notifyWithdrawOver500: updateData.notifyWithdrawOver500 ?? current.notifyWithdrawOver500,
          notifyNewAccount: updateData.notifyNewAccount ?? current.notifyNewAccount,
          notifyKycReady: updateData.notifyKycReady ?? current.notifyKycReady,
        },
      });
      return {
        id: created.id,
        emails: parseEmails(created),
        notifyDepositOver500: created.notifyDepositOver500,
        notifyWithdrawOver500: created.notifyWithdrawOver500,
        notifyNewAccount: created.notifyNewAccount,
        notifyKycReady: created.notifyKycReady,
        updatedAt: created.updatedAt,
      };
    }
    throw err;
  }
}

/** Send an alert email to the given address. Non-blocking; logs errors. */
export async function sendAdminAlertEmail(
  to: string,
  subject: string,
  text: string
): Promise<void> {
  if (!to?.trim()) return;
  try {
    await sendEmail({
      to: to.trim(),
      subject: `[BS Market Alert] ${subject}`,
      text,
      html: undefined,
    });
  } catch (err) {
    console.error("Failed to send admin alert email:", err);
  }
}

/** Send an alert to all configured admin emails. Non-blocking. */
export async function sendAdminAlertToAll(
  settings: AdminAlertSettings,
  subject: string,
  text: string
): Promise<void> {
  if (!settings.emails?.length) return;
  for (const email of settings.emails) {
    if (email?.trim()) {
      sendAdminAlertEmail(email.trim(), subject, text).catch(() => {});
    }
  }
}

"use server";

import type { Prisma } from "../../prisma/generated/client";
import prisma from "@/lib/prisma";

export type SentEmailType =
  | "receipt"
  | "notification"
  | "approval"
  | "kyc"
  | "other";

/**
 * Log a sent email to CommunicationLog (for admin list/delete).
 * Call after sendEmail succeeds when you have a userId.
 */
export async function logSentEmail({
  userId,
  type,
  subject,
  metadata,
}: {
  userId: string;
  type: SentEmailType;
  subject: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.communicationLog.create({
      data: {
        userId,
        type,
        subject,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (e) {
    console.warn("Failed to log sent email:", e);
  }
}

/**
 * Log a sent email by user email (looks up userId). Use when you only have email (e.g. receipt-email).
 */
export async function logSentEmailByEmail({
  userEmail,
  type,
  subject,
  metadata,
}: {
  userEmail: string;
  type: SentEmailType;
  subject: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail.trim().toLowerCase() },
      select: { id: true },
    });
    if (user) {
      await logSentEmail({ userId: user.id, type, subject, metadata });
    }
  } catch (e) {
    console.warn("Failed to log sent email by email:", e);
  }
}

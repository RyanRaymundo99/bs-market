import prisma from "@/lib/prisma";
import { Prisma } from "../../prisma/generated/client";

export type AuditResourceType =
  | "transaction"
  | "user"
  | "withdrawal"
  | "deposit"
  | "order"
  | "money_controls"
  | "balance"
  | "kyc"
  | "support_issue"
  | "refund";

export interface WriteAuditLogParams {
  adminId: string;
  adminEmail?: string;
  action: string;
  resourceType: AuditResourceType;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: params.adminId,
        adminEmail: params.adminEmail ?? null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        oldValue:
          params.oldValue != null
            ? (params.oldValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        newValue:
          params.newValue != null
            ? (params.newValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

export function getAuditLogIpAndAgent(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : headers.get("x-real-ip");
  return {
    ipAddress: ip ?? null,
    userAgent: headers.get("user-agent") ?? null,
  };
}

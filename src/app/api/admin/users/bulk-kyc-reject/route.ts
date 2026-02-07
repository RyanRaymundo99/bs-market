import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  const admin = await validateAdminSession(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const userIds = Array.isArray(body.userIds) ? body.userIds : [];
  const reason = typeof body.reason === "string" ? body.reason.trim() : "Bulk rejection";
  if (userIds.length === 0) {
    return NextResponse.json({ error: "userIds array required" }, { status: 400 });
  }

  const results = { rejected: 0, skipped: 0, errors: [] as string[] };

  for (const userId of userIds) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, kycStatus: true },
      });
      if (!user) {
        results.skipped++;
        continue;
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: "REJECTED",
          kycReviewedAt: new Date(),
          kycRejectionReason: reason,
          updatedAt: new Date(),
        },
      });

      try {
        await prisma.notification.create({
          data: {
            userId,
            type: "kyc_rejected",
            title: "KYC não aprovado",
            message: `Motivo: ${reason}. Você pode reenviar os documentos.`,
            metadata: { rejectedBy: admin.userId, reason },
          },
        });
      } catch {
        // ignore
      }
      results.rejected++;
    } catch {
      results.errors.push(userId);
    }
  }

  return NextResponse.json({
    success: true,
    rejected: results.rejected,
    skipped: results.skipped,
    errors: results.errors,
  });
}

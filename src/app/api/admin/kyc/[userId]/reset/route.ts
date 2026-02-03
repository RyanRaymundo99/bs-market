import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let reason: string | null = null;
    try {
      const body = await request.json();
      if (typeof body?.reason === "string" && body.reason.trim()) {
        reason = body.reason.trim();
      }
    } catch {
      // No body or invalid JSON – reason stays null
    }

    // Reset user KYC status to pending; store reason so user knows why to resend
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: "PENDING",
        kycReviewedAt: null,
        kycRejectionReason: reason,
        updatedAt: new Date(),
      },
    });

    // Notify user to resend their documents (in-app)
    try {
      const message = reason
        ? `Sua verificação KYC foi redefinida para pendente. Por favor, reenvie seus documentos e fotos. Motivo: ${reason}`
        : "Sua verificação KYC foi redefinida para pendente. Por favor, reenvie seus documentos e fotos para nova análise.";
      await prisma.notification.create({
        data: {
          userId,
          type: "kyc_reset_to_pending",
          title: "KYC: reenvie seus documentos",
          message,
          metadata: {
            kycStatus: "PENDING",
            reason: reason ?? undefined,
            resetAt: new Date().toISOString(),
            resetBy: adminSession.userId,
          },
        },
      });
    } catch (notificationError) {
      console.error("Failed to create KYC reset notification:", notificationError);
    }

    return NextResponse.json({
      success: true,
      message: "KYC status reset to pending successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        kycStatus: user.kycStatus,
      },
    });
  } catch (error) {
    console.error("Error resetting KYC status:", error);
    return NextResponse.json(
      { error: "Failed to reset KYC status" },
      { status: 500 }
    );
  }
}

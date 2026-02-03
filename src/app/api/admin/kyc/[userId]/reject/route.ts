import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import { sendEmail } from "@/lib/email";

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

    const { reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const trimmedReason = reason.trim();

    // Update user KYC status to rejected
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: "REJECTED",
        kycReviewedAt: new Date(),
        kycRejectionReason: trimmedReason,
        updatedAt: new Date(),
      },
    });

    // In-app notification for the user
    try {
      const message = `Sua verificação KYC foi rejeitada. Motivo: ${trimmedReason}. Você pode acessar seu perfil para ver os detalhes e reenviar os documentos, se desejar.`;
      await prisma.notification.create({
        data: {
          userId,
          type: "kyc_rejected",
          title: "KYC não aprovado",
          message,
          metadata: {
            kycStatus: "REJECTED",
            reason: trimmedReason,
            rejectedAt: new Date().toISOString(),
            rejectedBy: adminSession.userId,
          },
        },
      });
    } catch (notificationError) {
      console.error("Failed to create KYC rejection notification:", notificationError);
    }

    // Email notification
    if (user.email) {
      try {
        const subject = "BS Market - Resultado da verificação KYC";
        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KYC - Resultado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">BS MARKET</h1>
              <p style="color: #fecaca; margin: 8px 0 0; font-size: 14px;">Resultado da verificação KYC</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Olá, ${user.name || "Usuário"}!</h2>
              <p style="color: #4b5563; margin: 0 0 20px; font-size: 16px; line-height: 1.6;">
                Informamos que sua verificação de identidade (KYC) <strong>não foi aprovada</strong> desta vez.
              </p>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #991b1b; margin: 0 0 8px; font-size: 14px; font-weight: 600;">Motivo:</p>
                <p style="color: #7f1d1d; margin: 0; font-size: 15px; line-height: 1.5;">${trimmedReason}</p>
              </div>
              <p style="color: #4b5563; margin: 20px 0 0; font-size: 16px; line-height: 1.6;">
                Acesse seu perfil na plataforma para ver os detalhes e, se desejar, reenviar seus documentos com as correções necessárias. Nossa equipe de suporte também está à disposição para dúvidas.
              </p>
              <p style="color: #4b5563; margin: 20px 0 0; font-size: 16px;">
                Obrigado por usar o BS Market.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 12px;">Este é um email automático. © ${new Date().getFullYear()} BS Market.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
        const text = `BS Market - Resultado da verificação KYC\n\nOlá, ${user.name || "Usuário"}!\n\nSua verificação KYC não foi aprovada.\n\nMotivo: ${trimmedReason}\n\nAcesse seu perfil para reenviar os documentos se desejar.\n\n© ${new Date().getFullYear()} BS Market.`;
        await sendEmail({ to: user.email, subject, text, html });
      } catch (emailError) {
        console.error("Error sending KYC rejection email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "KYC rejected successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        kycStatus: user.kycStatus,
        rejectionReason: user.kycRejectionReason,
      },
    });
  } catch (error) {
    console.error("Error rejecting KYC:", error);
    return NextResponse.json(
      { error: "Failed to reject KYC" },
      { status: 500 }
    );
  }
}

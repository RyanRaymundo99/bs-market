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

    // Email: notify user to resend documents
    if (user.email) {
      try {
        const subject = "BS Market - Reenvie seus documentos KYC";
        const reasonBlock = reason
          ? `<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;"><p style="color: #92400e; margin: 0; font-size: 14px;"><strong>Motivo:</strong> ${reason}</p></div>`
          : "";
        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KYC - Reenviar documentos</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">BS MARKET</h1>
              <p style="color: #fef3c7; margin: 8px 0 0; font-size: 14px;">Reenvie seus documentos</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Olá, ${user.name || "Usuário"}!</h2>
              <p style="color: #4b5563; margin: 0 0 16px; font-size: 16px; line-height: 1.6;">
                Sua verificação KYC foi redefinida para <strong>pendente</strong>. Por favor, acesse seu perfil e reenvie as fotos dos seus documentos para nova análise.
              </p>
              ${reasonBlock}
              <p style="color: #4b5563; margin: 16px 0 0; font-size: 16px; line-height: 1.6;">
                Assim que enviar, sua solicitação será analisada novamente. Em caso de dúvidas, entre em contato com o suporte.
              </p>
              <p style="color: #4b5563; margin: 20px 0 0; font-size: 16px;">Obrigado por usar o BS Market.</p>
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
        const text = `BS Market - Reenvie seus documentos KYC\n\nOlá, ${user.name || "Usuário"}!\n\nSua verificação KYC foi redefinida para pendente. Por favor, acesse seu perfil e reenvie as fotos dos seus documentos.${reason ? `\n\nMotivo: ${reason}` : ""}\n\nObrigado por usar o BS Market.\n© ${new Date().getFullYear()} BS Market.`;
        await sendEmail({ to: user.email, subject, text, html });
      } catch (emailError) {
        console.error("Error sending KYC reset email:", emailError);
      }
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

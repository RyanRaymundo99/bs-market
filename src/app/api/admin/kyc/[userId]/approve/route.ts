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

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        documentFront: true,
        documentBack: true,
        documentSelfie: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      !existingUser.documentFront ||
      !existingUser.documentBack ||
      !existingUser.documentSelfie
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot approve KYC without all three documents (front, back, and selfie).",
          code: "KYC_DOCUMENTS_MISSING",
        },
        { status: 400 }
      );
    }

    // Update user KYC status to approved
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: "APPROVED",
        kycReviewedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create in-app notification for the user (non-blocking)
    try {
      const formattedDate = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());

      await prisma.notification.create({
        data: {
          userId: userId,
          type: "kyc_approved",
          title: "KYC Aprovado com Sucesso!",
          message: `Sua verificação de identidade (KYC) foi aprovada em ${formattedDate}. Agora você tem acesso completo a todas as funcionalidades da plataforma, incluindo compra e venda de criptomoedas, depósitos e saques.`,
          metadata: {
            kycStatus: "APPROVED",
            approvedAt: new Date().toISOString(),
            approvedBy: adminSession.userId,
          },
        },
      });
    } catch (notificationError) {
      // Log notification error but don't fail the approval
      console.error("Failed to create KYC approval notification:", notificationError);
    }

    // Send approval confirmation email
    if (user.email) {
      try {
        const formattedDate = new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date());

        const subject = "BS Market - KYC Aprovado com Sucesso!";
        
        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KYC Aprovado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px 40px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                      <span style="font-size: 28px;">✅</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">BS MARKET</h1>
                    <p style="color: #d1fae5; margin: 5px 0 0; font-size: 14px; font-weight: 300;">KYC Aprovado</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Parabéns, ${user.name || "Usuário"}!</h2>
              
              <p style="color: #4b5563; margin: 0 0 20px; font-size: 16px; line-height: 1.6;">
                Sua verificação de identidade (KYC) foi <strong style="color: #10B981;">aprovada com sucesso</strong>!
              </p>
              
              <p style="color: #4b5563; margin: 0 0 20px; font-size: 16px; line-height: 1.6;">
                Agora você tem acesso completo a todas as funcionalidades da plataforma BS Market, incluindo:
              </p>
              
              <ul style="color: #4b5563; margin: 0 0 20px; padding-left: 20px; font-size: 16px; line-height: 1.8;">
                <li>Compra e venda de criptomoedas</li>
                <li>Depósitos e saques</li>
                <li>Transferências</li>
                <li>Histórico completo de transações</li>
              </ul>
              
              <div style="background-color: #f0fdf4; border-left: 4px solid #10B981; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #166534; margin: 0; font-size: 14px; font-weight: 500;">
                  📅 Data de Aprovação: ${formattedDate}
                </p>
              </div>
              
              <p style="color: #4b5563; margin: 20px 0 0; font-size: 16px; line-height: 1.6;">
                Se você tiver alguma dúvida ou precisar de ajuda, nossa equipe de suporte está sempre disponível para ajudar.
              </p>
              
              <p style="color: #4b5563; margin: 20px 0 0; font-size: 16px; line-height: 1.6;">
                Obrigado por escolher o BS Market!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px;">
                Este é um email automático, por favor não responda.
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} BS Market. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        const text = `
BS Market - KYC Aprovado com Sucesso!

Parabéns, ${user.name || "Usuário"}!

Sua verificação de identidade (KYC) foi aprovada com sucesso!

Agora você tem acesso completo a todas as funcionalidades da plataforma BS Market, incluindo:
- Compra e venda de criptomoedas
- Depósitos e saques
- Transferências
- Histórico completo de transações

Data de Aprovação: ${formattedDate}

Se você tiver alguma dúvida ou precisar de ajuda, nossa equipe de suporte está sempre disponível para ajudar.

Obrigado por escolher o BS Market!

---
Este é um email automático, por favor não responda.
© ${new Date().getFullYear()} BS Market. Todos os direitos reservados.
        `;

        await sendEmail({
          to: user.email,
          subject,
          text,
          html,
        });
      } catch (emailError) {
        // Log email error but don't fail the approval
        console.error("Error sending approval email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "KYC approved successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        kycStatus: user.kycStatus,
      },
    });
  } catch (error) {
    console.error("Error approving KYC:", error);
    return NextResponse.json(
      { error: "Failed to approve KYC" },
      { status: 500 }
    );
  }
}

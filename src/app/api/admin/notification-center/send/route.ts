import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, subject, message, sendEmail: shouldSendEmail } =
      await request.json();

    // Validate required fields
    if (!userId || !subject || !message) {
      return NextResponse.json(
        { error: "userId, subject, and message are required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId: userId,
        type: "admin_message",
        title: subject,
        message: message,
        metadata: {
          sentBy: adminSession.userId,
          sentAt: new Date().toISOString(),
          emailSent: shouldSendEmail || false,
        },
      },
    });

    // Send email if requested
    let emailResult = null;
    if (shouldSendEmail && user.email) {
      try {
        const formattedDate = new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date());

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 40px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                      <span style="font-size: 28px; color: #1e40af;">📧</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">BS MARKET</h1>
                    <p style="color: #e0e7ff; margin: 5px 0 0; font-size: 14px; font-weight: 300;">Mensagem da Administração</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 22px; font-weight: 600;">${subject}</h2>
              
              <div style="color: #4b5563; margin: 0 0 20px; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${message.replace(/\n/g, "<br>")}</div>
              
              <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #1e40af; margin: 0; font-size: 14px; font-weight: 500;">
                  📅 Data: ${formattedDate}
                </p>
              </div>
              
              <p style="color: #4b5563; margin: 20px 0 0; font-size: 16px; line-height: 1.6;">
                Se você tiver alguma dúvida ou precisar de ajuda, nossa equipe de suporte está sempre disponível para ajudar.
              </p>
              
              <p style="color: #4b5563; margin: 20px 0 0; font-size: 16px; line-height: 1.6;">
                Atenciosamente,<br>
                Equipe BS Market
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
BS Market - ${subject}

${message}

Data: ${formattedDate}

Se você tiver alguma dúvida ou precisar de ajuda, nossa equipe de suporte está sempre disponível para ajudar.

Atenciosamente,
Equipe BS Market

---
Este é um email automático, por favor não responda.
© ${new Date().getFullYear()} BS Market. Todos os direitos reservados.
        `;

        emailResult = await sendEmail({
          to: user.email,
          subject: `BS Market - ${subject}`,
          text,
          html,
        });

        // Update notification metadata with email result
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            metadata: {
              sentBy: adminSession.userId,
              sentAt: new Date().toISOString(),
              emailSent: true,
              emailResult: emailResult.success
                ? { success: true, messageId: emailResult.messageId }
                : { success: false, message: emailResult.message },
            },
          },
        });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        emailResult = {
          success: false,
          message:
            emailError instanceof Error
              ? emailError.message
              : "Unknown error",
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: "Notification created successfully",
      notification: {
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
      },
      emailSent: shouldSendEmail ? emailResult?.success || false : false,
      emailResult: emailResult,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

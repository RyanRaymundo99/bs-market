import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import { sendEmail } from "@/lib/email";
import { logSentEmail } from "@/lib/communication-log";

export async function POST(request: NextRequest) {
  const admin = await validateAdminSession(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const userIds = Array.isArray(body.userIds) ? body.userIds : [];
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sendEmailOption = !!body.sendEmail;

  if (userIds.length === 0 || !subject || !message) {
    return NextResponse.json(
      { error: "userIds, subject, and message are required" },
      { status: 400 }
    );
  }

  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (const userId of userIds) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });
      if (!user) {
        results.failed++;
        results.errors.push(userId);
        continue;
      }

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "admin_message",
          title: subject,
          message,
          metadata: {
            sentBy: admin.userId,
            sentAt: new Date().toISOString(),
            emailSent: sendEmailOption,
          },
        },
      });

      if (sendEmailOption && user.email) {
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
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">BS MARKET</h1>
          <p style="color:#e0e7ff;margin:5px 0 0;font-size:14px;">Mensagem da Administração</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#1f2937;margin:0 0 20px;font-size:22px;">${subject}</h2>
          <div style="color:#4b5563;font-size:16px;line-height:1.6;white-space:pre-wrap;">${message.replace(/\n/g, "<br>")}</div>
          <p style="color:#6b7280;margin:20px 0 0;font-size:14px;">Data: ${formattedDate}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

          const text = `BS Market - ${subject}\n\n${message}\n\nData: ${formattedDate}`;

          const emailResult = await sendEmail({
            to: user.email,
            subject: `BS Market - ${subject}`,
            text,
            html,
          });
          if (emailResult.success) {
            await logSentEmail({
              userId: user.id,
              type: "notification",
              subject: `BS Market - ${subject}`,
              metadata: {},
            });
          }
        } catch (emailErr) {
          // notification already created; count as sent
        }
      }
      results.sent++;
    } catch (e) {
      results.failed++;
      results.errors.push(userId);
    }
  }

  return NextResponse.json({
    success: true,
    sent: results.sent,
    failed: results.failed,
    errors: results.errors,
  });
}

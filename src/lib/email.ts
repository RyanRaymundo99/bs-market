import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ success: boolean; messageId?: string; message?: string }> {
  const recipient = to.toLowerCase().trim();
  const emailSubject = subject.trim();
  const emailText = text.trim();
  const emailHtml = html || emailText.replace(/\n/g, "<br>");
  const resendKey = process.env.RESEND_API_KEY;
  const useGmail =
    process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD;

  console.log("Email send:", {
    to: recipient,
    subject: emailSubject,
    provider: resendKey ? "resend" : useGmail ? "gmail" : "local",
  });

  // Prefer Resend HTTP API (clearer errors than SMTP PLAIN auth failures)
  if (resendKey) {
    const fromAddress =
      process.env.FROM_EMAIL || "noreply@bsmarket.com.br";
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipient],
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        name?: string;
      };

      if (!response.ok) {
        const errorMessage =
          body.message || `Resend HTTP ${response.status}`;
        console.error("Resend API error:", body);
        return {
          success: false,
          message: `Falha ao enviar email via Resend: ${errorMessage}`,
        };
      }

      console.log("Email sent via Resend API:", body.id);
      return { success: true, messageId: body.id };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Resend API request failed:", error);
      return {
        success: false,
        message: `Falha ao enviar email via Resend: ${errorMessage}`,
      };
    }
  }

  let transporter;
  let fromAddress: string;

  if (useGmail) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });
    fromAddress = process.env.EMAIL_SERVER_USER || "noreply@localhost";
  } else {
    transporter = nodemailer.createTransport({
      host: "localhost",
      port: 1025,
      secure: false,
      ignoreTLS: true,
    });
    fromAddress = "dev@localhost.com";
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("SMTP email error:", error);
    return {
      success: false,
      message: useGmail
        ? "Falha ao enviar email via Gmail. Verifique as credenciais."
        : "Falha ao enviar email. MailDev/MailHog está rodando?",
    };
  }
}

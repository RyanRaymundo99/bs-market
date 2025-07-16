"use server";
import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  // Use Resend for production (free tier available)
  // For development, fallback to local SMTP if Resend is not configured
  const useResend = process.env.RESEND_API_KEY;

  let transporter;

  if (useResend) {
    // Production: Use Resend
    transporter = nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 587,
      secure: false,
      auth: {
        user: "resend",
        pass: process.env.RESEND_API_KEY,
      },
    });
  } else {
    // Development: Use local SMTP server (MailDev/MailHog)
    transporter = nodemailer.createTransport({
      host: "localhost",
      port: 1025,
      secure: false,
      ignoreTLS: true,
    });
  }

  const fromAddress = useResend
    ? process.env.FROM_EMAIL || "noreply@yourdomain.com"
    : "dev@localhost.com";

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: to.toLowerCase().trim(),
      subject: subject.trim(),
      text: text.trim(),
    });

    if (useResend) {
      console.log("Email sent via Resend:", info.messageId);
    } else {
      console.log("Email sent (dev mode):", info.messageId);
      console.log("Preview URL: http://localhost:1080");
    }

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Error sending email:", error);

    if (useResend) {
      return {
        success: false,
        message: "Failed to send email via Resend. Check your API key.",
      };
    } else {
      return {
        success: false,
        message: "Failed to send email. Is your local MailDev/MailHog running?",
      };
    }
  }
}

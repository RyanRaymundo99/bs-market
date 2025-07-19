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
  console.log("🔍 Email function called with:", { to, subject });

  // Check for different email providers
  const useResend = process.env.RESEND_API_KEY;
  const useGmail =
    process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD;

  console.log("🔍 Email configuration:", {
    useResend: !!useResend,
    useGmail: !!useGmail,
    hasEmailUser: !!process.env.EMAIL_SERVER_USER,
    hasEmailPassword: !!process.env.EMAIL_SERVER_PASSWORD,
    hasResendKey: !!process.env.RESEND_API_KEY,
    nodeEnv: process.env.NODE_ENV,
  });

  let transporter;

  if (useResend) {
    console.log("📧 Using Resend for email sending");
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
  } else if (useGmail) {
    console.log("📧 Using Gmail SMTP for email sending");
    // Use Gmail SMTP
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });
  } else {
    console.log("📧 Using local SMTP (development mode)");
    // Development: Use local SMTP server (MailDev/MailHog)
    transporter = nodemailer.createTransport({
      host: "localhost",
      port: 1025,
      secure: false,
      ignoreTLS: true,
    });
  }

  // Determine from address
  let fromAddress;
  if (useResend) {
    fromAddress = process.env.FROM_EMAIL || "noreply@bsmarket.com.br";
  } else if (useGmail) {
    fromAddress = process.env.EMAIL_SERVER_USER;
  } else {
    fromAddress = "dev@localhost.com";
  }

  console.log("📧 From address:", fromAddress);

  try {
    console.log("📧 Attempting to send email...");
    const info = await transporter.sendMail({
      from: fromAddress,
      to: to.toLowerCase().trim(),
      subject: subject.trim(),
      text: text.trim(),
    });

    if (useResend) {
      console.log("✅ Email sent via Resend:", info.messageId);
    } else if (useGmail) {
      console.log("✅ Email sent via Gmail:", info.messageId);
    } else {
      console.log("✅ Email sent (dev mode):", info.messageId);
      console.log("📧 Preview URL: http://localhost:1080");
    }

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ Error sending email:", error);

    if (useResend) {
      return {
        success: false,
        message:
          "Failed to send email via Resend. Check your API key and domain verification.",
      };
    } else if (useGmail) {
      return {
        success: false,
        message:
          "Failed to send email via Gmail. Check your credentials and 2FA app password.",
      };
    } else {
      return {
        success: false,
        message: "Failed to send email. Is your local MailDev/MailHog running?",
      };
    }
  }
}

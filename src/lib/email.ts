"use server";
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
    // Use Resend's sandbox domain for testing if no verified domain is configured
    fromAddress = process.env.FROM_EMAIL || "onboarding@resend.dev";
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
      html: html || text.trim().replace(/\n/g, "<br>"),
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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("domain is not verified")) {
        return {
          success: false,
          message:
            "Domain not verified. Using Resend's sandbox domain 'onboarding@resend.dev' for testing, or verify your domain at https://resend.com/domains",
        };
      }
      return {
        success: false,
        message: `Failed to send email via Resend: ${errorMessage}`,
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

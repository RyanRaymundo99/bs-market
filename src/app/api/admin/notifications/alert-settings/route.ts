import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin-session";
import {
  getAdminAlertSettings,
  updateAdminAlertSettings,
} from "@/lib/admin-alert-email";

export async function GET(request: NextRequest) {
  const adminSession = await validateAdminSession(request);
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await getAdminAlertSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Failed to get admin alert settings:", error);
    return NextResponse.json(
      { error: "Failed to load alert settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const adminSession = await validateAdminSession(request);
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const {
      emails,
      notifyDepositOver500,
      notifyWithdrawOver500,
      notifyNewAccount,
      notifyKycReady,
    } = body;
    const settings = await updateAdminAlertSettings({
      ...(Array.isArray(emails) && { emails }),
      ...(typeof notifyDepositOver500 === "boolean" && {
        notifyDepositOver500,
      }),
      ...(typeof notifyWithdrawOver500 === "boolean" && {
        notifyWithdrawOver500,
      }),
      ...(typeof notifyNewAccount === "boolean" && { notifyNewAccount }),
      ...(typeof notifyKycReady === "boolean" && { notifyKycReady }),
    });
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Failed to update admin alert settings:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const isMissingTable =
      msg.includes("admin_alert_settings") ||
      msg.includes("AdminAlertSettings") ||
      msg.includes("does not exist") ||
      msg.includes("Unknown table");
    return NextResponse.json(
      {
        error: isMissingTable
          ? "Tabela de alertas não existe. Rode no projeto: npx prisma db push"
          : "Failed to update alert settings",
      },
      { status: 500 }
    );
  }
}

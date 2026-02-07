import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin-session";
import { getMoneyControls, setMoneyControls } from "@/lib/money-controls";
import { writeAuditLog, getAuditLogIpAndAgent } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  const adminSession = await validateAdminSession(request);
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const moneyControls = await getMoneyControls();

  return NextResponse.json(
    { success: true, moneyControls },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function PATCH(request: NextRequest) {
  const adminSession = await validateAdminSession(request);
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      depositsDisabled?: boolean;
      withdrawalsDisabled?: boolean;
      depositsDisabledMessage?: string;
      withdrawalsDisabledMessage?: string;
      maxDepositUsdt?: number;
      maintenanceMessage?: string | null;
      maintenanceStartAt?: string | null;
      maintenanceEndAt?: string | null;
      blockLoginDuringMaintenance?: boolean;
      blockTradeDuringMaintenance?: boolean;
      newSignupsDisabled?: boolean;
      tradeDisabled?: boolean;
      notifyUsers?: boolean;
    };

    if (typeof body.depositsDisabled !== "boolean") {
      return NextResponse.json(
        { error: "depositsDisabled must be a boolean" },
        { status: 400 }
      );
    }

    if (typeof body.withdrawalsDisabled !== "boolean") {
      return NextResponse.json(
        { error: "withdrawalsDisabled must be a boolean" },
        { status: 400 }
      );
    }

    const depositsMessage =
      typeof body.depositsDisabledMessage === "string"
        ? body.depositsDisabledMessage.trim()
        : undefined;

    const withdrawalsMessage =
      typeof body.withdrawalsDisabledMessage === "string"
        ? body.withdrawalsDisabledMessage.trim()
        : undefined;

    const oldMoneyControls = await getMoneyControls();

    const maxDepositUsdt =
      typeof body.maxDepositUsdt === "number" && body.maxDepositUsdt > 0
        ? body.maxDepositUsdt
        : undefined;
    const maintenanceMessage =
      body.maintenanceMessage !== undefined ? body.maintenanceMessage : undefined;
    const maintenanceStartAt =
      body.maintenanceStartAt !== undefined ? body.maintenanceStartAt : undefined;
    const maintenanceEndAt =
      body.maintenanceEndAt !== undefined ? body.maintenanceEndAt : undefined;

    const { moneyControls, notifiedUsers } = await setMoneyControls({
      depositsDisabled: body.depositsDisabled,
      withdrawalsDisabled: body.withdrawalsDisabled,
      depositsDisabledMessage: depositsMessage,
      withdrawalsDisabledMessage: withdrawalsMessage,
      maxDepositUsdt,
      maintenanceMessage,
      maintenanceStartAt,
      maintenanceEndAt,
      blockLoginDuringMaintenance: body.blockLoginDuringMaintenance,
      blockTradeDuringMaintenance: body.blockTradeDuringMaintenance,
      newSignupsDisabled: body.newSignupsDisabled,
      tradeDisabled: body.tradeDisabled,
      updatedBy: adminSession.user.email || adminSession.userId,
      notifyUsers: Boolean(body.notifyUsers),
    });

    const { ipAddress, userAgent } = getAuditLogIpAndAgent(request);
    await writeAuditLog({
      adminId: adminSession.userId,
      adminEmail: adminSession.user.email,
      action: "money_controls_update",
      resourceType: "money_controls",
      oldValue: {
        depositsDisabled: oldMoneyControls.depositsDisabled,
        withdrawalsDisabled: oldMoneyControls.withdrawalsDisabled,
        depositsDisabledMessage: oldMoneyControls.depositsDisabledMessage ?? null,
        withdrawalsDisabledMessage: oldMoneyControls.withdrawalsDisabledMessage ?? null,
        maxDepositUsdt: oldMoneyControls.maxDepositUsdt,
        maintenanceMessage: oldMoneyControls.maintenanceMessage ?? null,
        maintenanceStartAt: oldMoneyControls.maintenanceStartAt?.toISOString() ?? null,
        maintenanceEndAt: oldMoneyControls.maintenanceEndAt?.toISOString() ?? null,
        blockLoginDuringMaintenance: oldMoneyControls.blockLoginDuringMaintenance,
        blockTradeDuringMaintenance: oldMoneyControls.blockTradeDuringMaintenance,
        newSignupsDisabled: oldMoneyControls.newSignupsDisabled,
        tradeDisabled: oldMoneyControls.tradeDisabled,
      },
      newValue: {
        depositsDisabled: moneyControls.depositsDisabled,
        withdrawalsDisabled: moneyControls.withdrawalsDisabled,
        depositsDisabledMessage: moneyControls.depositsDisabledMessage ?? null,
        withdrawalsDisabledMessage: moneyControls.withdrawalsDisabledMessage ?? null,
        maxDepositUsdt: moneyControls.maxDepositUsdt,
        maintenanceMessage: moneyControls.maintenanceMessage ?? null,
        maintenanceStartAt: moneyControls.maintenanceStartAt?.toISOString() ?? null,
        maintenanceEndAt: moneyControls.maintenanceEndAt?.toISOString() ?? null,
        blockLoginDuringMaintenance: moneyControls.blockLoginDuringMaintenance,
        blockTradeDuringMaintenance: moneyControls.blockTradeDuringMaintenance,
        newSignupsDisabled: moneyControls.newSignupsDisabled,
        tradeDisabled: moneyControls.tradeDisabled,
      },
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    });

    return NextResponse.json({
      success: true,
      moneyControls,
      notifiedUsers,
    });
  } catch (error) {
    console.error("Failed updating money controls:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}


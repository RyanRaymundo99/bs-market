import { NextResponse } from "next/server";
import { getMoneyControls } from "@/lib/money-controls";

export async function GET() {
  try {
    const moneyControls = await getMoneyControls();

    const now = new Date();
    const start = moneyControls.maintenanceStartAt
      ? new Date(moneyControls.maintenanceStartAt).getTime()
      : null;
    const end = moneyControls.maintenanceEndAt
      ? new Date(moneyControls.maintenanceEndAt).getTime()
      : null;
    const inMaintenance =
      !!moneyControls.maintenanceMessage &&
      start != null &&
      end != null &&
      now.getTime() >= start &&
      now.getTime() <= end;

    return NextResponse.json(
      {
        success: true,
        depositsDisabled: moneyControls.depositsDisabled,
        withdrawalsDisabled: moneyControls.withdrawalsDisabled,
        depositsDisabledMessage: moneyControls.depositsDisabledMessage,
        withdrawalsDisabledMessage: moneyControls.withdrawalsDisabledMessage,
        maxDepositUsdt: moneyControls.maxDepositUsdt ?? 1000000,
        maintenanceMessage: moneyControls.maintenanceMessage ?? null,
        maintenanceStartAt: moneyControls.maintenanceStartAt ?? null,
        maintenanceEndAt: moneyControls.maintenanceEndAt ?? null,
        inMaintenance,
        updatedAt: moneyControls.updatedAt,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Failed to read site status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to read site status" },
      { status: 500 }
    );
  }
}

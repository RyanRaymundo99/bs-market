import { NextResponse } from "next/server";
import { getMoneyControls } from "@/lib/money-controls";

export async function GET() {
  try {
    const moneyControls = await getMoneyControls();

    return NextResponse.json(
      {
        success: true,
        moneyDisabled: moneyControls.moneyDisabled,
        moneyDisabledMessage: moneyControls.moneyDisabledMessage,
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


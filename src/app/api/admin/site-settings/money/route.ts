import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin-session";
import { getMoneyControls, setMoneyControls } from "@/lib/money-controls";

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

    const { moneyControls, notifiedUsers } = await setMoneyControls({
      depositsDisabled: body.depositsDisabled,
      withdrawalsDisabled: body.withdrawalsDisabled,
      depositsDisabledMessage: depositsMessage,
      withdrawalsDisabledMessage: withdrawalsMessage,
      updatedBy: adminSession.user.email || adminSession.userId,
      notifyUsers: Boolean(body.notifyUsers),
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


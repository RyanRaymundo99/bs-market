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
      moneyDisabled?: boolean;
      moneyDisabledMessage?: string;
      notifyUsers?: boolean;
    };

    if (typeof body.moneyDisabled !== "boolean") {
      return NextResponse.json(
        { error: "moneyDisabled must be a boolean" },
        { status: 400 }
      );
    }

    const message =
      typeof body.moneyDisabledMessage === "string"
        ? body.moneyDisabledMessage.trim()
        : "";

    const { moneyControls, notifiedUsers } = await setMoneyControls({
      moneyDisabled: body.moneyDisabled,
      moneyDisabledMessage: message,
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


import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function PATCH(request: NextRequest) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the admin's last seen timestamp to now
    await prisma.user.update({
      where: { id: adminSession.userId },
      data: {
        adminNotificationLastSeenAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin-session";
import { exportBackup } from "@/lib/backup";

export async function GET(request: NextRequest) {
  try {
    const admin = await validateAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await exportBackup();
    const filename = `backup-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`;

    return new NextResponse(JSON.stringify(data, null, 0), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Backup export error:", error);
    return NextResponse.json(
      { error: "Failed to export backup" },
      { status: 500 }
    );
  }
}

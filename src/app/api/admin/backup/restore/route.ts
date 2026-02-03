import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin-session";
import { restoreBackup, type BackupPayload } from "@/lib/backup";

export async function POST(request: NextRequest) {
  try {
    const admin = await validateAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("backup") as File | null;
    const dryRun = formData.get("dryRun") === "true" || formData.get("dryRun") === "1";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing backup file. Send a form field 'backup' with the JSON file." },
        { status: 400 }
      );
    }

    const text = await file.text();
    let data: BackupPayload;
    try {
      data = JSON.parse(text) as BackupPayload;
    } catch {
      return NextResponse.json(
        { error: "Invalid backup file: not valid JSON" },
        { status: 400 }
      );
    }

    if (!data || typeof data.version !== "number" || !Array.isArray(data.user)) {
      return NextResponse.json(
        { error: "Invalid backup format: expected version and user array" },
        { status: 400 }
      );
    }

    const result = await restoreBackup(data, { dryRun });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      dryRun,
      counts: result.counts,
    });
  } catch (error) {
    console.error("Backup restore error:", error);
    return NextResponse.json(
      { error: "Failed to restore backup" },
      { status: 500 }
    );
  }
}

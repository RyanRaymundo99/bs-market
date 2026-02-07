import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin-session";
import prisma from "@/lib/prisma";
import type { SiteAppearance } from "@/app/api/site-appearance/route";

const APPEARANCE_KEY = "appearance";

export async function GET(request: NextRequest) {
  const admin = await validateAdminSession(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: APPEARANCE_KEY },
    });
    if (!row || !row.value || typeof row.value !== "object") {
      return NextResponse.json({
        success: true,
        appearance: {
          theme: "dark",
          primaryColor: "cyan",
          secondaryColor: "cyan",
          buttonStyle: "filled",
        },
      });
    }
    const v = row.value as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      appearance: {
        theme: v.theme ?? "dark",
        primaryColor: v.primaryColor ?? "cyan",
        secondaryColor: v.secondaryColor ?? "cyan",
        buttonStyle: v.buttonStyle ?? "filled",
      },
    });
  } catch (e) {
    console.error("admin site-appearance GET", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await validateAdminSession(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Partial<SiteAppearance>;
    const theme = ["dark", "bright"].includes(body.theme ?? "") ? body.theme! : "dark";
    const primaryColor = ["cyan", "blue", "green", "purple", "orange"].includes(body.primaryColor ?? "")
      ? body.primaryColor!
      : "cyan";
    const secondaryColor = ["cyan", "blue", "green", "purple", "orange"].includes(body.secondaryColor ?? "")
      ? body.secondaryColor!
      : "cyan";
    const buttonStyle = ["filled", "outline", "soft"].includes(body.buttonStyle ?? "")
      ? body.buttonStyle!
      : "filled";
    const value = { theme, primaryColor, secondaryColor, buttonStyle };
    await prisma.siteSetting.upsert({
      where: { key: APPEARANCE_KEY },
      create: { key: APPEARANCE_KEY, value },
      update: { value },
    });
    return NextResponse.json({ success: true, appearance: value });
  } catch (e) {
    console.error("admin site-appearance PUT", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const APPEARANCE_KEY = "appearance";

export type SiteAppearance = {
  theme: "dark" | "bright";
  primaryColor: "cyan" | "blue" | "green" | "purple" | "orange";
  secondaryColor: "cyan" | "blue" | "green" | "purple" | "orange";
  buttonStyle: "filled" | "outline" | "soft";
};

const defaultAppearance: SiteAppearance = {
  theme: "dark",
  primaryColor: "cyan",
  secondaryColor: "cyan",
  buttonStyle: "filled",
};

export async function GET() {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: APPEARANCE_KEY },
    });
    if (!row || !row.value || typeof row.value !== "object") {
      return NextResponse.json(
        { success: true, appearance: defaultAppearance },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
      );
    }
    const v = row.value as Record<string, unknown>;
    const appearance: SiteAppearance = {
      theme: ["dark", "bright"].includes(v.theme as string) ? (v.theme as SiteAppearance["theme"]) : defaultAppearance.theme,
      primaryColor: ["cyan", "blue", "green", "purple", "orange"].includes(v.primaryColor as string)
        ? (v.primaryColor as SiteAppearance["primaryColor"])
        : defaultAppearance.primaryColor,
      secondaryColor: ["cyan", "blue", "green", "purple", "orange"].includes(v.secondaryColor as string)
        ? (v.secondaryColor as SiteAppearance["secondaryColor"])
        : defaultAppearance.secondaryColor,
      buttonStyle: ["filled", "outline", "soft"].includes(v.buttonStyle as string)
        ? (v.buttonStyle as SiteAppearance["buttonStyle"])
        : defaultAppearance.buttonStyle,
    };
    return NextResponse.json(
      { success: true, appearance },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    console.error("site-appearance GET", e);
    return NextResponse.json(
      { success: true, appearance: defaultAppearance },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  }
}

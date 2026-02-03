import { NextRequest, NextResponse } from "next/server";
import { heicToJpegBuffer } from "@/lib/heic-to-jpeg";

/**
 * GET /api/kyc-image?url=...
 * Fetches a KYC image URL. If the image is HEIC/HEIF, converts to JPEG so browsers can display it.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Only allow our own blob storage and relative uploads
  const allowedHosts = [
    "blob.vercel-storage.com",
    "haisxgilinyuotni.public.blob.vercel-storage.com",
    new URL(request.url).host,
  ];
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (
    !allowedHosts.some((h) => parsed.host === h) &&
    !url.startsWith("/uploads/")
  ) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  try {
    const fetchUrl = url.startsWith("/")
      ? new URL(url, request.url).toString()
      : url;
    const res = await fetch(fetchUrl, { cache: "no-store" });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const buffer = Buffer.from(await res.arrayBuffer());
    const isHeic =
      contentType.includes("heic") ||
      contentType.includes("heif") ||
      url.toLowerCase().endsWith(".heic") ||
      url.toLowerCase().endsWith(".heif");

    if (isHeic && buffer.length > 0) {
      const jpegBuffer = await heicToJpegBuffer(buffer);
      return new NextResponse(jpegBuffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("KYC image proxy error:", error);
    return NextResponse.json(
      { error: "Failed to load image" },
      { status: 500 }
    );
  }
}

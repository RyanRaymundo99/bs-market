import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { put } from "@vercel/blob";
import { heicToJpegBuffer, isHeicFile } from "@/lib/heic-to-jpeg";

const TYPES = ["front", "back", "selfie"] as const;
type DocType = (typeof TYPES)[number];

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("better-auth.session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token: sessionCookie.value },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const user = session.user;
    const formData = await request.formData();

    const files: Record<DocType, File | null> = {
      front: (formData.get("documentFront") as File) || null,
      back: (formData.get("documentBack") as File) || null,
      selfie: (formData.get("documentSelfie") as File) || null,
    };

    const hasAny = TYPES.some((t) => files[t] && files[t]!.size > 0);
    if (!hasAny) {
      return NextResponse.json(
        { error: "At least one document (front, back, or selfie) is required" },
        { status: 400 }
      );
    }

    const isVercel = process.env.VERCEL === "1";
    const updateData: Record<string, string | Date> = {
      updatedAt: new Date(),
    };

    const isFirstSubmission =
      !user.documentFront && !user.documentBack && !user.documentSelfie;
    if (isFirstSubmission) {
      updateData.kycStatus = "PENDING";
      updateData.kycSubmittedAt = new Date();
    }

    for (const type of TYPES) {
      const file = files[type];
      if (!file || file.size === 0) continue;

      const timestamp = Date.now() + TYPES.indexOf(type);
      const ext = isHeicFile(file) ? "jpg" : file.name.split(".").pop() || "jpg";
      const filename = `${type}_${timestamp}.${ext}`;

      let buffer: Buffer = Buffer.from(await file.arrayBuffer());
      if (isHeicFile(file) && buffer.length > 0) {
        buffer = await heicToJpegBuffer(buffer);
      }

      let relativePath: string;

      if (isVercel) {
        const blob = await put(`kyc/${user.id}/${filename}`, buffer, {
          access: "public",
          contentType: isHeicFile(file) ? "image/jpeg" : file.type,
        });
        relativePath = blob.url;
      } else {
        const uploadDir = join(
          process.cwd(),
          "public",
          "uploads",
          "kyc",
          user.id
        );
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }
        const filePath = join(uploadDir, filename);
        await writeFile(filePath, buffer);
        if (!existsSync(filePath)) {
          return NextResponse.json(
            { error: "Failed to save document file" },
            { status: 500 }
          );
        }
        relativePath = `/uploads/kyc/${user.id}/${filename}`;
      }

      if (type === "front") updateData.documentFront = relativePath;
      else if (type === "back") updateData.documentBack = relativePath;
      else if (type === "selfie") updateData.documentSelfie = relativePath;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Documents uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading KYC documents:", error);
    return NextResponse.json(
      { error: "Failed to upload documents" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { put } from "@vercel/blob";
import { heicToJpegBuffer, isHeicFile } from "@/lib/heic-to-jpeg";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authSession.userId },
      select: {
        id: true,
        email: true,
        documentFront: true,
        documentBack: true,
        documentSelfie: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file || !type) {
      return NextResponse.json(
        { error: "File and type are required" },
        { status: 400 }
      );
    }

    // Use Vercel Blob Storage for production, filesystem for localhost
    const isVercel = process.env.VERCEL === "1";
    if (isVercel && !process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("KYC Document Upload - missing BLOB_READ_WRITE_TOKEN");
      return NextResponse.json(
        {
          error:
            "Armazenamento de documentos não configurado no servidor (Vercel Blob). Contate o suporte.",
          code: "BLOB_TOKEN_MISSING",
        },
        { status: 500 }
      );
    }
    const timestamp = Date.now();
    const ext = isHeicFile(file) ? "jpg" : file.name.split(".").pop() || "jpg";
    const filename = `${type}_${timestamp}.${ext}`;
    let relativePath: string;

    let buffer: Buffer = Buffer.from(await file.arrayBuffer());
    if (isHeicFile(file) && buffer.length > 0) {
      buffer = await heicToJpegBuffer(buffer);
    }

    if (isVercel) {
      // Use Vercel Blob Storage for production
      try {
        const blob = await put(`kyc/${user.id}/${filename}`, buffer, {
          access: "public",
          contentType: isHeicFile(file) ? "image/jpeg" : file.type,
        });
        relativePath = blob.url;

        console.log("KYC Document Upload - File uploaded to Vercel Blob:", {
          userId: user.id,
          type,
          url: relativePath,
        });
      } catch (blobError: unknown) {
        const errorMessage =
          blobError instanceof Error ? blobError.message : "Unknown error";
        console.error("KYC Document Upload - Blob upload error:", blobError);
        return NextResponse.json(
          {
            error:
              "Falha ao fazer upload do documento. Por favor, tente novamente.",
            code: "BLOB_UPLOAD_FAILED",
            details: errorMessage,
          },
          { status: 500 }
        );
      }
    } else {
      // Use filesystem for localhost/development
      try {
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

        // Verify file was written
        if (!existsSync(filePath)) {
          console.error("KYC Document Upload - File not written:", filePath);
          return NextResponse.json(
            { error: "Failed to save document file" },
            { status: 500 }
          );
        }

        relativePath = `/uploads/kyc/${user.id}/${filename}`;

        console.log("KYC Document Upload - File saved to filesystem:", {
          userId: user.id,
          type,
          path: relativePath,
        });
      } catch (fileError: unknown) {
        const errorMessage =
          fileError instanceof Error ? fileError.message : "Unknown error";
        console.error("KYC Document Upload - File system error:", fileError);
        return NextResponse.json(
          {
            error: "Falha ao salvar o arquivo. Por favor, tente novamente.",
            code: "FILESYSTEM_ERROR",
            details: errorMessage,
          },
          { status: 500 }
        );
      }
    }

    console.log("KYC Document Upload - Saving:", {
      userId: user.id,
      email: user.email,
      type,
      filename,
      relativePath,
      storageType: isVercel ? "Vercel Blob" : "Filesystem",
    });

    // Update user with the new document path
    const updateData: Record<string, string | Date> = {
      updatedAt: new Date(),
    };

    if (type === "front") {
      updateData.documentFront = relativePath;
    } else if (type === "back") {
      updateData.documentBack = relativePath;
    } else if (type === "selfie") {
      updateData.documentSelfie = relativePath;
    }

    // If this is the first KYC submission, update the status
    if (!user.documentFront && !user.documentBack && !user.documentSelfie) {
      updateData.kycStatus = "PENDING";
      updateData.kycSubmittedAt = new Date();
    }

    // File is already saved (either to blob or filesystem) at this point

    console.log("KYC Document Upload - About to update database:", {
      userId: user.id,
      updateData,
      updateDataKeys: Object.keys(updateData),
      updateDataValues: Object.values(updateData),
    });

    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
      console.log(
        "KYC Document Upload - Prisma update completed without error"
      );
    } catch (updateError) {
      console.error("KYC Document Upload - Prisma update failed:", updateError);
      throw updateError;
    }

    // Immediately verify by querying the database again
    const verifyUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        documentFront: true,
        documentBack: true,
        documentSelfie: true,
      },
    });

    console.log("KYC Document Upload - User updated:", {
      userId: updatedUser.id,
      email: updatedUser.email,
      documentFront: updatedUser.documentFront,
      documentBack: updatedUser.documentBack,
      documentSelfie: updatedUser.documentSelfie,
      type,
      savedPath:
        type === "front"
          ? updatedUser.documentFront
          : type === "back"
          ? updatedUser.documentBack
          : updatedUser.documentSelfie,
    });

    console.log("KYC Document Upload - Verification query:", {
      userId: verifyUser?.id,
      email: verifyUser?.email,
      documentFront: verifyUser?.documentFront,
      documentBack: verifyUser?.documentBack,
      documentSelfie: verifyUser?.documentSelfie,
      expectedPath: relativePath,
      type,
      matches: {
        front:
          verifyUser?.documentFront ===
          (type === "front" ? relativePath : user.documentFront),
        back:
          verifyUser?.documentBack ===
          (type === "back" ? relativePath : user.documentBack),
        selfie:
          verifyUser?.documentSelfie ===
          (type === "selfie" ? relativePath : user.documentSelfie),
      },
    });

    // Check if the update actually persisted
    const expectedField =
      type === "front"
        ? "documentFront"
        : type === "back"
        ? "documentBack"
        : "documentSelfie";
    const actualValue = verifyUser?.[
      expectedField as keyof typeof verifyUser
    ] as string | null;

    if (actualValue !== relativePath) {
      console.error(
        "⚠️ KYC Document Upload - Database update did NOT persist!",
        {
          expected: relativePath,
          actual: actualValue,
          field: expectedField,
          updateData,
        }
      );

      // Try one more time with explicit field update
      try {
        const retryUpdate = await prisma.user.update({
          where: { id: user.id },
          data: {
            [expectedField]: relativePath,
            updatedAt: new Date(),
          },
        });

        console.log("KYC Document Upload - Retry update result:", {
          [expectedField]:
            retryUpdate[expectedField as keyof typeof retryUpdate],
        });
      } catch (retryError) {
        console.error("KYC Document Upload - Retry update failed:", retryError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully",
      documentPath: relativePath,
    });
  } catch (error) {
    console.error("Error uploading KYC document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

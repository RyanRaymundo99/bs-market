import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get("better-auth.session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the session in the database
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

    // Create upload directory if it doesn't exist
    // Use consistent path format: uploads/kyc/{userId} (no "user_" prefix)
    const uploadDir = join(process.cwd(), "public", "uploads", "kyc", user.id);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${type}_${timestamp}.${file.name.split(".").pop()}`;
    const filePath = join(uploadDir, filename);

    // Convert file to buffer and save it
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Generate relative path for database storage
    // Use consistent path format: /uploads/kyc/{userId}/filename (no "user_" prefix)
    const relativePath = `/uploads/kyc/${user.id}/${filename}`;

    console.log("KYC Document Upload - Saving:", {
      userId: user.id,
      email: user.email,
      type,
      filename,
      relativePath,
      filePath,
      fileExists: existsSync(filePath),
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

    // Verify file was written before updating database
    if (!existsSync(filePath)) {
      console.error("KYC Document Upload - File not written:", filePath);
      return NextResponse.json(
        { error: "Failed to save document file" },
        { status: 500 }
      );
    }

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

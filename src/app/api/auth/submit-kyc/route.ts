import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const documentType = formData.get("documentType") as string;
    const documentNumber = formData.get("documentNumber") as string;
    const cpf = formData.get("cpf") as string;
    const documentFront = formData.get("documentFront") as File;
    const documentBack = formData.get("documentBack") as File;
    const documentSelfie = formData.get("documentSelfie") as File;

    // Validate required fields
    if (
      !documentType ||
      !cpf ||
      !documentFront ||
      !documentBack ||
      !documentSelfie
    ) {
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    // documentNumber is optional, use empty string if not provided
    const finalDocumentNumber = documentNumber || "";

    // Validate document type
    const validDocumentTypes = ["RG", "HABILITACAO", "CNH", "PASSPORT"];
    if (!validDocumentTypes.includes(documentType)) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      );
    }

    // Try to get user from session first, then fallback to CPF lookup
    let user = null;
    let cookieStore = null;

    try {
      cookieStore = await cookies();
      const sessionToken = cookieStore.get("better-auth.session")?.value;

      if (sessionToken) {
        console.log("Looking for user by session token:", sessionToken);
        const session = await prisma.session.findFirst({
          where: { token: sessionToken },
          include: { user: true },
        });

        if (session?.user) {
          user = session.user;
          console.log("User found via session:", {
            id: user.id,
            cpf: user.cpf,
          });
        }
      }
    } catch (error) {
      console.log("Session lookup failed:", error);
    }

    // Fallback to CPF lookup if session method failed
    if (!user) {
      const cleanCpf = cpf.replace(/\D/g, "");
      console.log("Looking for user with CPF:", {
        originalCpf: cpf,
        cleanCpf,
        cpfLength: cleanCpf.length,
      });

      // Try exact match first
      user = await prisma.user.findFirst({
        where: { cpf: cleanCpf },
      });

      if (!user) {
        // Try finding by partial CPF match (in case of formatting issues)
        const allUsers = await prisma.user.findMany({
          where: {
            cpf: {
              contains: cleanCpf.slice(-8), // Last 8 digits
            },
          },
        });
        console.log("Users found with partial CPF match:", allUsers.length);

        if (allUsers.length === 1) {
          user = allUsers[0];
          console.log("User found via partial CPF match:", {
            id: user.id,
            cpf: user.cpf,
          });
        }
      }

      if (user) {
        console.log("User found via CPF:", { id: user.id, cpf: user.cpf });
      }
    }

    if (!user) {
      const sessionToken = cookieStore?.get("better-auth.session")?.value;
      console.error("User not found for KYC submission:", {
        originalCpf: cpf,
        cleanCpf: cpf.replace(/\D/g, ""),
        sessionToken: sessionToken ? "present" : "missing",
        sessionTokenValue: sessionToken
          ? sessionToken.substring(0, 20) + "..."
          : null,
      });
      return NextResponse.json(
        {
          error:
            "Usuário não encontrado. Certifique-se de usar o mesmo CPF do cadastro. Se o problema persistir, entre em contato com o suporte.",
        },
        { status: 404 }
      );
    }

    // Check if user already has KYC submitted
    if (user.kycStatus !== "PENDING" && user.documentType) {
      return NextResponse.json(
        { error: "KYC documents already submitted" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "kyc", user.id);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filenames
    const timestamp = Date.now();
    const frontFilename = `front_${timestamp}.${documentFront.name
      .split(".")
      .pop()}`;
    const backFilename = `back_${timestamp}.${documentBack.name
      .split(".")
      .pop()}`;
    const selfieFilename = `selfie_${timestamp}.${documentSelfie.name
      .split(".")
      .pop()}`;

    // Save files
    const frontPath = join(uploadsDir, frontFilename);
    const backPath = join(uploadsDir, backFilename);
    const selfiePath = join(uploadsDir, selfieFilename);

    const frontBuffer = Buffer.from(await documentFront.arrayBuffer());
    const backBuffer = Buffer.from(await documentBack.arrayBuffer());
    const selfieBuffer = Buffer.from(await documentSelfie.arrayBuffer());

    await writeFile(frontPath, frontBuffer);
    await writeFile(backPath, backBuffer);
    await writeFile(selfiePath, selfieBuffer);

    // Generate URLs for database storage
    // Use relative paths instead of full URLs for better compatibility
    const frontUrl = `/uploads/kyc/${user.id}/${frontFilename}`;
    const backUrl = `/uploads/kyc/${user.id}/${backFilename}`;
    const selfieUrl = `/uploads/kyc/${user.id}/${selfieFilename}`;

    console.log("KYC Submission - Saving documents:", {
      userId: user.id,
      email: user.email,
      frontUrl,
      backUrl,
      selfieUrl,
      frontPath: frontPath,
      backPath: backPath,
      selfiePath: selfiePath,
      filesExist: {
        front: existsSync(frontPath),
        back: existsSync(backPath),
        selfie: existsSync(selfiePath),
      },
    });

    // Verify files were written
    if (
      !existsSync(frontPath) ||
      !existsSync(backPath) ||
      !existsSync(selfiePath)
    ) {
      console.error("KYC Submission - Files not written correctly:", {
        frontExists: existsSync(frontPath),
        backExists: existsSync(backPath),
        selfieExists: existsSync(selfiePath),
      });
      return NextResponse.json(
        { error: "Failed to save document files" },
        { status: 500 }
      );
    }

    // Update user with KYC data
    try {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          documentType: documentType as
            | "RG"
            | "HABILITACAO"
            | "CNH"
            | "PASSPORT",
          documentNumber: finalDocumentNumber,
          documentFront: frontUrl,
          documentBack: backUrl,
          documentSelfie: selfieUrl,
          kycStatus: "PENDING",
          kycSubmittedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log("KYC Submission - User updated successfully:", {
        userId: updatedUser.id,
        email: updatedUser.email,
        documentFront: updatedUser.documentFront,
        documentBack: updatedUser.documentBack,
        documentSelfie: updatedUser.documentSelfie,
        kycStatus: updatedUser.kycStatus,
        kycSubmittedAt: updatedUser.kycSubmittedAt,
      });

      // Verify the update actually saved the documents
      if (
        !updatedUser.documentFront ||
        !updatedUser.documentBack ||
        !updatedUser.documentSelfie
      ) {
        console.error("KYC Submission - Documents not saved in database:", {
          documentFront: updatedUser.documentFront,
          documentBack: updatedUser.documentBack,
          documentSelfie: updatedUser.documentSelfie,
        });
        return NextResponse.json(
          { error: "Documents were not saved to database" },
          { status: 500 }
        );
      }
    } catch (dbError) {
      console.error("KYC Submission - Database update error:", dbError);
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      message: "KYC documents submitted successfully",
      kycStatus: "PENDING",
    });
  } catch (error) {
    console.error("KYC submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit KYC documents" },
      { status: 500 }
    );
  }
}

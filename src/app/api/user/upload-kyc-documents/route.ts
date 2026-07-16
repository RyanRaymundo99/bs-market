import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { put } from "@vercel/blob";
import { heicToJpegBuffer, isHeicFile } from "@/lib/heic-to-jpeg";

export const maxDuration = 60;

const TYPES = ["front", "back", "selfie"] as const;
type DocType = (typeof TYPES)[number];

const MAX_KYC_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const DOC_LABELS: Record<DocType, string> = {
  front: "frente do documento",
  back: "verso do documento",
  selfie: "selfie com documento",
};

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
        cpf: true,
        documentNumber: true,
        documentFront: true,
        documentBack: true,
        documentSelfie: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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
    if (isVercel && !process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("KYC batch upload - missing BLOB_READ_WRITE_TOKEN");
      return NextResponse.json(
        {
          error:
            "Armazenamento de documentos não configurado no servidor (Vercel Blob). Contate o suporte.",
          code: "BLOB_TOKEN_MISSING",
        },
        { status: 500 }
      );
    }

    const updateData: Record<string, string | Date> = {
      updatedAt: new Date(),
    };

    const isFirstSubmission =
      !user.documentFront && !user.documentBack && !user.documentSelfie;
    if (isFirstSubmission) {
      updateData.kycStatus = "PENDING";
      updateData.kycSubmittedAt = new Date();
    }

    // Persist CPF/CNPJ as document number when missing so admin review is complete
    if (!user.documentNumber && user.cpf) {
      updateData.documentNumber = user.cpf;
    }

    for (const type of TYPES) {
      const file = files[type];
      if (!file || file.size === 0) continue;

      if (file.size > MAX_KYC_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `O arquivo de ${DOC_LABELS[type]} excede o limite de 15MB. Reduza a imagem e tente novamente.`,
            code: "FILE_TOO_LARGE",
            documentType: type,
          },
          { status: 413 }
        );
      }

      const timestamp = Date.now() + TYPES.indexOf(type);
      const ext = isHeicFile(file) ? "jpg" : file.name.split(".").pop() || "jpg";
      const filename = `${type}_${timestamp}.${ext}`;

      let buffer: Buffer;
      try {
        buffer = Buffer.from(await file.arrayBuffer());
        if (isHeicFile(file) && buffer.length > 0) {
          buffer = await heicToJpegBuffer(buffer);
        }
      } catch (fileError) {
        console.error("KYC batch upload - file processing error:", {
          userId: user.id,
          type,
          fileName: file.name,
          error: fileError,
        });
        return NextResponse.json(
          {
            error: `Não foi possível processar a imagem de ${DOC_LABELS[type]}. Tente enviar em JPG ou PNG.`,
            code: "FILE_PROCESSING_FAILED",
            documentType: type,
          },
          { status: 400 }
        );
      }

      let relativePath: string;

      if (isVercel) {
        try {
          const blob = await put(`kyc/${user.id}/${filename}`, buffer, {
            access: "public",
            contentType: isHeicFile(file) ? "image/jpeg" : file.type,
          });
          relativePath = blob.url;
        } catch (blobError) {
          console.error("KYC batch upload - Blob upload error:", {
            userId: user.id,
            type,
            fileName: file.name,
            error: blobError,
          });
          return NextResponse.json(
            {
              error:
                "Falha ao enviar documentos para o armazenamento. Verifique a configuração do Vercel Blob e tente novamente.",
              code: "BLOB_UPLOAD_FAILED",
              documentType: type,
              details:
                blobError instanceof Error ? blobError.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      } else {
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
          if (!existsSync(filePath)) {
            return NextResponse.json(
              {
                error: `Falha ao salvar o arquivo de ${DOC_LABELS[type]}. Tente novamente.`,
                code: "FILESYSTEM_WRITE_FAILED",
                documentType: type,
              },
              { status: 500 }
            );
          }
          relativePath = `/uploads/kyc/${user.id}/${filename}`;
        } catch (fileError) {
          console.error("KYC batch upload - filesystem error:", {
            userId: user.id,
            type,
            fileName: file.name,
            error: fileError,
          });
          return NextResponse.json(
            {
              error:
                "Falha ao salvar documentos no servidor. Tente novamente em instantes.",
              code: "FILESYSTEM_ERROR",
              documentType: type,
              details:
                fileError instanceof Error ? fileError.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      }

      if (type === "front") updateData.documentFront = relativePath;
      else if (type === "back") updateData.documentBack = relativePath;
      else if (type === "selfie") updateData.documentSelfie = relativePath;
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    } catch (dbError) {
      console.error("KYC batch upload - database update error:", {
        userId: user.id,
        updateFields: Object.keys(updateData),
        error: dbError,
      });
      return NextResponse.json(
        {
          error:
            "Os arquivos foram enviados, mas não foi possível atualizar seu cadastro. Contate o suporte.",
          code: "DATABASE_UPDATE_FAILED",
          details: dbError instanceof Error ? dbError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Documents uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading KYC documents:", error);
    return NextResponse.json(
      {
        error:
          "Falha ao enviar documentos. Tente novamente ou envie imagens menores em JPG/PNG.",
        code: "KYC_UPLOAD_FAILED",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

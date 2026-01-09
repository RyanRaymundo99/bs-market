import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { cookies } from "next/headers";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const documentType = formData.get("documentType") as string;
    const documentNumber = formData.get("documentNumber") as string;
    const cpf = formData.get("cpf") as string;
    const documentFront = formData.get("documentFront") as File | null;
    const documentBack = formData.get("documentBack") as File | null;
    const documentSelfie = formData.get("documentSelfie") as File | null;
    // CNPJ documents
    const contratoSocial = formData.get("contratoSocial") as File | null;
    const cartaoCNPJ = formData.get("cartaoCNPJ") as File | null;
    const cnhSocioControlado = formData.get("cnhSocioControlado") as File | null;

    // Detect if this is a CNPJ submission
    const cleanCpf = cpf?.replace(/\D/g, "") || "";
    const isCNPJ = cleanCpf.length === 14 || documentType === "CNPJ";

    // Validate required fields based on document type
    if (isCNPJ) {
      if (!cpf || !contratoSocial || !cartaoCNPJ || !cnhSocioControlado) {
        return NextResponse.json(
          {
            error:
              "Por favor, preencha todos os campos obrigatórios e envie todos os documentos (Contrato Social, Cartão CNPJ e CNH do sócio controlado).",
          },
          { status: 400 }
        );
      }
    } else {
      if (
        !documentType ||
        !cpf ||
        !documentFront ||
        !documentBack ||
        !documentSelfie
      ) {
        return NextResponse.json(
          {
            error:
              "Por favor, preencha todos os campos obrigatórios e envie todas as imagens (frente do documento, verso do documento e selfie).",
          },
          { status: 400 }
        );
      }

      // Validate document type for CPF users
      const validDocumentTypes = ["RG", "HABILITACAO", "CNH", "PASSPORT"];
      if (!validDocumentTypes.includes(documentType)) {
        return NextResponse.json(
          {
            error:
              "Tipo de documento inválido. Por favor, selecione RG, CNH, Habilitação ou Passaporte.",
          },
          { status: 400 }
        );
      }
    }

    // documentNumber is optional, use empty string if not provided
    const finalDocumentNumber = documentNumber || "";

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
      const statusMessage =
        user.kycStatus === "APPROVED"
          ? "aprovado"
          : user.kycStatus === "REJECTED"
          ? "rejeitado"
          : "em análise";

      return NextResponse.json(
        {
          error: `Seus documentos já foram enviados e estão ${statusMessage}. Se você precisa enviar novos documentos, entre em contato com o suporte.`,
        },
        { status: 400 }
      );
    }

    // Use Vercel Blob Storage for production, filesystem for localhost
    const isVercel = process.env.VERCEL === "1";
    const timestamp = Date.now();
    
    let frontUrl: string | undefined;
    let backUrl: string | undefined;
    let selfieUrl: string | undefined;
    let contratoSocialUrl: string | undefined;
    let cartaoCNPJUrl: string | undefined;
    let cnhSocioUrl: string | undefined;

    if (isCNPJ) {
      // Handle CNPJ documents
      const contratoFilename = `contrato_social_${timestamp}.${contratoSocial!.name.split(".").pop()}`;
      const cartaoFilename = `cartao_cnpj_${timestamp}.${cartaoCNPJ!.name.split(".").pop()}`;
      const cnhFilename = `cnh_socio_${timestamp}.${cnhSocioControlado!.name.split(".").pop()}`;

      if (isVercel) {
        try {
          const contratoBlob = await put(
            `kyc/${user.id}/${contratoFilename}`,
            contratoSocial!,
            {
              access: "public",
              contentType: contratoSocial!.type,
            }
          );
          const cartaoBlob = await put(
            `kyc/${user.id}/${cartaoFilename}`,
            cartaoCNPJ!,
            {
              access: "public",
              contentType: cartaoCNPJ!.type,
            }
          );
          const cnhBlob = await put(
            `kyc/${user.id}/${cnhFilename}`,
            cnhSocioControlado!,
            {
              access: "public",
              contentType: cnhSocioControlado!.type,
            }
          );

          contratoSocialUrl = contratoBlob.url;
          cartaoCNPJUrl = cartaoBlob.url;
          cnhSocioUrl = cnhBlob.url;
        } catch (blobError: unknown) {
          console.error("KYC Submission - CNPJ Blob upload error:", blobError);
          return NextResponse.json(
            {
              error: "Não foi possível fazer upload dos documentos. Por favor, tente novamente.",
            },
            { status: 500 }
          );
        }
      } else {
        // Use filesystem for localhost/development
        try {
          const uploadsDir = join(
            process.cwd(),
            "public",
            "uploads",
            "kyc",
            user.id
          );
          if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
          }

          const contratoPath = join(uploadsDir, contratoFilename);
          const cartaoPath = join(uploadsDir, cartaoFilename);
          const cnhPath = join(uploadsDir, cnhFilename);

          const contratoBuffer = Buffer.from(await contratoSocial!.arrayBuffer());
          const cartaoBuffer = Buffer.from(await cartaoCNPJ!.arrayBuffer());
          const cnhBuffer = Buffer.from(await cnhSocioControlado!.arrayBuffer());

          await writeFile(contratoPath, contratoBuffer);
          await writeFile(cartaoPath, cartaoBuffer);
          await writeFile(cnhPath, cnhBuffer);

          contratoSocialUrl = `/uploads/kyc/${user.id}/${contratoFilename}`;
          cartaoCNPJUrl = `/uploads/kyc/${user.id}/${cartaoFilename}`;
          cnhSocioUrl = `/uploads/kyc/${user.id}/${cnhFilename}`;
        } catch (fileError: unknown) {
          console.error("KYC Submission - CNPJ File save error:", fileError);
          return NextResponse.json(
            {
              error: "Não foi possível salvar os arquivos. Por favor, tente novamente.",
            },
            { status: 500 }
          );
        }
      }
    } else {
      // Handle CPF documents
      const frontFilename = `front_${timestamp}.${documentFront!.name.split(".").pop()}`;
      const backFilename = `back_${timestamp}.${documentBack!.name.split(".").pop()}`;
      const selfieFilename = `selfie_${timestamp}.${documentSelfie!.name.split(".").pop()}`;

      if (isVercel) {
        // Use Vercel Blob Storage for production
        try {
          const frontBlob = await put(
            `kyc/${user.id}/${frontFilename}`,
            documentFront!,
            {
              access: "public",
              contentType: documentFront!.type,
            }
          );
          const backBlob = await put(
            `kyc/${user.id}/${backFilename}`,
            documentBack!,
            {
              access: "public",
              contentType: documentBack!.type,
            }
          );
          const selfieBlob = await put(
            `kyc/${user.id}/${selfieFilename}`,
            documentSelfie!,
            {
              access: "public",
              contentType: documentSelfie!.type,
            }
          );

          frontUrl = frontBlob.url;
          backUrl = backBlob.url;
          selfieUrl = selfieBlob.url;

          console.log("KYC Submission - Files uploaded to Vercel Blob:", {
            userId: user.id,
            frontUrl,
            backUrl,
            selfieUrl,
          });
        } catch (blobError: unknown) {
          console.error("KYC Submission - Blob upload error:", blobError);
          return NextResponse.json(
            {
              error: "Não foi possível fazer upload dos documentos. Por favor, tente novamente.",
            },
            { status: 500 }
          );
        }
      } else {
        // Use filesystem for localhost/development
        try {
          const uploadsDir = join(
            process.cwd(),
            "public",
            "uploads",
            "kyc",
            user.id
          );
          if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
          }

          const frontPath = join(uploadsDir, frontFilename);
          const backPath = join(uploadsDir, backFilename);
          const selfiePath = join(uploadsDir, selfieFilename);

          const frontBuffer = Buffer.from(await documentFront!.arrayBuffer());
          const backBuffer = Buffer.from(await documentBack!.arrayBuffer());
          const selfieBuffer = Buffer.from(await documentSelfie!.arrayBuffer());

          await writeFile(frontPath, frontBuffer);
          await writeFile(backPath, backBuffer);
          await writeFile(selfiePath, selfieBuffer);

          frontUrl = `/uploads/kyc/${user.id}/${frontFilename}`;
          backUrl = `/uploads/kyc/${user.id}/${backFilename}`;
          selfieUrl = `/uploads/kyc/${user.id}/${selfieFilename}`;

          console.log("KYC Submission - Files saved to filesystem:", {
            userId: user.id,
            frontUrl,
            backUrl,
            selfieUrl,
          });
        } catch (fileError: unknown) {
          console.error("KYC Submission - File system error:", fileError);
          return NextResponse.json(
            {
              error: "Não foi possível salvar os arquivos. Por favor, tente novamente.",
            },
            { status: 500 }
          );
        }
      }
    }

    console.log("KYC Submission - Documents ready for database:", {
      userId: user.id,
      email: user.email,
      frontUrl,
      backUrl,
      selfieUrl,
      storageType: isVercel ? "Vercel Blob" : "Filesystem",
    });

    // Update user with KYC data
    try {
      const updateData: {
        documentType?: DocumentType;
        documentNumber?: string;
        documentFront?: string;
        documentBack?: string;
        documentSelfie?: string;
        contratoSocial?: string;
        cartaoCNPJ?: string;
        cnhSocioControlado?: string;
        kycStatus?: KYCStatus;
        kycSubmittedAt?: Date;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      if (isCNPJ) {
        // CNPJ documents
        if (contratoSocialUrl) updateData.contratoSocial = contratoSocialUrl;
        if (cartaoCNPJUrl) updateData.cartaoCNPJ = cartaoCNPJUrl;
        if (cnhSocioUrl) updateData.cnhSocioControlado = cnhSocioUrl;
        updateData.documentType = "CNH" as DocumentType; // Placeholder for CNPJ
      } else {
        // CPF documents
        if (documentType) {
          updateData.documentType = documentType as DocumentType;
        }
        if (finalDocumentNumber) updateData.documentNumber = finalDocumentNumber;
        if (frontUrl) updateData.documentFront = frontUrl;
        if (backUrl) updateData.documentBack = backUrl;
        if (selfieUrl) updateData.documentSelfie = selfieUrl;
      }

      // If this is the first KYC submission, update the status
      const hasExistingKYC = isCNPJ
        ? (user.contratoSocial || user.cartaoCNPJ || user.cnhSocioControlado)
        : (user.documentFront || user.documentBack || user.documentSelfie);
      
      if (!hasExistingKYC) {
        updateData.kycStatus = "PENDING";
        updateData.kycSubmittedAt = new Date();
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          documentFront: true,
          documentBack: true,
          documentSelfie: true,
          contratoSocial: true,
          cartaoCNPJ: true,
          cnhSocioControlado: true,
          kycStatus: true,
          kycSubmittedAt: true,
        },
      });

      console.log("KYC Submission - User updated successfully:", {
        userId: updatedUser.id,
        email: updatedUser.email,
        isCNPJ,
        documentFront: updatedUser.documentFront,
        documentBack: updatedUser.documentBack,
        documentSelfie: updatedUser.documentSelfie,
        contratoSocial: updatedUser.contratoSocial,
        cartaoCNPJ: updatedUser.cartaoCNPJ,
        cnhSocioControlado: updatedUser.cnhSocioControlado,
        kycStatus: updatedUser.kycStatus,
        kycSubmittedAt: updatedUser.kycSubmittedAt,
      });

      // Verify the update actually saved the documents
      if (isCNPJ) {
        if (
          !updatedUser.contratoSocial ||
          !updatedUser.cartaoCNPJ ||
          !updatedUser.cnhSocioControlado
        ) {
          console.error("KYC Submission - CNPJ documents not saved");
          return NextResponse.json(
            {
              error:
                "Os documentos foram enviados, mas não foram salvos corretamente. Por favor, tente enviar novamente.",
            },
            { status: 500 }
          );
        }
      } else {
        if (
          !updatedUser.documentFront ||
          !updatedUser.documentBack ||
          !updatedUser.documentSelfie
        ) {
          console.error("KYC Submission - Documents not saved");
          return NextResponse.json(
            {
              error:
                "Os documentos foram enviados, mas não foram salvos corretamente. Por favor, tente enviar novamente.",
            },
            { status: 500 }
          );
        }
      }
    } catch (dbError) {
      console.error("KYC Submission - Database update error:", dbError);
      return NextResponse.json(
        {
          error:
            "Não foi possível salvar seus dados. Por favor, verifique sua conexão com a internet e tente novamente. Se o problema persistir, entre em contato com o suporte.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "KYC documents submitted successfully",
      kycStatus: "PENDING",
    });
  } catch (error) {
    console.error("KYC submission error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check for authentication/authorization errors
    if (
      errorMessage.includes("Forbidden") ||
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("403")
    ) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Por favor, certifique-se de estar logado com a mesma conta usada no cadastro e tente novamente. Se o problema persistir, entre em contato com o suporte.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Ocorreu um erro inesperado ao enviar os documentos. Por favor, verifique sua conexão com a internet, certifique-se de que todas as imagens foram selecionadas corretamente e tente novamente. Se o problema persistir, entre em contato com o suporte.",
      },
      { status: 500 }
    );
  }
}

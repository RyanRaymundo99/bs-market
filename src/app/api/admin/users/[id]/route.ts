import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First try with explicit select
    let user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        approvalStatus: true,
        kycStatus: true,
        emailVerified: true,
        phoneVerified: true,
        documentFront: true,
        documentBack: true,
        documentSelfie: true,
        kycSubmittedAt: true,
        kycReviewedAt: true,
        kycRejectionReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // If documents are null but kycSubmittedAt exists, try raw query as fallback
    if (
      user &&
      user.kycSubmittedAt &&
      !user.documentFront &&
      !user.documentBack &&
      !user.documentSelfie
    ) {
      console.warn(
        "⚠️ Documents are null but kycSubmittedAt exists - checking raw database..."
      );

      const rawUser = await prisma.$queryRaw<
        Array<{
          _id: string;
          documentFront: string | null;
          documentBack: string | null;
          documentSelfie: string | null;
        }>
      >`
        SELECT "_id", "documentFront", "documentBack", "documentSelfie"
        FROM "user"
        WHERE "_id" = ${id}
      `;

      if (
        rawUser.length > 0 &&
        (rawUser[0].documentFront ||
          rawUser[0].documentBack ||
          rawUser[0].documentSelfie)
      ) {
        console.log(
          "✅ Found documents in raw query but not in Prisma query!",
          {
            raw: {
              documentFront: rawUser[0].documentFront,
              documentBack: rawUser[0].documentBack,
              documentSelfie: rawUser[0].documentSelfie,
            },
            prisma: {
              documentFront: user.documentFront,
              documentBack: user.documentBack,
              documentSelfie: user.documentSelfie,
            },
          }
        );

        // Use raw data if it has documents
        user = {
          ...user,
          documentFront: rawUser[0].documentFront,
          documentBack: rawUser[0].documentBack,
          documentSelfie: rawUser[0].documentSelfie,
        };
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Debug: Log document fields to help diagnose missing documents
    console.log("Admin user details API - Document fields:", {
      userId: user.id,
      email: user.email,
      kycSubmittedAt: user.kycSubmittedAt,
      documentFront: user.documentFront,
      documentBack: user.documentBack,
      documentSelfie: user.documentSelfie,
      documentFrontType: typeof user.documentFront,
      documentBackType: typeof user.documentBack,
      documentSelfieType: typeof user.documentSelfie,
      documentFrontLength: user.documentFront?.length,
      documentBackLength: user.documentBack?.length,
      documentSelfieLength: user.documentSelfie?.length,
    });

    // Additional check: Query raw database to see if documents exist but aren't being returned
    const rawUser = await prisma.$queryRaw<
      Array<{
        _id: string;
        documentFront: string | null;
        documentBack: string | null;
        documentSelfie: string | null;
      }>
    >`
      SELECT "_id", "documentFront", "documentBack", "documentSelfie"
      FROM "user"
      WHERE "_id" = ${id}
    `;

    if (rawUser.length > 0) {
      console.log("Admin user details API - Raw database query:", {
        userId: rawUser[0]._id,
        documentFront: rawUser[0].documentFront,
        documentBack: rawUser[0].documentBack,
        documentSelfie: rawUser[0].documentSelfie,
        matchesPrisma: {
          front: rawUser[0].documentFront === user.documentFront,
          back: rawUser[0].documentBack === user.documentBack,
          selfie: rawUser[0].documentSelfie === user.documentSelfie,
        },
      });

      // If raw query shows documents but Prisma doesn't, use raw data
      if (
        (rawUser[0].documentFront ||
          rawUser[0].documentBack ||
          rawUser[0].documentSelfie) &&
        !user.documentFront &&
        !user.documentBack &&
        !user.documentSelfie
      ) {
        console.warn(
          "⚠️ Documents exist in database but Prisma query returned null!"
        );
        return NextResponse.json({
          success: true,
          user: {
            ...user,
            documentFront: rawUser[0].documentFront,
            documentBack: rawUser[0].documentBack,
            documentSelfie: rawUser[0].documentSelfie,
          },
        });
      }
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user details for admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

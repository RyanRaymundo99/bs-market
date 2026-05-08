import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateSession } from "@/lib/session";

export async function PATCH(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, phone, cpf } = await request.json();

    // Build update data object
    const updateData: {
      name?: string;
      email?: string;
      phone?: string;
      cpf?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    // Only allow updates if user is PENDING
    if (
      authSession.user.approvalStatus === "PENDING" ||
      authSession.user.kycStatus === "PENDING"
    ) {
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (cpf !== undefined) updateData.cpf = cpf;
    } else {
      // For approved users, only allow name and phone updates
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: authSession.user.id },
      data: updateData,
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
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

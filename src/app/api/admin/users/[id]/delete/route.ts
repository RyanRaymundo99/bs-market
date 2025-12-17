import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function DELETE(
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

    // Check if user exists
    const userToDelete = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting the current admin user
    if (adminSession.userId === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Delete user and all related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete user sessions
      await tx.session.deleteMany({
        where: { userId: id },
      });

      // Delete user transactions
      await tx.transaction.deleteMany({
        where: { userId: id },
      });

      // Delete user deposits
      await tx.deposit.deleteMany({
        where: { userId: id },
      });

      // Delete user withdrawals
      await tx.withdrawal.deleteMany({
        where: { userId: id },
      });

      // Delete user orders
      await tx.order.deleteMany({
        where: { userId: id },
      });

      // Delete user balances
      await tx.balance.deleteMany({
        where: { userId: id },
      });

      // Finally, delete the user
      await tx.user.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

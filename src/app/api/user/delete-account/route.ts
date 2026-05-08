import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { validateSession } from "@/lib/session";

export async function DELETE(request: NextRequest) {
  try {
    const authSession = await validateSession(request);
    if (!authSession) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = authSession.user.id;

    // Check balances before deletion (safety)
    const balances = await prisma.balance.findMany({
      where: { userId },
    });

    const hasSignificantBalance = balances.some((b) => Number(b.amount) > 0.01);
    if (hasSignificantBalance) {
      return NextResponse.json(
        { 
          error: "Não é possível excluir conta com saldo ativo.",
          details: "Por favor, retire seus fundos antes de excluir a conta." 
        },
        { status: 400 }
      );
    }

    // Perform deletion
    // Session, Account, Balance, Deposit, Withdrawal, Order, P2POffer, Transaction,
    // Notification, UserNote, UserTag, CommunicationLog are all onDelete: Cascade
    // so deleting the user will remove all of them.
    await prisma.user.delete({ where: { id: userId } });

    // Clear the cookie
    (await cookies()).set("better-auth.session", "", {
      expires: new Date(0),
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account API error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

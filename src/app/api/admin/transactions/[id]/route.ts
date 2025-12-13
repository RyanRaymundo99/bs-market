import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // TODO: Add admin role check here
    // For now, we'll allow any authenticated user to view transaction details

    const { id } = await params;

    // Get transaction with all related data
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            phone: true,
          },
        },
        deposit: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            externalId: true,
            paymentMethod: true,
            confirmedAt: true,
            createdAt: true,
          },
        },
        withdrawal: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            hash: true,
            protocol: true,
            pixKey: true,
            walletAddress: true,
            network: true,
            fee: true,
            netAmount: true,
            createdAt: true,
          },
        },
        order: {
          select: {
            id: true,
            type: true,
            baseCurrency: true,
            quoteCurrency: true,
            amount: true,
            price: true,
            total: true,
            status: true,
            externalOrderId: true,
            executedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Determine status based on related entity
    let status = "PENDING";
    if (transaction.deposit) {
      status =
        transaction.deposit.status === "CONFIRMED"
          ? "APPROVED"
          : transaction.deposit.status === "REJECTED"
          ? "REJECTED"
          : "PENDING";
    } else if (transaction.withdrawal) {
      status =
        transaction.withdrawal.status === "COMPLETED"
          ? "APPROVED"
          : transaction.withdrawal.status === "FAILED"
          ? "REJECTED"
          : "PENDING";
    } else if (transaction.order) {
      status =
        transaction.order.status === "COMPLETED"
          ? "APPROVED"
          : transaction.order.status === "FAILED"
          ? "REJECTED"
          : "PENDING";
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        balance: Number(transaction.balance),
        description: transaction.description,
        metadata: transaction.metadata,
        status: status,
        createdAt: transaction.createdAt.toISOString(),
        user: transaction.user,
        deposit: transaction.deposit,
        withdrawal: transaction.withdrawal,
        order: transaction.order,
      },
    });
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction details" },
      { status: 500 }
    );
  }
}

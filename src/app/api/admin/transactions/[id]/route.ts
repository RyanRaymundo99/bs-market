import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate admin session
    const adminSession = await validateAdminSession(request);

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Orphan order: id is "order_<orderId>" (order with no linked transaction)
    if (id.startsWith("order_")) {
      const orderId = id.slice("order_".length);
      const order = await prisma.order.findUnique({
        where: { id: orderId },
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
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }

      const amount = Number(order.amount);
      const total = Number(order.total);
      const status =
        order.status === "COMPLETED"
          ? "APPROVED"
          : order.status === "FAILED"
            ? "REJECTED"
            : order.status === "CANCELLED"
              ? "CANCELLED"
              : "PENDING";

      return NextResponse.json({
        success: true,
        transaction: {
          id: `order_${order.id}`,
          type: "BUY_CRYPTO",
          amount,
          currency: "USDT",
          balance: 0,
          description: "Compra USDT (ordem sem transação vinculada)",
          metadata: { _orphanOrder: true, orderId: order.id },
          status,
          createdAt: order.createdAt.toISOString(),
          user: order.user,
          deposit: null,
          withdrawal: null,
          order: {
            id: order.id,
            type: order.type,
            baseCurrency: order.baseCurrency,
            quoteCurrency: order.quoteCurrency,
            amount: order.amount,
            price: order.price,
            total: order.total,
            status: order.status,
            externalOrderId: order.externalOrderId,
            executedAt: order.executedAt,
            createdAt: order.createdAt,
          },
        },
      });
    }

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

    // Fallback: find by webhook/external id (deposit.externalId or order.externalOrderId = Mercado Pago transaction_id)
    if (!transaction) {
      const depositByExternal = await prisma.deposit.findFirst({
        where: { externalId: id },
        select: { transactionId: true },
      });
      if (depositByExternal?.transactionId) {
        const tx = await prisma.transaction.findUnique({
          where: { id: depositByExternal.transactionId },
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
        if (tx) {
          const status =
            tx.deposit?.status === "CONFIRMED"
              ? "APPROVED"
              : tx.deposit?.status === "REJECTED"
                ? "REJECTED"
                : "PENDING";
          return NextResponse.json({
            success: true,
            transaction: {
              id: tx.id,
              type: tx.type,
              amount: Number(tx.amount),
              currency: tx.currency,
              balance: Number(tx.balance),
              description: tx.description,
              metadata: tx.metadata,
              status,
              createdAt: tx.createdAt.toISOString(),
              user: tx.user,
              deposit: tx.deposit,
              withdrawal: tx.withdrawal,
              order: tx.order,
            },
          });
        }
      }
      const orderByExternal = await prisma.order.findFirst({
        where: {
          externalOrderId: id,
          transactionId: { not: null },
        },
        select: { transactionId: true },
      });
      if (orderByExternal?.transactionId) {
        const tx = await prisma.transaction.findUnique({
          where: { id: orderByExternal.transactionId },
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
        if (tx) {
          const status =
            tx.order?.status === "COMPLETED"
              ? "APPROVED"
              : tx.order?.status === "FAILED"
                ? "REJECTED"
                : "PENDING";
          return NextResponse.json({
            success: true,
            transaction: {
              id: tx.id,
              type: tx.type,
              amount: Number(tx.amount),
              currency: tx.currency,
              balance: Number(tx.balance),
              description: tx.description,
              metadata: tx.metadata,
              status,
              createdAt: tx.createdAt.toISOString(),
              user: tx.user,
              deposit: tx.deposit,
              withdrawal: tx.withdrawal,
              order: tx.order,
            },
          });
        }
      }
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

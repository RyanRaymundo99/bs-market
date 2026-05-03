import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import { getAuditLogIpAndAgent, writeAuditLog } from "@/lib/audit-log";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";

/** GET /api/admin/transactions/order/[orderId] - Fetch orphan order details (order with no linked transaction). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminSession = await validateAdminSession(_request);
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const amount = Number(order.amount);
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
  } catch (error) {
    console.error("Error fetching order details:", error);
    return NextResponse.json(
      { error: "Failed to fetch order details" },
      { status: 500 }
    );
  }
}

/** POST /api/admin/transactions/order/[orderId] - Manually approve or reject an orphan PIX order. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminSession = await validateAdminSession(request);
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: "approve" | "reject";
      reason?: string;
    };
    const action = body.action;
    const reason = body.reason?.trim();

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be approve or reject" },
        { status: 400 }
      );
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        { error: "Motivo da rejeição é obrigatório" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (action === "approve") {
        if (order.status === "COMPLETED") {
          return {
            message: "Order is already approved",
            transactionId: order.transactionId,
          };
        }

        if (order.status === "FAILED" || order.status === "CANCELLED") {
          throw new Error(`Cannot approve order with status ${order.status}`);
        }

        const existingTransaction = await tx.transaction.findFirst({
          where: {
            userId: order.userId,
            type: "BUY_CRYPTO",
            currency: "USDT",
            OR: [
              { id: order.transactionId ?? undefined },
              { metadata: { path: ["orderId"], equals: order.id } },
            ],
          },
        });

        if (existingTransaction) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "COMPLETED",
              executedAt: order.executedAt ?? new Date(),
              transactionId: existingTransaction.id,
            },
          });

          return {
            message: "Order already had a linked transaction",
            transactionId: existingTransaction.id,
          };
        }

        const usdtAmount = new Decimal(order.amount);
        const totalBRL = new Decimal(order.total);

        await ledgerService.updateBalance(
          order.userId,
          "USDT",
          usdtAmount,
          "ADD",
          tx
        );

        const transaction = await ledgerService.recordTransaction(
          {
            userId: order.userId,
            type: "BUY_CRYPTO",
            amount: usdtAmount,
            currency: "USDT",
            description: `USDT purchase via PIX manually approved - ${usdtAmount.toString()} USDT`,
            metadata: {
              orderId: order.id,
              transactionId: order.externalOrderId,
              amountBRL: totalBRL.toNumber(),
              amountUSDT: usdtAmount.toNumber(),
              exchangeRate: totalBRL.div(usdtAmount).toNumber(),
              source: "manual_admin_approval",
              approvedAt: new Date().toISOString(),
              approvedBy: adminSession.user.email,
            },
          },
          tx
        );

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "COMPLETED",
            executedAt: new Date(),
            transactionId: transaction.id,
          },
        });

        await tx.notification.create({
          data: {
            userId: order.userId,
            type: "receipt_ready",
            title: "Pagamento confirmado! Recibo disponível.",
            message: `Seu depósito de R$ ${totalBRL.toNumber().toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} foi confirmado. Você recebeu ${usdtAmount.toNumber().toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })} USDT.`,
            metadata: {
              orderId: order.id,
              transactionId: transaction.id,
              amountBRL: totalBRL.toNumber(),
              amountUSDT: usdtAmount.toNumber(),
              approvedBy: adminSession.user.email,
            },
          },
        });

        return {
          message: "Order approved successfully",
          transactionId: transaction.id,
        };
      }

      if (order.status === "FAILED" || order.status === "CANCELLED") {
        return {
          message: "Order is already rejected",
          transactionId: order.transactionId,
        };
      }

      if (order.status === "COMPLETED") {
        throw new Error("Cannot reject an approved order");
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "FAILED",
          executedAt: null,
        },
      });

      await tx.notification.create({
        data: {
          userId: order.userId,
          type: "deposit_rejected",
          title: "Depósito não aprovado",
          message: `Seu depósito de R$ ${Number(order.total).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} não foi aprovado. Motivo: ${reason}.`,
          metadata: {
            orderId: order.id,
            reason,
            rejectedAt: new Date().toISOString(),
            rejectedBy: adminSession.user.email,
          },
        },
      });

      return {
        message: "Order rejected successfully",
        transactionId: order.transactionId,
      };
    });

    const { ipAddress, userAgent } = getAuditLogIpAndAgent(request);
    await writeAuditLog({
      adminId: adminSession.userId,
      adminEmail: adminSession.user.email,
      action:
        action === "approve" ? "order_manual_approve" : "order_manual_reject",
      resourceType: "order",
      resourceId: orderId,
      newValue: { action, reason },
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      transactionId: result.transactionId,
    });
  } catch (error) {
    console.error("Error reviewing order:", error);
    return NextResponse.json(
      {
        error: "Failed to review order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

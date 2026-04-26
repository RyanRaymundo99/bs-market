import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import { writeAuditLog, getAuditLogIpAndAgent } from "@/lib/audit-log";

export async function POST(
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
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty
    }
    const { hash: providedHash } = body as { hash?: string };

    // Get transaction with all related data
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        deposit: true,
        withdrawal: true,
        order: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Update based on transaction type
    if (transaction.deposit) {
      // Use a transaction to ensure both deposit, balance and transaction records are updated
      await prisma.$transaction(async (tx) => {
        // 1. Update deposit status to CONFIRMED
        const updatedDeposit = await tx.deposit.update({
          where: { id: transaction.deposit!.id },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
          include: { user: true }
        });

        // 2. Update user balance
        const balance = await tx.balance.upsert({
          where: { 
            userId_currency: { 
              userId: transaction.userId, 
              currency: transaction.currency 
            } 
          },
          update: {
            amount: { increment: transaction.amount }
          },
          create: {
            userId: transaction.userId,
            currency: transaction.currency,
            amount: transaction.amount
          }
        });

        // 3. Update transaction record
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "COMPLETED",
            balance: balance.amount, // Updated snapshot
            description: transaction.description || `Depósito de ${transaction.amount} ${transaction.currency} confirmado`,
          },
        });

        // 4. Send receipt email (non-blocking notification)
        // We'll do this after the transaction to be safe, or just call it from here
        // For simplicity and speed, we'll import and call it
        try {
          const { sendPurchaseReceipt } = await import("@/lib/receipt-email");
          // Convert Decimal to number for the email helper
          const amountNum = Number(transaction.amount);
          
          await sendPurchaseReceipt({
            userName: updatedDeposit.user.name || "Cliente",
            userEmail: updatedDeposit.user.email,
            amountBRL: 0, // Not applicable for crypto
            amountUSDT: amountNum,
            exchangeRate: 0, // Not applicable
            fee: 0,
            totalPaid: amountNum,
            transactionId: transaction.id,
            date: new Date(),
            paymentMethod: "USDT",
          });
        } catch (emailErr) {
          console.error("Failed to send receipt email:", emailErr);
        }
      });
    } else if (transaction.withdrawal) {
      // Update withdrawal status to COMPLETED
      await prisma.withdrawal.update({
        where: { id: transaction.withdrawal.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          hash: providedHash || transaction.withdrawal.hash,
        },
      });
    } else if (transaction.order) {
      // Update order status to COMPLETED
      await prisma.order.update({
        where: { id: transaction.order.id },
        data: {
          status: "COMPLETED",
          executedAt: new Date(),
        },
      });
    }
 else if (transaction.type === "WITHDRAWAL") {
      // Try multiple methods to find the withdrawal
      let withdrawal = null;
      
      // Method 1: Try direct relation (if transaction.withdrawal exists)
      if (transaction.withdrawal) {
        withdrawal = transaction.withdrawal;
      } else {
        // Method 2: Try to find by transactionId (reverse lookup)
        withdrawal = await prisma.withdrawal.findFirst({
          where: { transactionId: transaction.id },
        });
      }
      
      // Method 3: Try to find by metadata withdrawalId
      if (!withdrawal) {
        const metadata = transaction.metadata as Record<string, unknown> | null;
        const withdrawalId = metadata?.withdrawalId as string | undefined;
        
        if (withdrawalId) {
          withdrawal = await prisma.withdrawal.findUnique({
            where: { id: withdrawalId },
          });
        }
      }
      
      // Method 4: Try to find by matching user, amount, currency, and date (within 5 minutes)
      if (!withdrawal) {
        const fiveMinutesAgo = new Date(transaction.createdAt.getTime() - 5 * 60 * 1000);
        const fiveMinutesLater = new Date(transaction.createdAt.getTime() + 5 * 60 * 1000);
        
        withdrawal = await prisma.withdrawal.findFirst({
          where: {
            userId: transaction.userId,
            amount: transaction.amount,
            currency: transaction.currency,
            createdAt: {
              gte: fiveMinutesAgo,
              lte: fiveMinutesLater,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
      }
      
      if (withdrawal) {
        // Update withdrawal status to COMPLETED
        await prisma.withdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: "COMPLETED",
            processedAt: new Date(),
            // Also link the transaction if not already linked
            transactionId: withdrawal.transactionId || transaction.id,
            hash: providedHash || withdrawal.hash,
          },
        });
      } else {
        // Withdrawal record doesn't exist - create it based on transaction data
        // Extract information from transaction description
        const description = transaction.description || "";
        
        // Try to determine payment method and type from description
        let paymentMethod = "UNKNOWN";
        let withdrawalType: string | null = null;
        let walletAddress: string | null = null;
        let network: string | null = null;
        const hash: string | null = null;
        let pixKey: string | null = null;
        const protocol: string | null = null;
        
        // Parse description for USDT withdrawals
        if (description.includes("USDT withdrawal") || description.includes("wallet")) {
          paymentMethod = "USDT";
          withdrawalType = "USDT";
          // Try to extract wallet address and network from description
          const walletMatch = description.match(/to\s+([A-Za-z0-9]+)/);
          const networkMatch = description.match(/\(([A-Z0-9]+)\)/);
          if (walletMatch) walletAddress = walletMatch[1];
          if (networkMatch) network = networkMatch[1];
        } else if (description.includes("PIX") || description.includes("pix")) {
          paymentMethod = "PIX";
          withdrawalType = "PIX";
          // Try to extract PIX key from description
          const pixMatch = description.match(/to\s+([^\s]+)/);
          if (pixMatch) pixKey = pixMatch[1];
        }
        
        // Create withdrawal record
        const newWithdrawal = await prisma.withdrawal.create({
          data: {
            userId: transaction.userId,
            amount: Math.abs(Number(transaction.amount)), // Use absolute value
            currency: transaction.currency,
            status: "COMPLETED",
            paymentMethod: paymentMethod,
            type: withdrawalType,
            walletAddress: walletAddress,
            network: network,
            hash: providedHash || hash,
            pixKey: pixKey,
            protocol: protocol,
            transactionId: transaction.id,
            processedAt: new Date(),
            createdAt: transaction.createdAt,
            updatedAt: new Date(),
          },
        });
        
        console.log(`Created missing withdrawal record ${newWithdrawal.id} for transaction ${transaction.id}`);
      }
    } else {
      return NextResponse.json(
        { error: `Transaction type not supported for manual completion. Type: ${transaction.type}` },
        { status: 400 }
      );
    }

    const { ipAddress, userAgent } = getAuditLogIpAndAgent(request);
    await writeAuditLog({
      adminId: adminSession.userId,
      adminEmail: adminSession.user.email,
      action: "transaction_mark_completed",
      resourceType: "transaction",
      resourceId: transaction.id,
      newValue: { type: transaction.type },
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Transaction marked as completed successfully",
      transactionId: transaction.id,
    });
  } catch (error) {
    console.error("Error marking transaction as completed:", error);
    return NextResponse.json(
      {
        error: "Failed to mark transaction as completed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

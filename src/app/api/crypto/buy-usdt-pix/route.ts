import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { paymentService, calculateFeeBreakdown } from "@/lib/payment";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";
import { sendPurchaseReceipt } from "@/lib/receipt-email";
import { getMoneyControls } from "@/lib/money-controls";
import {
  getAdminAlertSettings,
  sendAdminAlertToAll,
} from "@/lib/admin-alert-email";

export async function POST(request: NextRequest) {
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

    const user = session.user;

    // Check if user is approved
    if (user.approvalStatus === "REJECTED") {
      return NextResponse.json(
        { error: "Sua conta foi rejeitada. Entre em contato com o suporte." },
        { status: 403 }
      );
    }

    // Check if user is pending
    if (user.approvalStatus === "PENDING") {
      return NextResponse.json(
        {
          error:
            "Sua conta está pendente de aprovação. Complete seu cadastro e aguarde a aprovação.",
        },
        { status: 403 }
      );
    }

    // Check if KYC is pending
    if (user.kycStatus === "PENDING") {
      return NextResponse.json(
        {
          error:
            "Sua verificação KYC está pendente. Complete o upload dos documentos KYC para realizar depósitos.",
        },
        { status: 403 }
      );
    }

    // Admin-controlled switch and limits
    const moneyControls = await getMoneyControls();
    if (moneyControls.depositsDisabled) {
      return NextResponse.json(
        {
          error: moneyControls.depositsDisabledMessage,
          code: "DEPOSITS_DISABLED",
        },
        { status: 503 }
      );
    }
    const maxDepositUsdt = moneyControls.maxDepositUsdt ?? 1000000;

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { amount, usdt_amount } = requestBody;

    // Validate input
    if (!amount || amount <= 0 || isNaN(Number(amount))) {
      return NextResponse.json(
        { error: "Amount must be a valid number greater than 0" },
        { status: 400 }
      );
    }

    if (!usdt_amount || usdt_amount <= 0 || isNaN(Number(usdt_amount))) {
      return NextResponse.json(
        { error: "USDT amount must be a valid number greater than 0" },
        { status: 400 }
      );
    }

    // Ensure amounts are numbers and properly formatted
    let amountNum = Number(amount);
    let usdtAmountNum = Number(usdt_amount);

    // Validate division won't cause issues
    if (usdtAmountNum === 0 || !isFinite(amountNum / usdtAmountNum)) {
      return NextResponse.json(
        { error: "Invalid amount calculation" },
        { status: 400 }
      );
    }

    // Round amounts to appropriate decimal places to avoid floating point precision issues
    // BRL amount must have exactly 2 decimal places
    amountNum = Math.round(amountNum * 100) / 100;
    // USDT amount can have up to 8 decimal places, but we'll round to 4 for API compatibility
    usdtAmountNum = Math.round(usdtAmountNum * 10000) / 10000;

    // Validate minimum amounts
    if (amountNum < 0.01) {
      return NextResponse.json(
        { error: "Amount must be at least R$ 0,01" },
        { status: 400 }
      );
    }

    // Hard limit: 2000 USDT for online purchases
    const ONLINE_MAX_USDT = 2000;
    if (usdtAmountNum > ONLINE_MAX_USDT) {
      const whatsappNumber =
        process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511984284867";
      return NextResponse.json(
        {
          error: `O limite máximo para compras online é ${ONLINE_MAX_USDT.toLocaleString(
            "pt-BR"
          )} USDT. Para valores maiores, entre em contato conosco via WhatsApp.`,
          code: "ONLINE_LIMIT_EXCEEDED",
          whatsappUrl: `https://wa.me/${whatsappNumber}`,
        },
        { status: 400 }
      );
    }

    // Also check against admin-configured maxDepositUsdt (for lower limits)
    if (usdtAmountNum > maxDepositUsdt) {
      const whatsappNumber =
        process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511984284867";
      return NextResponse.json(
        {
          error: `O depósito máximo é ${maxDepositUsdt} USDT. Para valores maiores, entre em contato conosco via WhatsApp.`,
          code: "DEPOSIT_LIMIT_EXCEEDED",
          whatsappUrl: `https://wa.me/${whatsappNumber}`,
        },
        { status: 400 }
      );
    }

    if (usdtAmountNum < 0.0001) {
      return NextResponse.json(
        { error: "USDT amount must be at least 0.0001 USDT" },
        { status: 400 }
      );
    }

    // Log the amounts being processed
    console.log("Processing purchase with amounts:", {
      originalAmount: amount,
      roundedAmount: amountNum,
      originalUsdtAmount: usdt_amount,
      roundedUsdtAmount: usdtAmountNum,
      amountString: amountNum.toFixed(2),
      usdtAmountString: usdtAmountNum.toFixed(4),
      provider: paymentService.name,
    });

    // Notify admin email on deposit attempts over 500 USDT (non-blocking)
    if (usdtAmountNum > 500) {
      getAdminAlertSettings()
        .then((settings) => {
          if (settings.notifyDepositOver500 && settings.emails?.length) {
            return sendAdminAlertToAll(
              settings,
              `Deposit attempt over 500 USDT: ${usdtAmountNum.toFixed(2)} USDT`,
              `User ${user.email} (${
                user.name
              }) attempted a deposit of ${usdtAmountNum.toFixed(
                2
              )} USDT (R$ ${amountNum.toFixed(2)}).`
            );
          }
        })
        .catch((err) => console.error("Admin deposit alert:", err));
    }

    // Validate user has required information
    if (!user.name || !user.email) {
      return NextResponse.json(
        { error: "User name and email are required" },
        { status: 400 }
      );
    }

    // Get user CPF/document
    const document = user.cpf || user.documentNumber || "";
    if (!document) {
      return NextResponse.json(
        { error: "User document (CPF) is required for purchase" },
        { status: 400 }
      );
    }

    // Generate external ID for tracking
    const externalId = `purchase_${user.id}_${Date.now()}`;

    // Create order record first
    // Set externalOrderId to externalId immediately to prevent race condition
    // If webhook arrives before provider response, it can still match by external_id
    let order;
    try {
      order = await prisma.order.create({
        data: {
          userId: user.id,
          type: "BUY",
          baseCurrency: "USDT",
          quoteCurrency: "BRL",
          amount: new Decimal(usdtAmountNum),
          price: new Decimal(amountNum / usdtAmountNum),
          total: new Decimal(amountNum),
          status: "PENDING",
          externalOrderId: externalId,
        },
      });
    } catch (dbError) {
      console.error("Failed to create order in database:", dbError);
      if (dbError instanceof Error) {
        console.error("Database error details:", dbError.message);
      }
      return NextResponse.json(
        { error: "Failed to create order. Please try again." },
        { status: 500 }
      );
    }

    try {
      // Build webhook callback URL
      const callbackUrl =
        process.env.PAYMENT_WEBHOOK_URL ||
        `${
          process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"
        }/api/webhooks/nubank`;

      // Create USDT purchase via active payment provider
      const paymentResponse = await paymentService.createUSDTPurchase({
        amount: amountNum,
        usdtAmount: usdtAmountNum,
        customer: {
          name: user.name,
          document: document,
          email: user.email,
        },
        externalId: externalId,
        callbackUrl: callbackUrl,
      });

      const transactionId = paymentResponse.transactionId;
      const responseStatus = paymentResponse.status;
      const isCompleted =
        responseStatus === "completed" || responseStatus === "COMPLETED";
      const pixCode = paymentResponse.pixCode;
      const qrCodeUrl = paymentResponse.qrCodeUrl;
      const finalTransactionId = transactionId || externalId;

      // Update order with provider transaction ID
      await prisma.order.update({
        where: { id: order.id },
        data: {
          externalOrderId: finalTransactionId,
          status: isCompleted ? "COMPLETED" : "PENDING",
          executedAt: isCompleted ? new Date() : null,
        },
      });

      // Create deposit record for tracking
      // Calculate fee breakdown using the canonical fee calculation
      const feeBreakdown = calculateFeeBreakdown(amountNum);

      let deposit;
      try {
        deposit = await prisma.deposit.create({
          data: {
            userId: user.id,
            amount: new Decimal(amountNum),
            fee: new Decimal(feeBreakdown.platformCommission),
            status: isCompleted ? "CONFIRMED" : "PENDING",
            paymentMethod: "PIX",
            externalId: externalId,
            pixQrCode: pixCode,
            pixQrCodeBase64: paymentResponse.qrCodeBase64 || null,
          },
        });
      } catch (dbError) {
        console.error("Failed to create deposit in database:", dbError);
        if (dbError instanceof Error) {
          console.error("Database error details:", dbError.message);
        }
        await prisma.order
          .update({
            where: { id: order.id },
            data: { status: "FAILED" },
          })
          .catch(() => {});
        return NextResponse.json(
          { error: "Failed to create deposit record. Please try again." },
          { status: 500 }
        );
      }

      // If payment is completed, update user balance immediately
      if (isCompleted) {
        try {
          await ledgerService.updateBalance(
            user.id,
            "USDT",
            new Decimal(usdtAmountNum),
            "ADD"
          );
        } catch (balanceError) {
          console.error("Failed to update user balance:", balanceError);
        }

        let transaction;
        try {
          transaction = await ledgerService.createTransaction({
            userId: user.id,
            type: "BUY_CRYPTO",
            amount: new Decimal(usdtAmountNum),
            currency: "USDT",
            description: `USDT purchase via PIX - ${usdtAmountNum} USDT`,
            metadata: {
              orderId: order.id,
              depositId: deposit.id,
              transactionId: transactionId,
              amountBRL: amountNum,
              amountUSDT: usdtAmountNum,
              exchangeRate: amountNum / usdtAmountNum,
              provider: paymentService.name,
            },
          });
        } catch (transactionError) {
          console.error(
            "Failed to create transaction record:",
            transactionError
          );
          transaction = null;
        }

        if (transaction) {
          try {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                transactionId: transaction.id,
              },
            });
          } catch (updateError) {
            console.error("Failed to link transaction to order:", updateError);
          }
        }

        console.log(
          `User ${user.id} balance credited with ${usdtAmountNum} USDT`
        );

        // Send purchase receipt email (non-blocking)
        if (user.email && user.name && transaction) {
          sendPurchaseReceipt({
            userName: user.name,
            userEmail: user.email,
            amountBRL: feeBreakdown.baseAmount,
            amountUSDT: usdtAmountNum,
            exchangeRate: amountNum / usdtAmountNum,
            fee: feeBreakdown.totalFee,
            totalPaid: amountNum,
            transactionId:
              typeof transactionId === "string" ? transactionId : externalId,
            date: new Date(),
            paymentMethod: "PIX",
          })
            .then(async (result) => {
              if (transaction) {
                const metadata =
                  (transaction.metadata as Record<string, unknown>) || {};
                const receiptHistory =
                  (metadata.receiptHistory as Array<{
                    sentAt: string;
                    success: boolean;
                    error?: string;
                  }>) || [];

                receiptHistory.push({
                  sentAt: new Date().toISOString(),
                  success: result.success,
                  ...(result.message && !result.success
                    ? { error: result.message }
                    : {}),
                });

                await prisma.transaction.update({
                  where: { id: transaction.id },
                  data: {
                    metadata: {
                      ...metadata,
                      receiptHistory,
                      lastReceiptSentAt: new Date().toISOString(),
                      lastReceiptSuccess: result.success,
                    },
                  },
                });
              }
            })
            .catch((error) => {
              console.error("Failed to send purchase receipt email:", error);
            });
        }
      }

      // Return response in canonical format
      return NextResponse.json({
        success: true,
        message: "USDT purchase request created successfully",
        data: {
          transaction_id: finalTransactionId,
          transactionId: finalTransactionId,
          external_id: externalId,
          status: responseStatus,
          amount_brl: amountNum,
          amount_usdt: usdtAmountNum,
          exchange_rate: amountNum / usdtAmountNum,
          // PIX code fields
          qrCode: pixCode,
          pixKey: pixCode,
          qrCodeUrl: qrCodeUrl,
          // Nested structure for backward compatibility
          pix_data: {
            qr_code: pixCode,
            qrCode: pixCode,
            qr_code_base64: paymentResponse.qrCodeBase64 || null,
            qr_code_url: qrCodeUrl,
            qrCodeUrl: qrCodeUrl,
            transaction_id: finalTransactionId,
          },
          // Internal fields
          order_id: order.id,
          deposit_id: deposit.id,
          provider: paymentService.name,
        },
      });
    } catch (error: unknown) {
      console.error("Payment provider purchase error:", error);

      // Only mark as FAILED if it's a real error (not temporary)
      let shouldMarkAsFailed = true;
      let errorMessage = "Failed to process USDT purchase";
      let errorDetails: unknown = undefined;
      let statusCode = 500;

      if (error instanceof Error) {
        errorMessage = error.message;

        // Don't mark as failed for network/timeout errors — keep as PENDING
        if (
          error.message.includes("timeout") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ENOTFOUND") ||
          error.message.includes("network") ||
          error.message.includes("temporarily unavailable")
        ) {
          shouldMarkAsFailed = false;
        }
      } else if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: unknown; status?: number };
          code?: string;
        };

        if (axiosError.response?.status && axiosError.response.status >= 500) {
          shouldMarkAsFailed = false;
        }

        if (
          axiosError.code === "ECONNREFUSED" ||
          axiosError.code === "ENOTFOUND" ||
          axiosError.code === "ETIMEDOUT"
        ) {
          shouldMarkAsFailed = false;
        }

        if (axiosError.response?.data) {
          errorDetails = axiosError.response.data;
          if (
            axiosError.response.data &&
            typeof axiosError.response.data === "object" &&
            "error" in axiosError.response.data &&
            axiosError.response.data.error &&
            typeof axiosError.response.data.error === "object" &&
            "message" in axiosError.response.data.error &&
            typeof axiosError.response.data.error.message === "string"
          ) {
            errorMessage = axiosError.response.data.error.message;
          }
        }
        if (axiosError.response?.status) {
          statusCode = axiosError.response.status;
        }
      }

      if (shouldMarkAsFailed) {
        console.error("Marking order as FAILED due to error");
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "FAILED",
          },
        });
      }

      return NextResponse.json(
        {
          error: errorMessage,
          ...(errorDetails ? { details: errorDetails } : {}),
          orderId: order.id,
          orderStatus: shouldMarkAsFailed ? "FAILED" : "PENDING",
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error("USDT purchase error:", error);

    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error type:", typeof error);
      console.error("Error value:", JSON.stringify(error, null, 2));
    }

    let errorMessage = "Failed to process USDT purchase";
    let statusCode = 500;

    if (error instanceof Error) {
      if (
        error.message.includes("PrismaClient") ||
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        errorMessage = "Database connection error. Please try again later.";
      } else if (
        error.message.includes("credentials") ||
        error.message.includes("CLIENT_ID") ||
        error.message.includes("CLIENT_SECRET") ||
        error.message.includes("authentication failed")
      ) {
        errorMessage =
          "Payment service configuration error. Please contact support.";
        console.error("Payment provider configuration error detected");
      } else if (
        error.message.includes("Invalid") ||
        error.message.includes("required") ||
        error.message.includes("must be")
      ) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (
        error.message &&
        error.message !== "Failed to process USDT purchase"
      ) {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        ...(process.env.NODE_ENV === "development" && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: statusCode }
    );
  }
}

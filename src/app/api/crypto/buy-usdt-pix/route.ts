import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nutzPayService } from "@/lib/nutzpay";
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
    // BRL amount must have exactly 2 decimal places for Mercado Pago
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

    // Enforce maximum deposit; above limit user must contact via WhatsApp
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

    // Generate external ID for NutzPay
    const externalId = `purchase_${user.id}_${Date.now()}`;

    // Create order record first
    // IMPORTANT: Set externalOrderId to externalId immediately to prevent race condition
    // If webhook arrives before NutzPay response, it can still match by external_id
    // We'll update it with the real transactionId after NutzPay responds
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
          externalOrderId: externalId, // Set immediately to prevent webhook race condition
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
      // Call NutzPay API to create USDT purchase
      // Use NUTZPAY_WEBHOOK_URL if set (for testing with webhook.site), otherwise use default
      const callbackUrl =
        process.env.NUTZPAY_WEBHOOK_URL ||
        `${
          process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"
        }/api/webhooks/nutzpay`;

      const nutzPayResponse = await nutzPayService.createUSDTPurchase({
        amount: amountNum,
        usdt_amount: usdtAmountNum,
        customer: {
          name: user.name,
          document: document,
          email: user.email,
        },
        external_id: externalId,
        callback_url: callbackUrl,
      });

      // NutzPay can return API Playground style: { status: 200, data: { transactionId, qrCode, pixKey, ... } }
      // or flat: { transactionId, qrCode, ... }. Use .data when present so we never expose provider/metadata to client.
      const raw = nutzPayResponse.data || nutzPayResponse;
      const responseData =
        raw && typeof raw === "object" && "data" in raw && raw.data
          ? (raw.data as Record<string, unknown>)
          : (raw as Record<string, unknown>);

      const transactionId =
        (responseData.transaction_id as string) ||
        (responseData.transactionId as string) ||
        (responseData.pix_data as Record<string, unknown>)?.transaction_id ||
        (responseData.providerTransactionId as string) ||
        null;

      const responseStatus = (responseData.status as string) || "pending";
      const isCompleted =
        responseStatus === "completed" || responseStatus === "COMPLETED";

      const pixData = responseData.pix_data as
        | Record<string, unknown>
        | undefined;
      const pixCode =
        (pixData?.qr_code as string) ||
        (pixData?.qrCode as string) ||
        (pixData?.pix_key as string) ||
        (pixData?.pixKey as string) ||
        (responseData.qrCode as string) ||
        (responseData.pixKey as string) ||
        (responseData.qr_code as string) ||
        (responseData.pix_key as string) ||
        (responseData.code as string) ||
        null;

      const qrCodeUrl =
        (responseData.qrCodeUrl as string) ||
        (responseData.qr_code_url as string) ||
        (responseData.qrCodeText as string) ||
        null;

      const finalTransactionId = transactionId || externalId;

      // Update order with NutzPay transaction ID (or externalId as fallback)
      // Note: externalOrderId was already set to externalId when order was created
      // If webhook arrived before this point, it may have already updated externalOrderId with transaction_id
      // This update ensures we have the correct transaction_id from NutzPay response
      await prisma.order.update({
        where: { id: order.id },
        data: {
          externalOrderId: finalTransactionId, // Update with real transactionId from NutzPay (or keep externalId if not available)
          status: isCompleted ? "COMPLETED" : "PENDING",
          executedAt: isCompleted ? new Date() : null,
        },
      });

      // Create deposit record for tracking
      // Store our original externalId in deposit.externalId for webhook matching
      // Store transaction ID in order.externalOrderId for status checking
      // Calculate commission: User pays 3% total, but our commission is 1.8% of the deposit amount
      // amount is the total paid (base + 3% fee), so base = amount / 1.03
      // Our commission is 1.8% of the base amount
      const baseAmount = amountNum / 1.03; // Base amount before fee
      const platformCommission = baseAmount * 0.018; // 1.8% commission for us

      let deposit;
      try {
        deposit = await prisma.deposit.create({
          data: {
            userId: user.id,
            amount: new Decimal(amountNum),
            fee: new Decimal(platformCommission), // Store our 1.8% commission
            status: isCompleted ? "CONFIRMED" : "PENDING",
            paymentMethod: "PIX",
            externalId: externalId, // Store our original externalId for webhook matching
            pixQrCode: pixCode,
            pixQrCodeBase64: (pixData?.qr_code_base64 as string) || null,
          },
        });
      } catch (dbError) {
        console.error("Failed to create deposit in database:", dbError);
        if (dbError instanceof Error) {
          console.error("Database error details:", dbError.message);
        }
        // Order was already created, so we need to handle this gracefully
        // Mark order as failed since we couldn't create the deposit
        await prisma.order
          .update({
            where: { id: order.id },
            data: { status: "FAILED" },
          })
          .catch(() => {
            // Ignore errors when updating order status
          });
        return NextResponse.json(
          { error: "Failed to create deposit record. Please try again." },
          { status: 500 }
        );
      }

      // If payment is completed, update user balance immediately
      if (isCompleted) {
        // Update USDT balance (add the USDT amount)
        try {
          await ledgerService.updateBalance(
            user.id,
            "USDT",
            new Decimal(usdtAmountNum),
            "ADD"
          );
        } catch (balanceError) {
          console.error("Failed to update user balance:", balanceError);
          // Continue anyway - transaction will be created but balance update failed
        }

        // Create transaction record for USDT credit
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
            },
          });
        } catch (transactionError) {
          console.error(
            "Failed to create transaction record:",
            transactionError
          );
          // Continue anyway - order and deposit are created
          transaction = null;
        }

        // Link transaction to order if transaction was created
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
            // Non-critical error, continue
          }
        }

        console.log(
          `User ${user.id} balance credited with ${usdtAmountNum} USDT`
        );

        // Send purchase receipt email (don't await to avoid blocking response)
        if (user.email && user.name && transaction) {
          const fee = (amountNum * 0.03) / 1.03; // 3% fee calculation
          const baseAmount = amountNum - fee;
          sendPurchaseReceipt({
            userName: user.name,
            userEmail: user.email,
            amountBRL: baseAmount,
            amountUSDT: usdtAmountNum,
            exchangeRate: amountNum / usdtAmountNum,
            fee: fee,
            totalPaid: amountNum,
            transactionId:
              typeof transactionId === "string" ? transactionId : externalId,
            date: new Date(),
            paymentMethod: "PIX",
          })
            .then(async (result) => {
              // Track receipt in transaction metadata
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
              // Don't fail the request if email fails
            });
        }
      }

      // Return response matching NutzPay structure + our additional fields
      return NextResponse.json({
        success: true,
        message: "USDT purchase request created successfully",
        data: {
          // NutzPay response fields (direct mapping)
          transaction_id: finalTransactionId,
          transactionId: finalTransactionId, // Also include camelCase for compatibility
          external_id: externalId,
          status: responseStatus,
          amount_brl: amountNum,
          amount_usdt: usdtAmountNum,
          exchange_rate: amountNum / usdtAmountNum,
          // PIX code fields - match NutzPay API structure
          qrCode: pixCode, // Direct field from NutzPay
          pixKey: pixCode, // Also include as pixKey (same value)
          qrCodeUrl: qrCodeUrl, // QR code image URL
          // Nested structure for backward compatibility
          pix_data: {
            qr_code: pixCode,
            qrCode: pixCode,
            qr_code_base64: (pixData?.qr_code_base64 as string) || null,
            qr_code_url: qrCodeUrl,
            qrCodeUrl: qrCodeUrl,
            transaction_id:
              (pixData?.transaction_id as string) || finalTransactionId,
          },
          // Our internal fields
          order_id: order.id,
          deposit_id: deposit.id,
        },
      });
    } catch (error: unknown) {
      console.error("NutzPay purchase error:", error);

      // Only mark as FAILED if it's a real error (not just a network timeout or temporary issue)
      // For temporary issues, keep it as PENDING so it can be retried
      let shouldMarkAsFailed = true;
      let errorMessage = "Failed to process USDT purchase with NutzPay";
      let errorDetails: unknown = undefined;
      let statusCode = 500;

      if (error instanceof Error) {
        errorMessage = error.message;

        // Don't mark as failed for network/timeout errors - keep as PENDING
        if (
          error.message.includes("timeout") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ENOTFOUND") ||
          error.message.includes("network")
        ) {
          shouldMarkAsFailed = false;
        }
      } else if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: unknown; status?: number };
          code?: string;
        };

        // Don't mark as failed for 5xx errors (server issues) - keep as PENDING
        if (axiosError.response?.status && axiosError.response.status >= 500) {
          shouldMarkAsFailed = false;
        }

        // Don't mark as failed for network errors
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

      // Only update status to FAILED if it's a real error (not temporary)
      if (shouldMarkAsFailed) {
        console.error("Marking order as FAILED due to error");
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "FAILED",
          },
        });
      } else {
        // Order remains PENDING, can be retried later
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

    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error type:", typeof error);
      console.error("Error value:", JSON.stringify(error, null, 2));
    }

    // Check for common issues
    let errorMessage = "Failed to process USDT purchase";
    let statusCode = 500;

    if (error instanceof Error) {
      // Check for database connection errors
      if (
        error.message.includes("PrismaClient") ||
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        errorMessage = "Database connection error. Please try again later.";
        console.error("Database error detected");
      }
      // Check for environment variable errors
      else if (
        error.message.includes("PUBLIC_KEY") ||
        error.message.includes("SECRET_KEY") ||
        error.message.includes("NUTZPAY_PUBLIC_KEY") ||
        error.message.includes("NUTZPAY_SECRET_KEY") ||
        error.message.includes("NutzPay credentials")
      ) {
        errorMessage =
          "Payment service configuration error. Please contact support.";
        console.error("NutzPay configuration error detected");
      }
      // Check for validation errors
      else if (
        error.message.includes("Invalid") ||
        error.message.includes("required") ||
        error.message.includes("must be")
      ) {
        errorMessage = error.message;
        statusCode = 400;
      }
      // Use the error message if it's informative
      else if (
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

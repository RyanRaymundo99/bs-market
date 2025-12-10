import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nutzPayService } from "@/lib/nutzpay";
import { ledgerService } from "@/lib/ledger";
import { Decimal } from "@prisma/client/runtime/library";

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

    // Parse request body
    const { amount, usdt_amount } = await request.json();

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (!usdt_amount || usdt_amount <= 0) {
      return NextResponse.json(
        { error: "USDT amount must be greater than 0" },
        { status: 400 }
      );
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
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        type: "BUY",
        baseCurrency: "USDT",
        quoteCurrency: "BRL",
        amount: new Decimal(usdt_amount),
        price: new Decimal(amount / usdt_amount),
        total: new Decimal(amount),
        status: "PENDING",
        externalOrderId: externalId, // Set immediately to prevent webhook race condition
      },
    });

    try {
      // Call NutzPay API to create USDT purchase
      // Use NUTZPAY_WEBHOOK_URL if set (for testing with webhook.site), otherwise use default
      const callbackUrl = process.env.NUTZPAY_WEBHOOK_URL || 
        `${
          process.env.NEXT_PUBLIC_APP_URL || "https://bsmarket.com.br"
        }/api/webhooks/nutzpay`;

      const nutzPayResponse = await nutzPayService.createUSDTPurchase({
        amount: amount,
        usdt_amount: usdt_amount,
        customer: {
          name: user.name,
          document: document,
          email: user.email,
        },
        external_id: externalId,
        callback_url: callbackUrl,
      });

      const responseData = nutzPayResponse.data || nutzPayResponse;

      const transactionId =
        responseData.transaction_id ||
        responseData.transactionId ||
        responseData.pix_data?.transaction_id ||
        responseData.providerTransactionId ||
        null;

      const responseStatus = responseData.status || "pending";
      const isCompleted =
        responseStatus === "completed" || responseStatus === "COMPLETED";

      // Extract PIX code - according to NutzPay API docs:
      // - Response has: data.pix_data.qr_code (the PIX "Copia e Cola" string)
      // - Also check top-level qrCode/qr_code for backwards compatibility
      const pixCode =
        responseData.pix_data?.qr_code || // PRIMARY: From pix_data object (per API docs)
        responseData.pix_data?.qrCode || // Alternative field name
        responseData.qrCode || // Fallback: Top-level qrCode
        responseData.pixKey || // Fallback: Top-level pixKey
        responseData.qr_code || // Fallback: Top-level qr_code
        null;

      // Extract QR code URL if available
      const qrCodeUrl =
        responseData.qrCodeUrl || responseData.qr_code_url || null;

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
      const deposit = await prisma.deposit.create({
        data: {
          userId: user.id,
          amount: new Decimal(amount),
          fee: new Decimal(0), // Fee is already included in the amount
          status: isCompleted ? "CONFIRMED" : "PENDING",
          paymentMethod: "PIX",
          externalId: externalId, // Store our original externalId for webhook matching
          pixQrCode: pixCode,
          pixQrCodeBase64: responseData.pix_data?.qr_code_base64 || null,
        },
      });

      // If payment is completed, update user balance immediately
      if (isCompleted) {
        // Update USDT balance (add the USDT amount)
        await ledgerService.updateBalance(
          user.id,
          "USDT",
          new Decimal(usdt_amount),
          "ADD"
        );

        // Create transaction record for USDT credit
        await ledgerService.createTransaction({
          userId: user.id,
          type: "BUY_CRYPTO",
          amount: new Decimal(usdt_amount),
          currency: "USDT",
          description: `USDT purchase via PIX - ${usdt_amount} USDT`,
          metadata: {
            orderId: order.id,
            depositId: deposit.id,
            transactionId: transactionId,
            amountBRL: amount,
            amountUSDT: usdt_amount,
            exchangeRate: amount / usdt_amount,
          },
        });

        console.log(
          `User ${user.id} balance credited with ${usdt_amount} USDT`
        );
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
          amount_brl: amount,
          amount_usdt: usdt_amount,
          exchange_rate: amount / usdt_amount,
          // PIX code fields - match NutzPay API structure
          qrCode: pixCode, // Direct field from NutzPay
          pixKey: pixCode, // Also include as pixKey (same value)
          qrCodeUrl: qrCodeUrl, // QR code image URL
          // Nested structure for backward compatibility
          pix_data: {
            qr_code: pixCode,
            qrCode: pixCode,
            qr_code_base64: responseData.pix_data?.qr_code_base64 || null,
            qr_code_url: qrCodeUrl,
            qrCodeUrl: qrCodeUrl,
            transaction_id:
              responseData.pix_data?.transaction_id || finalTransactionId, // External PIX transaction ID
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
        if (axiosError.code === "ECONNREFUSED" || axiosError.code === "ENOTFOUND" || axiosError.code === "ETIMEDOUT") {
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
    return NextResponse.json(
      { error: "Failed to process USDT purchase" },
      { status: 500 }
    );
  }
}

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
      },
    });

    try {
      // Call NutzPay API to create USDT purchase
      const callbackUrl = `${
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

      // Extract response data - NutzPay returns the data directly or nested
      // Response structure: { success: true, transactionId, qrCode, pixKey, qrCodeUrl, ... }
      const responseData = nutzPayResponse.data || nutzPayResponse;

      console.log(
        "NutzPay Full Response:",
        JSON.stringify(nutzPayResponse, null, 2)
      );
      console.log(
        "NutzPay Response Data:",
        JSON.stringify(responseData, null, 2)
      );

      // Extract transaction ID (can be transactionId or transaction_id)
      const transactionId =
        responseData.transactionId ||
        responseData.transaction_id ||
        responseData.providerTransactionId ||
        null;

      const responseStatus = responseData.status || "pending";
      const isCompleted =
        responseStatus === "completed" || responseStatus === "COMPLETED";

      // Extract PIX code - according to NutzPay docs, it's in qrCode or pixKey field
      // Both fields contain the same PIX "Copia e Cola" string
      const pixCode =
        responseData.qrCode ||
        responseData.pixKey ||
        responseData.pix_data?.qr_code ||
        responseData.pix_data?.qrCode ||
        responseData.qr_code ||
        null;

      // Extract QR code URL if available
      const qrCodeUrl =
        responseData.qrCodeUrl || responseData.qr_code_url || null;

      console.log("=== PIX CODE EXTRACTION ===");
      console.log("Transaction ID:", transactionId);
      console.log("Status:", responseStatus);
      console.log(
        "PIX Code (first 50 chars):",
        pixCode ? pixCode.substring(0, 50) + "..." : "NOT FOUND"
      );
      console.log("QR Code URL:", qrCodeUrl || "NOT FOUND");
      console.log("===========================");

      // Update order with NutzPay transaction ID
      await prisma.order.update({
        where: { id: order.id },
        data: {
          externalOrderId: transactionId || externalId,
          status: isCompleted ? "COMPLETED" : "PENDING",
          executedAt: isCompleted ? new Date() : null,
        },
      });

      // Create deposit record for tracking
      const deposit = await prisma.deposit.create({
        data: {
          userId: user.id,
          amount: new Decimal(amount),
          fee: new Decimal(0), // Fee is already included in the amount
          status: isCompleted ? "CONFIRMED" : "PENDING",
          paymentMethod: "PIX",
          externalId: transactionId || externalId,
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
          transaction_id: transactionId,
          transactionId: transactionId, // Also include camelCase for compatibility
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
          },
          // Our internal fields
          order_id: order.id,
          deposit_id: deposit.id,
        },
      });
    } catch (error: unknown) {
      // If NutzPay API call fails, update order status to failed
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "FAILED",
        },
      });

      console.error("NutzPay purchase error:", error);

      // Return user-friendly error message
      let errorMessage = "Failed to process USDT purchase with NutzPay";
      let errorDetails: unknown = undefined;
      let statusCode = 500;

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: unknown; status?: number };
        };
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

      return NextResponse.json(
        {
          error: errorMessage,
          ...(errorDetails ? { details: errorDetails } : {}),
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

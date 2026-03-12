import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import { paymentService } from "@/lib/payment";

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

    // Get transaction with withdrawal details
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        withdrawal: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (!transaction.withdrawal) {
      return NextResponse.json(
        { error: "This transaction is not a withdrawal" },
        { status: 400 }
      );
    }

    const withdrawal = transaction.withdrawal;

    // Try to get status from payment provider
    let providerStatus = null;
    let statusUpdate = null;

    try {
      // Try with hash (transaction_id from API response)
      if (withdrawal.hash) {
        try {
          providerStatus = await paymentService.getTransactionStatus(
            withdrawal.hash
          );
          if (providerStatus) {
            console.log("✅ Found withdrawal status using transaction hash");
          }
        } catch (error) {
          console.error("Error fetching withdrawal status with hash:", error);
        }
      }

      // Try with externalId
      if (!providerStatus && withdrawal.externalId) {
        try {
          providerStatus = await paymentService.getTransactionStatus(
            withdrawal.externalId
          );
          if (providerStatus) {
            console.log("✅ Found withdrawal status using externalId");
          }
        } catch (error) {
          console.error("Error fetching withdrawal status with externalId:", error);
        }
      }

      // Log what we have available for debugging
      console.log("Withdrawal sync attempt - Available data:", {
        hasHash: !!withdrawal.hash,
        hasExternalId: !!withdrawal.externalId,
        hash: withdrawal.hash,
        externalId: withdrawal.externalId,
        type: withdrawal.type,
        status: withdrawal.status,
        provider: paymentService.name,
      });

      // Determine new status from provider response
      if (providerStatus) {
        console.log("Provider status response:", JSON.stringify(providerStatus, null, 2));

        if (providerStatus.isCompleted) {
          statusUpdate = "COMPLETED";
        } else if (providerStatus.isFailed) {
          statusUpdate = "FAILED";
        } else if (providerStatus.status === "processing") {
          statusUpdate = "PROCESSING";
        } else if (providerStatus.status === "pending") {
          statusUpdate = "PENDING";
        }
      }
    } catch (error) {
      console.error("Error syncing withdrawal status:", error);
      return NextResponse.json(
        {
          error: "Failed to sync status",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Update withdrawal status if we got a new status
    if (statusUpdate && statusUpdate !== withdrawal.status) {
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: statusUpdate as
            | "PENDING"
            | "PROCESSING"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Withdrawal status updated from ${withdrawal.status} to ${statusUpdate}`,
        oldStatus: withdrawal.status,
        newStatus: statusUpdate,
        providerStatus: providerStatus,
      });
    } else if (statusUpdate === withdrawal.status) {
      return NextResponse.json({
        success: true,
        message: `Withdrawal status is already ${withdrawal.status}`,
        status: withdrawal.status,
        providerStatus: providerStatus,
      });
    } else {
      const missingData = [];
      if (!withdrawal.hash && !withdrawal.externalId) {
        missingData.push("transaction_id (hash) or externalId");
      }
      
      let errorMessage = `Could not determine status from ${paymentService.name} API`;
      if (missingData.length > 0) {
        errorMessage += `. Missing required data: ${missingData.join(", ")}. `;
        errorMessage += "The withdrawal may have been created before these fields were properly stored, or it may be a PIX withdrawal (which doesn't use the payment provider API).";
      } else {
        errorMessage += `. The API may not have returned a valid status, or the withdrawal may not exist in ${paymentService.name}'s system.`;
      }

      return NextResponse.json({
        success: false,
        message: errorMessage,
        currentStatus: withdrawal.status,
        providerStatus: providerStatus,
        availableData: {
          hasHash: !!withdrawal.hash,
          hasExternalId: !!withdrawal.externalId,
          type: withdrawal.type,
        },
      });
    }
  } catch (error) {
    console.error("Error syncing transaction status:", error);
    return NextResponse.json(
      {
        error: "Failed to sync transaction status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

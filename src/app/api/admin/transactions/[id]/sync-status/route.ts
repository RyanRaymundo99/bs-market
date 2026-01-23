import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAdminSession } from "@/lib/admin-session";
import { nutzPayService } from "@/lib/nutzpay";

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

    // Try to get status from NutzPay using externalId or hash
    let nutzPayStatus = null;
    let statusUpdate = null;

    try {
      // Try with externalId first
      if (withdrawal.externalId) {
        try {
          nutzPayStatus = await nutzPayService.getWithdrawalStatus(
            withdrawal.externalId
          );
        } catch (error) {
          console.error("Error fetching withdrawal status with externalId:", error);
        }
      }

      // If that failed and we have a hash, try with hash
      if (!nutzPayStatus && withdrawal.hash) {
        try {
          nutzPayStatus = await nutzPayService.getTransactionStatus(
            withdrawal.hash
          );
        } catch (error) {
          console.error("Error fetching withdrawal status with hash:", error);
        }
      }

      // Determine new status from NutzPay response
      if (nutzPayStatus) {
        // Try multiple possible status fields in the response
        const nutzPayStatusValue = (
          nutzPayStatus.status ||
          nutzPayStatus.data?.status ||
          nutzPayStatus.transaction_status ||
          nutzPayStatus.withdrawal_status ||
          nutzPayStatus.state ||
          ""
        ).toUpperCase();

        console.log("NutzPay status response:", JSON.stringify(nutzPayStatus, null, 2));
        console.log("Extracted status value:", nutzPayStatusValue);

        if (
          nutzPayStatusValue === "COMPLETED" ||
          nutzPayStatusValue === "SUCCESS" ||
          nutzPayStatusValue === "SUCCESSFUL" ||
          nutzPayStatusValue === "CONFIRMED" ||
          nutzPayStatusValue === "DONE"
        ) {
          statusUpdate = "COMPLETED";
        } else if (
          nutzPayStatusValue === "FAILED" ||
          nutzPayStatusValue === "ERROR" ||
          nutzPayStatusValue === "REJECTED"
        ) {
          statusUpdate = "FAILED";
        } else if (
          nutzPayStatusValue === "PROCESSING" ||
          nutzPayStatusValue === "IN_PROGRESS"
        ) {
          statusUpdate = "PROCESSING";
        } else if (nutzPayStatusValue === "PENDING") {
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
        nutzPayStatus: nutzPayStatus,
      });
    } else if (statusUpdate === withdrawal.status) {
      return NextResponse.json({
        success: true,
        message: `Withdrawal status is already ${withdrawal.status}`,
        status: withdrawal.status,
        nutzPayStatus: nutzPayStatus,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Could not determine status from NutzPay API",
        currentStatus: withdrawal.status,
        nutzPayStatus: nutzPayStatus,
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

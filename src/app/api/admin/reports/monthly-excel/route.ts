import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin-session";
import prisma from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const admin = await validateAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get month and year from query params
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    // Validate month and year
    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }
    if (year < 2020 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch all transactions for the month
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
          },
        },
        deposit: {
          select: {
            id: true,
            status: true,
            paymentMethod: true,
            externalId: true,
          },
        },
        withdrawal: {
          select: {
            id: true,
            status: true,
            paymentMethod: true,
            type: true,
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
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate summary statistics
    const summary = {
      totalTransactions: transactions.length,
      totalDeposits: transactions
        .filter((t) => t.type === "DEPOSIT")
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalWithdrawals: transactions
        .filter((t) => t.type === "WITHDRAWAL")
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalBuyCrypto: transactions
        .filter((t) => t.type === "BUY_CRYPTO")
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalSellCrypto: transactions
        .filter((t) => t.type === "SELL_CRYPTO")
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalFees: transactions
        .filter((t) => t.type === "FEE")
        .reduce((sum, t) => sum + Number(t.amount), 0),
    };

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Transactions ${month}/${year}`);

    // Set column widths
    worksheet.columns = [
      { width: 20 }, // Date
      { width: 30 }, // User Name
      { width: 20 }, // User Email
      { width: 15 }, // CPF
      { width: 15 }, // Type
      { width: 15 }, // Amount
      { width: 10 }, // Currency
      { width: 15 }, // Balance
      { width: 40 }, // Description
      { width: 20 }, // Deposit Status
      { width: 20 }, // Withdrawal Status
      { width: 20 }, // Order Status
      { width: 30 }, // Payment Method
      { width: 30 }, // External ID
    ];

    // Header row
    const headerRow = worksheet.addRow([
      "Date",
      "User Name",
      "User Email",
      "CPF",
      "Type",
      "Amount",
      "Currency",
      "Balance",
      "Description",
      "Deposit Status",
      "Withdrawal Status",
      "Order Status",
      "Payment Method",
      "External ID",
    ]);

    // Style header row
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Add summary section
    worksheet.insertRow(1, ["BS Market - Monthly Transaction Report"]);
    worksheet.mergeCells("A1:N1");
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.insertRow(2, [`Month: ${month}/${year}`]);
    worksheet.mergeCells("A2:N2");
    worksheet.getCell("A2").font = { size: 12 };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    worksheet.insertRow(3, ["Summary"]);
    worksheet.mergeCells("A3:N3");
    worksheet.getCell("A3").font = { size: 14, bold: true };

    worksheet.insertRow(4, [
      `Total Transactions: ${summary.totalTransactions}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    worksheet.insertRow(5, [
      `Total Deposits: R$ ${summary.totalDeposits.toFixed(2)}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    worksheet.insertRow(6, [
      `Total Withdrawals: R$ ${summary.totalWithdrawals.toFixed(2)}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    worksheet.insertRow(7, [
      `Total Buy Crypto: R$ ${summary.totalBuyCrypto.toFixed(2)}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    worksheet.insertRow(8, [
      `Total Sell Crypto: R$ ${summary.totalSellCrypto.toFixed(2)}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    worksheet.insertRow(9, [
      `Total Fees: R$ ${summary.totalFees.toFixed(2)}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    worksheet.insertRow(10, []); // Empty row

    // Add transaction data
    transactions.forEach((transaction) => {
      const row = worksheet.addRow([
        new Date(transaction.createdAt).toLocaleString("pt-BR"),
        transaction.user?.name || "N/A",
        transaction.user?.email || "N/A",
        transaction.user?.cpf || "N/A",
        transaction.type,
        Number(transaction.amount).toFixed(2),
        transaction.currency,
        Number(transaction.balance).toFixed(2),
        transaction.description,
        transaction.deposit?.status || "",
        transaction.withdrawal?.status || "",
        transaction.order?.status || "",
        transaction.deposit?.paymentMethod ||
          transaction.withdrawal?.paymentMethod ||
          "",
        transaction.deposit?.externalId || "",
      ]);

      // Alternate row colors
      if (row.number % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF3F4F6" },
        };
      }
    });

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return Excel file as response
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="transactions-${month}-${year}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error generating Excel report:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel report" },
      { status: 500 }
    );
  }
}

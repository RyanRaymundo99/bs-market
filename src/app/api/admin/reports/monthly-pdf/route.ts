import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin-session";
import prisma from "@/lib/prisma";
import PDFDocument from "pdfkit";

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

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    // Header
    doc.fontSize(20).text("BS Market - Monthly Transaction Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Month: ${month}/${year}`, { align: "center" });
    doc.moveDown(2);

    // Summary section
    doc.fontSize(16).text("Summary", { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Total Transactions: ${summary.totalTransactions}`);
    doc.text(`Total Deposits: R$ ${summary.totalDeposits.toFixed(2)}`);
    doc.text(`Total Withdrawals: R$ ${summary.totalWithdrawals.toFixed(2)}`);
    doc.text(`Total Buy Crypto: R$ ${summary.totalBuyCrypto.toFixed(2)}`);
    doc.text(`Total Sell Crypto: R$ ${summary.totalSellCrypto.toFixed(2)}`);
    doc.text(`Total Fees: R$ ${summary.totalFees.toFixed(2)}`);
    doc.moveDown(2);

    // Transactions table
    doc.fontSize(16).text("Transaction Details", { underline: true });
    doc.moveDown();

    // Table headers
    const itemHeight = 20;
    const pageHeight = 700;
    let currentY = doc.y;

    // Check if we need a new page
    if (currentY + itemHeight * 2 > pageHeight) {
      doc.addPage();
      currentY = 50;
    }

    doc.fontSize(10);
    doc.font("Helvetica-Bold");
    doc.text("Date", 50, currentY);
    doc.text("User", 120, currentY);
    doc.text("Type", 250, currentY);
    doc.text("Amount", 320, currentY);
    doc.text("Currency", 400, currentY);
    doc.text("Balance", 470, currentY);
    doc.text("Description", 550, currentY);
    currentY += itemHeight;
    doc.font("Helvetica");

    // Transaction rows
    for (const transaction of transactions) {
      if (currentY + itemHeight > pageHeight) {
        doc.addPage();
        currentY = 50;
      }

      const date = new Date(transaction.createdAt).toLocaleDateString("pt-BR");
      const userName = transaction.user?.name || "N/A";
      const type = transaction.type;
      const amount = Number(transaction.amount).toFixed(2);
      const currency = transaction.currency;
      const balance = Number(transaction.balance).toFixed(2);
      const description = transaction.description.substring(0, 30);

      doc.text(date, 50, currentY);
      doc.text(userName.substring(0, 15), 120, currentY);
      doc.text(type, 250, currentY);
      doc.text(amount, 320, currentY);
      doc.text(currency, 400, currentY);
      doc.text(balance, 470, currentY);
      doc.text(description, 550, currentY);

      currentY += itemHeight;
    }

    // Footer
    doc.fontSize(8).text(
      `Generated on ${new Date().toLocaleString("pt-BR")}`,
      50,
      doc.page.height - 50,
      { align: "center" }
    );

    // End the document and wait for it to finish
    doc.end();

    // Wait for PDF to be generated
    await new Promise<void>((resolve) => {
      doc.on("end", resolve);
    });

    // Combine all chunks
    const pdfBuffer = Buffer.concat(chunks);

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="transactions-${month}-${year}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF report:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF report" },
      { status: 500 }
    );
  }
}

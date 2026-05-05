import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("better-auth.session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const userEmail = session.user.email;

    const body = await req.json();
    const { transactionId, depositId, hash, amount, network, address } = body;
    const depositRef =
      (typeof depositId === "string" && depositId.trim()) ||
      (typeof transactionId === "string" && transactionId.trim()) ||
      "";

    if (!hash || typeof hash !== "string") {
      return NextResponse.json(
        { error: "Hash is required" },
        { status: 400 }
      );
    }

    const trimmedHash = hash.trim();
    if (!trimmedHash) {
      return NextResponse.json({ error: "Hash is required" }, { status: 400 });
    }

    if (!depositRef) {
      if (!network || !["TRC20", "ERC20", "POLYGON"].includes(network)) {
        return NextResponse.json(
          { error: "Invalid network. Must be TRC20, ERC20, or POLYGON" },
          { status: 400 }
        );
      }

      if (!address || typeof address !== "string" || !address.trim()) {
        return NextResponse.json(
          { error: "Deposit address is required" },
          { status: 400 }
        );
      }

      let requestedAmount: Decimal;
      try {
        requestedAmount = new Decimal(amount ?? 0);
      } catch {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }

      if (!Number.isFinite(requestedAmount.toNumber()) || requestedAmount.lte(0)) {
        return NextResponse.json(
          { error: "A valid amount greater than zero is required" },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const externalId = `deposit_${session.user.id}_${network}_${Date.now()}`;
        const depositAddress = address.trim();

        const deposit = await tx.deposit.create({
          data: {
            userId: session.user.id,
            amount: requestedAmount,
            currency: "USDT",
            status: "PENDING",
            paymentMethod: "USDT",
            externalId,
            paymentId: depositAddress,
            createdAt: new Date(),
          },
        });

        const balance = await tx.balance.findUnique({
          where: {
            userId_currency: { userId: session.user.id, currency: "USDT" },
          },
        });

        const transaction = await tx.transaction.create({
          data: {
            userId: session.user.id,
            type: "DEPOSIT",
            amount: requestedAmount,
            currency: "USDT",
            balance: balance?.amount || new Decimal(0),
            description: `Depósito USDT via ${network}`,
            metadata: {
              depositId: deposit.id,
              network,
              address: depositAddress,
              requestedAmount: requestedAmount.toNumber(),
              transactionHash: trimmedHash,
              hashSubmittedAt: new Date().toISOString(),
            },
          },
        });

        await tx.deposit.update({
          where: { id: deposit.id },
          data: { transactionId: transaction.id },
        });

        return { deposit, transaction };
      });

      import("@/lib/admin-alert-email")
        .then(({ getAdminAlertSettings, sendAdminAlertToAll }) =>
          getAdminAlertSettings().then((settings) =>
            sendAdminAlertToAll(
              settings,
              "Novo depósito USDT (cripto) recebido",
              [
                `Usuário: ${session.user.name} (${session.user.email})`,
                `ID depósito: ${result.deposit.id}`,
                `Valor: ${requestedAmount.toNumber()} USDT`,
                `Rede: ${network}`,
                `Endereço: ${address.trim()}`,
                `Hash informado: ${trimmedHash}`,
              ].join("\n")
            )
          )
        )
        .catch((err) => console.error("Admin alert (crypto deposit hash):", err));

      return NextResponse.json({
        success: true,
        message: "Crypto deposit submitted successfully",
        depositId: result.deposit.id,
        transactionId: result.transaction.id,
        amount: requestedAmount.toNumber(),
      });
    }

    // Resolve deposit by Deposit.id or by ledger Transaction.id (FK on Deposit)
    const deposit = await prisma.deposit.findFirst({
      where: {
        OR: [{ id: depositRef }, { transactionId: depositRef }],
      },
      include: { user: true },
    });

    if (!deposit) {
      return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
    }

    // Verify ownership
    if (deposit.user.email !== userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hashPayload = {
      transactionHash: trimmedHash,
      hashSubmittedAt: new Date().toISOString(),
    };

    if (!deposit.transactionId) {
      return NextResponse.json(
        {
          error:
            "Este depósito ainda não está vinculado a uma transação no sistema; não é possível salvar o hash.",
        },
        { status: 422 }
      );
    }

    const ledgerTx = await prisma.transaction.findUnique({
      where: { id: deposit.transactionId },
    });
    const currentMetadata =
      (ledgerTx?.metadata as Record<string, unknown>) || {};
    await prisma.transaction.update({
      where: { id: deposit.transactionId },
      data: {
        metadata: { ...currentMetadata, ...hashPayload },
      },
    });

    // Notify admins (non-blocking)
    import("@/lib/admin-alert-email")
      .then(({ getAdminAlertSettings, sendAdminAlertToAll }) =>
        getAdminAlertSettings().then((settings) =>
          sendAdminAlertToAll(
            settings,
            "Hash de depósito USDT recebido",
            [
              `Usuário: ${deposit.user.name} (${deposit.user.email})`,
              `ID depósito: ${deposit.id}`,
              `Valor: ${deposit.amount} ${deposit.currency}`,
              `Hash informado: ${trimmedHash}`,
            ].join("\n")
          )
        )
      )
      .catch((err) => console.error("Admin alert (crypto hash):", err));

    return NextResponse.json({
      success: true,
      message: "Transaction hash updated successfully",
    });
  } catch (error) {
    console.error("Error updating transaction hash:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

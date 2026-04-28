import prisma from "./prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { Prisma, TransactionType } from "../../prisma/generated/client";

// Use a type that represents either the main prisma client or a transaction client
type PrismaClientOrTransaction = 
  | typeof prisma 
  | Prisma.TransactionClient;

export class LedgerService {
  /**
   * Retrieves the current balance for a user.
   * If no balance record exists, returns a default one (not saved to DB).
   */
  async getUserBalance(userId: string, currency: string, tx: PrismaClientOrTransaction = prisma) {
    const balance = await tx.balance.findUnique({
      where: {
        userId_currency: {
          userId,
          currency,
        },
      },
    });

    return (
      balance || {
        userId,
        currency,
        amount: new Decimal(0),
        locked: new Decimal(0),
      }
    );
  }

  /**
   * Atomic balance update to prevent race conditions.
   * Uses Prisma's increment/decrement capabilities.
   */
  async updateBalance(
    userId: string,
    currency: string,
    amount: Decimal | number,
    operation: "ADD" | "SUBTRACT" | "LOCK" | "UNLOCK",
    tx: PrismaClientOrTransaction = prisma
  ) {
    const decAmount = new Decimal(amount);

    // Prepare update data based on operation
    let data: Prisma.BalanceUpdateInput = {};
    const createData: Prisma.BalanceUncheckedCreateInput = {
      userId,
      currency,
      amount: new Decimal(0),
      locked: new Decimal(0),
    };

    switch (operation) {
      case "ADD":
        data = { amount: { increment: decAmount } };
        createData.amount = decAmount;
        break;
      case "SUBTRACT":
        data = { amount: { decrement: decAmount } };
        createData.amount = decAmount.negated();
        break;
      case "LOCK":
        data = { 
          amount: { decrement: decAmount },
          locked: { increment: decAmount }
        };
        createData.amount = decAmount.negated();
        createData.locked = decAmount;
        break;
      case "UNLOCK":
        data = { 
          amount: { increment: decAmount },
          locked: { decrement: decAmount }
        };
        createData.amount = decAmount;
        createData.locked = decAmount.negated();
        break;
    }

    return await tx.balance.upsert({
      where: {
        userId_currency: {
          userId,
          currency,
        },
      },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: createData,
    });
  }

  /**
   * Creates a transaction record and snapshots the balance.
   * Best used inside a Prisma transaction.
   */
  async recordTransaction(
    data: {
      userId: string;
      type: TransactionType;
      amount: Decimal | number;
      currency: string;
      description: string;
      metadata?: Record<string, unknown>;
    },
    tx: PrismaClientOrTransaction = prisma
  ) {
    const balance = await this.getUserBalance(data.userId, data.currency, tx);
    const decAmount = new Decimal(data.amount);

    return await tx.transaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: decAmount,
        currency: data.currency,
        balance: balance.amount, // Snapshot BEFORE this transaction
        description: data.description,
        metadata: data.metadata
          ? (JSON.parse(JSON.stringify(data.metadata)) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  /** Alias for {@link recordTransaction} (legacy call sites). */
  createTransaction(
    data: Parameters<LedgerService["recordTransaction"]>[0],
    tx?: Parameters<LedgerService["recordTransaction"]>[1]
  ) {
    return this.recordTransaction(data, tx);
  }
}

export const ledgerService = new LedgerService();

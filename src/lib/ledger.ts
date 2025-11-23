import prisma from "./prisma";
import { Decimal } from "@prisma/client/runtime/library";

export class LedgerService {
  async getUserBalance(userId: string, currency: string) {
    const balance = await prisma.balance.findUnique({
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

  async updateBalance(
    userId: string,
    currency: string,
    amount: Decimal,
    type: "ADD" | "SUBTRACT" | "LOCK" | "UNLOCK"
  ) {
    const balance = await this.getUserBalance(userId, currency);

    let newAmount = balance.amount;
    let newLocked = balance.locked;

    switch (type) {
      case "ADD":
        newAmount = newAmount.add(amount);
        break;
      case "SUBTRACT":
        newAmount = newAmount.sub(amount);
        break;
      case "LOCK":
        newLocked = newLocked.add(amount);
        newAmount = newAmount.sub(amount);
        break;
      case "UNLOCK":
        newLocked = newLocked.sub(amount);
        newAmount = newAmount.add(amount);
        break;
    }

    return await prisma.balance.upsert({
      where: {
        userId_currency: {
          userId,
          currency,
        },
      },
      update: {
        amount: newAmount,
        locked: newLocked,
        updatedAt: new Date(),
      },
      create: {
        userId,
        currency,
        amount: newAmount,
        locked: newLocked,
      },
    });
  }

  async createTransaction(data: {
    userId: string;
    type: string;
    amount: Decimal;
    currency: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) {
    const balance = await this.getUserBalance(data.userId, data.currency);

    return await prisma.transaction.create({
      data: {
        userId: data.userId,
        type: data.type as
          | "DEPOSIT"
          | "WITHDRAWAL"
          | "BUY_CRYPTO"
          | "SELL_CRYPTO"
          | "FEE"
          | "REFUND",
        amount: data.amount,
        currency: data.currency,
        balance: balance.amount,
        description: data.description,
        metadata: data.metadata || {},
      },
    });
  }
}

export const ledgerService = new LedgerService();

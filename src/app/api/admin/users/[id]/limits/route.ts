import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureUserLimitsColumns } from "@/lib/user-limits-db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { dailyDepositLimit } = body;

    // Ensure table structure exists (one-time check virtually)
    await ensureUserLimitsColumns();

    if (dailyDepositLimit === undefined || isNaN(Number(dailyDepositLimit)) || Number(dailyDepositLimit) < 0) {
      return NextResponse.json(
        { error: "Invalid daily deposit limit" },
        { status: 400 }
      );
    }

    // Use raw SQL update to avoid issues with stale Prisma client metadata
    await prisma.$executeRawUnsafe(`
      UPDATE "user" 
      SET "dailyDepositLimit" = ${Number(dailyDepositLimit)}
      WHERE "_id" = '${id}'
    `);

    return NextResponse.json({
      success: true,
      user: {
        id,
        dailyDepositLimit: Number(dailyDepositLimit),
      },
    });
  } catch (err) {
    console.error("Error updating user deposit limit:", err);
    return NextResponse.json(
      { error: "Failed to update user deposit limit" },
      { status: 500 }
    );
  }
}

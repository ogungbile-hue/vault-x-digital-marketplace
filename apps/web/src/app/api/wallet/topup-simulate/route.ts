import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@app/database';
import { LedgerService } from '@app/ledger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || 'user-default-buyer';
    const amountMinor = BigInt(body.amount || 5000); // Default $50.00 (5000 cents)

    // Ensure user & wallet exist
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@marketplace.io`,
          name: 'Alex Buyer',
          wallet: {
            create: {
              balance: 0n,
              currency: 'USD',
            },
          },
        },
        include: { wallet: true },
      });
    }

    const idempotencyKey = `simulated-topup:${crypto.randomUUID()}`;
    const referenceId = `DEP-${Date.now().toString().slice(-6)}`;

    await prisma.$transaction(async (tx) => {
      await LedgerService.recordDeposit(tx, {
        userId,
        amount: amountMinor,
        idempotencyKey,
        referenceId,
        description: `Simulated Top-Up of $${(Number(amountMinor) / 100).toFixed(2)}`,
      });
    });

    const updatedWallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Wallet credited successfully',
      newBalance: updatedWallet?.balance.toString(),
      referenceId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to simulate top-up' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@app/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'user-default-buyer';

    // Auto-create user and wallet if not yet created
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
    } else if (!user.wallet) {
      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0n,
          currency: 'USD',
        },
      });
      user = { ...user, wallet };
    }

    // Fetch recent ledger entries for this user's wallet
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        accountId: `LIABILITY:USER_WALLET:${userId}`,
      },
      include: {
        transaction: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      wallet: {
        id: user.wallet!.id,
        userId: user.wallet!.userId,
        balance: user.wallet!.balance.toString(),
        currency: user.wallet!.currency,
        version: user.wallet!.version,
      },
      ledgerEntries: ledgerEntries.map((e) => ({
        id: e.id,
        direction: e.direction,
        amount: e.amount.toString(),
        currency: e.currency,
        description: e.transaction.description,
        type: e.transaction.type,
        referenceId: e.transaction.referenceId,
        createdAt: e.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}

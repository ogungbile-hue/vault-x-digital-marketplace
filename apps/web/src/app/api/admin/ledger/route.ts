import { NextResponse } from 'next/server';
import { prisma } from '@app/database';
import { LedgerService } from '@app/ledger';

export async function GET() {
  try {
    const audit = await LedgerService.auditLedger();

    const transactions = await prisma.ledgerTransaction.findMany({
      include: {
        entries: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      audit: {
        ...audit,
        totalDebits: audit.totalDebits.toString(),
        totalCredits: audit.totalCredits.toString(),
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        referenceId: t.referenceId,
        description: t.description,
        idempotencyKey: t.idempotencyKey,
        createdAt: t.createdAt,
        entries: t.entries.map((e) => ({
          id: e.id,
          accountId: e.accountId,
          accountCategory: e.accountCategory,
          direction: e.direction,
          amount: e.amount.toString(),
          currency: e.currency,
        })),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ledger transactions' },
      { status: 500 }
    );
  }
}

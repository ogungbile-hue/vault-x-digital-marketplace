import {
  AccountCategory,
  EntryDirection,
  LedgerTransactionType,
  RecordTransactionParam,
  StandardAccounts,
} from '@app/types';
import { PrismaTransaction, prisma } from '@app/database';
import {
  InsufficientBalanceError,
  UnbalancedLedgerError,
} from './errors';

export interface LedgerAuditResult {
  isBalanced: boolean;
  totalDebits: bigint;
  totalCredits: bigint;
  transactionCount: number;
  entryCount: number;
}

export class LedgerService {
  /**
   * Records an immutable double-entry ledger transaction.
   * Enforces that SUM(debits) === SUM(credits).
   * Atomically updates associated user wallet balances within the given transaction context.
   */
  public static async recordTransaction(
    tx: PrismaTransaction,
    params: RecordTransactionParam
  ) {
    // 1. Verify that entries are balanced
    let totalDebits = 0n;
    let totalCredits = 0n;

    for (const entry of params.entries) {
      if (entry.direction === EntryDirection.DEBIT) {
        totalDebits += entry.amount;
      } else if (entry.direction === EntryDirection.CREDIT) {
        totalCredits += entry.amount;
      }
    }

    if (totalDebits !== totalCredits) {
      throw new UnbalancedLedgerError(totalDebits, totalCredits);
    }

    // 2. Create the LedgerTransaction
    const ledgerTx = await tx.ledgerTransaction.create({
      data: {
        idempotencyKey: params.idempotencyKey,
        type: params.type,
        referenceId: params.referenceId,
        description: params.description,
        entries: {
          create: params.entries.map((entry) => ({
            accountId: entry.accountId,
            accountCategory: entry.accountCategory,
            direction: entry.direction,
            amount: entry.amount,
            currency: entry.currency || 'USD',
          })),
        },
      },
      include: {
        entries: true,
      },
    });

    // 3. Materialize wallet balance updates for user wallet accounts (LIABILITY:USER_WALLET)
    for (const entry of params.entries) {
      if (
        entry.accountCategory === AccountCategory.LIABILITY &&
        (entry.accountId.startsWith('LIABILITY:USER_WALLET:') || entry.accountId.startsWith('user:'))
      ) {
        const userId = entry.accountId.replace('LIABILITY:USER_WALLET:', '').replace('user:', '');

        // Lock the wallet row for update
        const wallet = await tx.wallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          throw new Error(`Wallet not found for userId: ${userId}`);
        }

        if (entry.direction === EntryDirection.DEBIT) {
          // In double-entry: DEBIT on Liability decreases liability (decreases wallet balance)
          if (wallet.balance < entry.amount) {
            throw new InsufficientBalanceError(wallet.balance, entry.amount);
          }

          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: {
                decrement: entry.amount,
              },
              version: {
                increment: 1,
              },
            },
          });
        } else if (entry.direction === EntryDirection.CREDIT) {
          // In double-entry: CREDIT on Liability increases liability (increases wallet balance)
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: {
                increment: entry.amount,
              },
              version: {
                increment: 1,
              },
            },
          });
        }
      }
    }

    return ledgerTx;
  }

  /**
   * Helper: Records a deposit of funds into a user's wallet.
   * Debit: ASSET:PLATFORM_CASH
   * Credit: LIABILITY:USER_WALLET:<userId>
   */
  public static async recordDeposit(
    tx: PrismaTransaction,
    params: {
      userId: string;
      amount: bigint;
      idempotencyKey: string;
      referenceId: string;
      description?: string;
    }
  ) {
    return this.recordTransaction(tx, {
      idempotencyKey: params.idempotencyKey,
      type: LedgerTransactionType.DEPOSIT,
      referenceId: params.referenceId,
      description: params.description || `Deposit of ${params.amount} to user ${params.userId}`,
      entries: [
        {
          accountId: StandardAccounts.PLATFORM_CASH,
          accountCategory: AccountCategory.ASSET,
          direction: EntryDirection.DEBIT,
          amount: params.amount,
          currency: 'USD',
        },
        {
          accountId: `LIABILITY:USER_WALLET:${params.userId}`,
          accountCategory: AccountCategory.LIABILITY,
          direction: EntryDirection.CREDIT,
          amount: params.amount,
          currency: 'USD',
        },
      ],
    });
  }

  /**
   * Audits the system ledger to guarantee global invariant SUM(debits) === SUM(credits).
   */
  public static async auditLedger(clientOrTx: PrismaTransaction = prisma): Promise<LedgerAuditResult> {
    const entries = await clientOrTx.ledgerEntry.findMany({
      select: {
        direction: true,
        amount: true,
      },
    });

    let totalDebits = 0n;
    let totalCredits = 0n;

    for (const e of entries) {
      if (e.direction === EntryDirection.DEBIT) {
        totalDebits += e.amount;
      } else {
        totalCredits += e.amount;
      }
    }

    const txCount = await clientOrTx.ledgerTransaction.count();

    return {
      isBalanced: totalDebits === totalCredits,
      totalDebits,
      totalCredits,
      transactionCount: txCount,
      entryCount: entries.length,
    };
  }
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import {
  AccountCategory,
  EntryDirection,
  LedgerTransactionType,
  StandardAccounts,
} from '@app/types';
import {
  InsufficientBalanceError,
  LedgerService,
  UnbalancedLedgerError,
} from '@app/ledger';

describe('Double-Entry Ledger Engine', () => {
  // In-memory test state to verify ledger invariants and wallet projection logic
  let mockLedgerTransactions: any[] = [];
  let mockLedgerEntries: any[] = [];
  let mockWallets: Map<string, { id: string; userId: string; balance: bigint; version: number }> = new Map();

  let mockTx: any;

  beforeEach(() => {
    mockLedgerTransactions = [];
    mockLedgerEntries = [];
    mockWallets = new Map();

    // Mock wallet for test user
    mockWallets.set('user-1', {
      id: 'wallet-1',
      userId: 'user-1',
      balance: 10000n, // $100.00 in cents
      version: 1,
    });

    mockTx = {
      ledgerTransaction: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const txId = crypto.randomUUID();
          const txRecord = {
            id: txId,
            idempotencyKey: data.idempotencyKey,
            type: data.type,
            referenceId: data.referenceId,
            description: data.description,
            createdAt: new Date(),
          };
          mockLedgerTransactions.push(txRecord);

          if (data.entries?.create) {
            for (const entry of data.entries.create) {
              mockLedgerEntries.push({
                id: crypto.randomUUID(),
                transactionId: txId,
                ...entry,
                createdAt: new Date(),
              });
            }
          }
          return { ...txRecord, entries: mockLedgerEntries.filter((e) => e.transactionId === txId) };
        }),
      },
      wallet: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          return mockWallets.get(where.userId) || null;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          for (const [userId, wallet] of mockWallets.entries()) {
            if (wallet.id === where.id) {
              if (data.balance?.decrement) {
                wallet.balance -= BigInt(data.balance.decrement);
              }
              if (data.balance?.increment) {
                wallet.balance += BigInt(data.balance.increment);
              }
              if (data.version?.increment) {
                wallet.version += 1;
              }
              return wallet;
            }
          }
          throw new Error('Wallet not found');
        }),
      },
      ledgerEntry: {
        findMany: vi.fn().mockImplementation(async () => mockLedgerEntries),
      },
      ledgerTransactionCount: {
        count: vi.fn().mockImplementation(async () => mockLedgerTransactions.length),
      },
    };
  });

  it('should accept a perfectly balanced transaction and update wallet balance', async () => {
    const idempotencyKey = crypto.randomUUID();
    const purchaseAmount = 2500n; // $25.00

    await LedgerService.recordTransaction(mockTx, {
      idempotencyKey,
      type: LedgerTransactionType.ORDER_PAYMENT,
      referenceId: 'order-101',
      description: 'Order payment for order-101',
      entries: [
        {
          accountId: 'LIABILITY:USER_WALLET:user-1',
          accountCategory: AccountCategory.LIABILITY,
          direction: EntryDirection.DEBIT,
          amount: purchaseAmount,
          currency: 'USD',
        },
        {
          accountId: StandardAccounts.PRODUCT_SALES,
          accountCategory: AccountCategory.REVENUE,
          direction: EntryDirection.CREDIT,
          amount: purchaseAmount,
          currency: 'USD',
        },
      ],
    });

    const userWallet = mockWallets.get('user-1')!;
    expect(userWallet.balance).toBe(7500n); // 10000 - 2500
    expect(userWallet.version).toBe(2);

    // Verify transaction and entries
    expect(mockLedgerTransactions).toHaveLength(1);
    expect(mockLedgerEntries).toHaveLength(2);

    const debitSum = mockLedgerEntries
      .filter((e) => e.direction === EntryDirection.DEBIT)
      .reduce((acc, e) => acc + e.amount, 0n);

    const creditSum = mockLedgerEntries
      .filter((e) => e.direction === EntryDirection.CREDIT)
      .reduce((acc, e) => acc + e.amount, 0n);

    expect(debitSum).toBe(creditSum);
  });

  it('should reject unbalanced transactions with UnbalancedLedgerError', async () => {
    const idempotencyKey = crypto.randomUUID();

    await expect(
      LedgerService.recordTransaction(mockTx, {
        idempotencyKey,
        type: LedgerTransactionType.ORDER_PAYMENT,
        referenceId: 'order-102',
        description: 'Unbalanced payment test',
        entries: [
          {
            accountId: 'LIABILITY:USER_WALLET:user-1',
            accountCategory: AccountCategory.LIABILITY,
            direction: EntryDirection.DEBIT,
            amount: 5000n, // $50.00
            currency: 'USD',
          },
          {
            accountId: StandardAccounts.PRODUCT_SALES,
            accountCategory: AccountCategory.REVENUE,
            direction: EntryDirection.CREDIT,
            amount: 4000n, // $40.00 -> Unbalanced by $10
            currency: 'USD',
          },
        ],
      })
    ).rejects.toThrow(UnbalancedLedgerError);

    // No ledger records or wallet updates should have occurred
    expect(mockLedgerTransactions).toHaveLength(0);
    expect(mockLedgerEntries).toHaveLength(0);
    expect(mockWallets.get('user-1')!.balance).toBe(10000n);
  });

  it('should prevent overdrafts and reject when wallet balance is insufficient', async () => {
    const idempotencyKey = crypto.randomUUID();
    const excessiveAmount = 50000n; // $500.00 > $100.00 balance

    await expect(
      LedgerService.recordTransaction(mockTx, {
        idempotencyKey,
        type: LedgerTransactionType.ORDER_PAYMENT,
        referenceId: 'order-103',
        description: 'Overdraft attempt',
        entries: [
          {
            accountId: 'LIABILITY:USER_WALLET:user-1',
            accountCategory: AccountCategory.LIABILITY,
            direction: EntryDirection.DEBIT,
            amount: excessiveAmount,
            currency: 'USD',
          },
          {
            accountId: StandardAccounts.PRODUCT_SALES,
            accountCategory: AccountCategory.REVENUE,
            direction: EntryDirection.CREDIT,
            amount: excessiveAmount,
            currency: 'USD',
          },
        ],
      })
    ).rejects.toThrow(InsufficientBalanceError);

    expect(mockWallets.get('user-1')!.balance).toBe(10000n);
  });

  it('should support multi-account revenue split (Platform Fee + Product Sales)', async () => {
    const idempotencyKey = crypto.randomUUID();
    const totalDebit = 10000n; // $100.00
    const sellerRevenue = 9000n; // $90.00
    const platformFee = 1000n; // $10.00

    await LedgerService.recordTransaction(mockTx, {
      idempotencyKey,
      type: LedgerTransactionType.ORDER_PAYMENT,
      referenceId: 'order-104',
      description: 'Split fee payment',
      entries: [
        {
          accountId: 'LIABILITY:USER_WALLET:user-1',
          accountCategory: AccountCategory.LIABILITY,
          direction: EntryDirection.DEBIT,
          amount: totalDebit,
          currency: 'USD',
        },
        {
          accountId: StandardAccounts.PRODUCT_SALES,
          accountCategory: AccountCategory.REVENUE,
          direction: EntryDirection.CREDIT,
          amount: sellerRevenue,
          currency: 'USD',
        },
        {
          accountId: StandardAccounts.PLATFORM_FEE,
          accountCategory: AccountCategory.REVENUE,
          direction: EntryDirection.CREDIT,
          amount: platformFee,
          currency: 'USD',
        },
      ],
    });

    expect(mockWallets.get('user-1')!.balance).toBe(0n);
    expect(mockLedgerEntries).toHaveLength(3);

    const totalDebits = mockLedgerEntries
      .filter((e) => e.direction === EntryDirection.DEBIT)
      .reduce((acc, e) => acc + e.amount, 0n);

    const totalCredits = mockLedgerEntries
      .filter((e) => e.direction === EntryDirection.CREDIT)
      .reduce((acc, e) => acc + e.amount, 0n);

    expect(totalDebits).toBe(totalCredits);
    expect(totalDebits).toBe(10000n);
  });

  it('should handle wallet deposit and maintain ledger invariant', async () => {
    const idempotencyKey = crypto.randomUUID();
    const depositAmount = 5000n; // $50.00

    await LedgerService.recordDeposit(mockTx, {
      userId: 'user-1',
      amount: depositAmount,
      idempotencyKey,
      referenceId: 'dep-9901',
    });

    const userWallet = mockWallets.get('user-1')!;
    expect(userWallet.balance).toBe(15000n); // 10000 + 5000

    const totalDebits = mockLedgerEntries
      .filter((e) => e.direction === EntryDirection.DEBIT)
      .reduce((acc, e) => acc + e.amount, 0n);

    const totalCredits = mockLedgerEntries
      .filter((e) => e.direction === EntryDirection.CREDIT)
      .reduce((acc, e) => acc + e.amount, 0n);

    expect(totalDebits).toBe(totalCredits);
    expect(totalDebits).toBe(5000n);
  });
});

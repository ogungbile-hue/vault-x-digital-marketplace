import { z } from 'zod';

export enum AccountCategory {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum StandardAccounts {
  PLATFORM_CASH = 'ASSET:PLATFORM_CASH',
  USER_WALLET = 'LIABILITY:USER_WALLET',
  PRODUCT_SALES = 'REVENUE:PRODUCT_SALES',
  PLATFORM_FEE = 'REVENUE:PLATFORM_FEE',
  GATEWAY_FEES = 'EXPENSE:GATEWAY_FEES',
  REFUNDS = 'EXPENSE:REFUNDS',
}

export enum LedgerTransactionType {
  DEPOSIT = 'DEPOSIT',
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  REFUND = 'REFUND',
  PLATFORM_FEE = 'PLATFORM_FEE',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  DISPUTE_HOLD = 'DISPUTE_HOLD',
}

export enum EntryDirection {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export const LedgerEntryParamSchema = z.object({
  accountId: z.string().min(1),
  accountCategory: z.nativeEnum(AccountCategory),
  direction: z.nativeEnum(EntryDirection),
  amount: z.bigint().positive('Entry amount must be strictly positive'),
  currency: z.string().length(3).default('USD'),
  metadata: z.record(z.any()).optional(),
});

export type LedgerEntryParam = z.infer<typeof LedgerEntryParamSchema>;

export const RecordTransactionParamSchema = z.object({
  idempotencyKey: z.string().uuid(),
  type: z.nativeEnum(LedgerTransactionType),
  referenceId: z.string().min(1),
  description: z.string().min(1),
  entries: z.array(LedgerEntryParamSchema).min(2, 'A transaction must have at least 2 entries'),
});

export type RecordTransactionParam = z.infer<typeof RecordTransactionParamSchema>;

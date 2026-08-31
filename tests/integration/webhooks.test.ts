import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import {
  AccountCategory,
  EntryDirection,
  StandardAccounts,
  WebhookProvider,
  WebhookStatus,
} from '@app/types';
import {
  computeCryptoWebhookSignature,
  computePaystackSignature,
  InvalidSignatureError,
  WebhookService,
} from '@app/payments';

describe('Payment Webhooks & Idempotency Pipeline', () => {
  const paystackSecret = 'sk_test_paystack_secret_12345';
  const cryptoSecret = 'crypto_processor_secret_67890';

  let mockWebhookEvents: Map<string, any> = new Map();
  let mockWallets: Map<string, any> = new Map();
  let mockLedgerEntries: any[] = [];
  let mockTx: any;

  beforeEach(() => {
    mockWebhookEvents = new Map();
    mockWallets = new Map();
    mockLedgerEntries = [];

    // Seed test wallet
    mockWallets.set('user-paystack-1', {
      id: 'wallet-p1',
      userId: 'user-paystack-1',
      balance: 1000n, // $10.00
      version: 1,
    });

    mockTx = {
      webhookEvent: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          const key = `${where.provider_externalEventId.provider}:${where.provider_externalEventId.externalEventId}`;
          return mockWebhookEvents.get(key) || null;
        }),
        upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => {
          const key = `${where.provider_externalEventId.provider}:${where.provider_externalEventId.externalEventId}`;
          if (mockWebhookEvents.has(key)) {
            const existing = mockWebhookEvents.get(key);
            Object.assign(existing, update);
            return existing;
          }
          const newEvent = {
            id: `evt-${crypto.randomUUID()}`,
            ...create,
            createdAt: new Date(),
          };
          mockWebhookEvents.set(key, newEvent);
          return newEvent;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          for (const [key, evt] of mockWebhookEvents.entries()) {
            if (evt.id === where.id) {
              Object.assign(evt, data);
              return evt;
            }
          }
          throw new Error('WebhookEvent not found');
        }),
      },
      wallet: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          return mockWallets.get(where.userId) || null;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          for (const [userId, wallet] of mockWallets.entries()) {
            if (wallet.id === where.id) {
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
      ledgerTransaction: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const txId = crypto.randomUUID();
          if (data.entries?.create) {
            for (const entry of data.entries.create) {
              mockLedgerEntries.push({
                id: crypto.randomUUID(),
                transactionId: txId,
                ...entry,
              });
            }
          }
          return { id: txId, ...data };
        }),
      },
    };
  });

  it('should verify valid Paystack signature and credit user wallet with balanced ledger entries', async () => {
    const rawPayload = JSON.stringify({
      event: 'charge.success',
      data: {
        id: 30012399,
        reference: 'T_REF_88776655',
        amount: 500000, // 5,000.00 minor units (kobo/cents)
        currency: 'USD',
        metadata: {
          userId: 'user-paystack-1',
        },
      },
    });

    const validSignature = computePaystackSignature(rawPayload, paystackSecret);

    const result = await WebhookService.processDepositWebhook(
      WebhookProvider.PAYSTACK,
      rawPayload,
      validSignature,
      paystackSecret,
      mockTx
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe(WebhookStatus.PROCESSED);
    expect(result.depositAmount).toBe(500000n);

    // Verify wallet was credited
    const wallet = mockWallets.get('user-paystack-1')!;
    expect(wallet.balance).toBe(501000n); // 1000 + 500000

    // Verify balanced ledger entries: DEBIT ASSET:PLATFORM_CASH === CREDIT LIABILITY:USER_WALLET
    expect(mockLedgerEntries).toHaveLength(2);
    const debit = mockLedgerEntries.find((e) => e.direction === EntryDirection.DEBIT);
    const credit = mockLedgerEntries.find((e) => e.direction === EntryDirection.CREDIT);

    expect(debit.accountId).toBe(StandardAccounts.PLATFORM_CASH);
    expect(debit.amount).toBe(500000n);

    expect(credit.accountId).toBe('LIABILITY:USER_WALLET:user-paystack-1');
    expect(credit.amount).toBe(500000n);
    expect(debit.amount).toBe(credit.amount);
  });

  it('should reject invalid or forged webhook signatures with InvalidSignatureError without database mutation', async () => {
    const rawPayload = JSON.stringify({
      event: 'charge.success',
      data: {
        id: 999999,
        amount: 100000,
        metadata: { userId: 'user-paystack-1' },
      },
    });

    const forgedSignature = 'forged_tampered_signature_hex_0011223344';

    await expect(
      WebhookService.processDepositWebhook(
        WebhookProvider.PAYSTACK,
        rawPayload,
        forgedSignature,
        paystackSecret,
        mockTx
      )
    ).rejects.toThrow(InvalidSignatureError);

    // Ensure wallet balance remained untouched
    expect(mockWallets.get('user-paystack-1')!.balance).toBe(1000n);
    expect(mockLedgerEntries).toHaveLength(0);
  });

  it('should protect against webhook replay attacks by returning DUPLICATE and avoiding double ledger credits', async () => {
    const rawPayload = JSON.stringify({
      event: 'charge.success',
      data: {
        id: 400500600,
        reference: 'T_REPLAY_123',
        amount: 25000, // 250.00
        currency: 'USD',
        metadata: {
          userId: 'user-paystack-1',
        },
      },
    });

    const signature = computePaystackSignature(rawPayload, paystackSecret);

    // Initial webhook delivery
    const firstDelivery = await WebhookService.processDepositWebhook(
      WebhookProvider.PAYSTACK,
      rawPayload,
      signature,
      paystackSecret,
      mockTx
    );

    expect(firstDelivery.status).toBe(WebhookStatus.PROCESSED);
    expect(mockWallets.get('user-paystack-1')!.balance).toBe(26000n); // 1000 + 25000
    expect(mockLedgerEntries).toHaveLength(2);

    // Replayed delivery (duplicate webhook dispatch by gateway)
    const replayDelivery = await WebhookService.processDepositWebhook(
      WebhookProvider.PAYSTACK,
      rawPayload,
      signature,
      paystackSecret,
      mockTx
    );

    expect(replayDelivery.status).toBe(WebhookStatus.DUPLICATE);
    // Crucial Invariant: Balance must NOT increase a second time
    expect(mockWallets.get('user-paystack-1')!.balance).toBe(26000n);
    expect(mockLedgerEntries).toHaveLength(2);
  });

  it('should verify generic crypto webhook signature and process USDT deposit', async () => {
    const cryptoPayload = JSON.stringify({
      payment_id: 'NOW_PAY_98765',
      userId: 'user-paystack-1',
      amount_cents: 10000, // $100.00 in cents
      currency: 'USDT',
      status: 'finished',
    });

    const signature = computeCryptoWebhookSignature(cryptoPayload, cryptoSecret);

    const result = await WebhookService.processDepositWebhook(
      WebhookProvider.CRYPTO_GENERIC,
      cryptoPayload,
      signature,
      cryptoSecret,
      mockTx
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe(WebhookStatus.PROCESSED);
    expect(result.depositAmount).toBe(10000n);
    expect(mockWallets.get('user-paystack-1')!.balance).toBe(11000n); // 1000 + 10000
  });
});

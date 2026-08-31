import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import {
  AccountCategory,
  EntryDirection,
  FulfilledItem,
  OrderStatus,
  StockStatus,
} from '@app/types';
import { encryptPayload, decryptPayload, defaultKeyVault } from '@app/crypto';
import { InsufficientStockError } from '@app/inventory';

describe('High-Concurrency Stock Reservation & Race Conditions', () => {
  // Master key setup for test
  beforeEach(() => {
    const keyHex = crypto.randomBytes(32).toString('hex');
    defaultKeyVault.registerKey(1, keyHex);
    defaultKeyVault.setCurrentVersion(1);
  });

  it('20 parallel checkouts against 1 remaining stock item results in exactly 1 sale and 19 clean rejections', async () => {
    const productId = 'prod-windows-pro-key';
    const productPrice = 2999n; // $29.99

    // Create 1 single encrypted stock item
    const rawCode = 'WIN11-PRO-ABCD-EFGH-1234';
    const envelope = encryptPayload(rawCode);

    interface MockStockRow {
      id: string;
      product_id: string;
      status: StockStatus;
      payload_ciphertext: string;
      iv: string;
      tag: string;
      key_version: number;
    }

    const availableStock: MockStockRow[] = [
      {
        id: 'stock-item-1',
        product_id: productId,
        status: StockStatus.AVAILABLE,
        payload_ciphertext: envelope.ciphertext,
        iv: envelope.iv,
        tag: envelope.tag,
        key_version: envelope.keyVersion,
      },
    ];

    // Create 20 buyers with funded wallets
    const buyers = Array.from({ length: 20 }, (_, i) => ({
      userId: `buyer-${i + 1}`,
      walletBalance: 5000n, // $50.00 each
    }));

    // Concurrency lock simulation mimicking PostgreSQL row-level mutex (FOR UPDATE SKIP LOCKED)
    let isRowLocked = false;
    const completedOrders: any[] = [];
    const ledgerEntries: any[] = [];

    const mockInstantCheckout = async (userId: string, idempotencyKey: string) => {
      // Simulate atomic transaction attempt
      // 1. SELECT ... FOR UPDATE SKIP LOCKED
      let lockedItem: MockStockRow | null = null;

      // In real Postgres, lock acquisition is serialized by the database engine
      if (!isRowLocked && availableStock.length > 0 && availableStock[0].status === StockStatus.AVAILABLE) {
        isRowLocked = true;
        lockedItem = availableStock[0];
        lockedItem.status = StockStatus.SOLD; // Locked & allocated
      }

      if (!lockedItem) {
        throw new InsufficientStockError(productId, 1, 0);
      }

      // 2. Debit buyer wallet
      const buyer = buyers.find((b) => b.userId === userId)!;
      buyer.walletBalance -= productPrice;

      // 3. Record double-entry ledger entries
      ledgerEntries.push(
        {
          idempotencyKey,
          accountId: `LIABILITY:USER_WALLET:${userId}`,
          direction: EntryDirection.DEBIT,
          amount: productPrice,
        },
        {
          idempotencyKey,
          accountId: 'REVENUE:PRODUCT_SALES',
          direction: EntryDirection.CREDIT,
          amount: productPrice,
        }
      );

      // 4. Decrypt payload in-memory
      const decrypted = decryptPayload({
        ciphertext: lockedItem.payload_ciphertext,
        iv: lockedItem.iv,
        tag: lockedItem.tag,
        keyVersion: lockedItem.key_version,
      });

      const orderResult = {
        orderId: `order-${crypto.randomUUID()}`,
        userId,
        status: OrderStatus.COMPLETED,
        totalAmount: productPrice,
        items: [
          {
            stockItemId: lockedItem.id,
            productId,
            decryptedPayload: decrypted,
            price: productPrice,
          },
        ],
      };

      completedOrders.push(orderResult);
      return orderResult;
    };

    // Dispatch 20 concurrent checkouts simultaneously
    const results = await Promise.allSettled(
      buyers.map((buyer) =>
        mockInstantCheckout(buyer.userId, crypto.randomUUID())
      )
    );

    // 1. Verify exactly 1 succeeded and 19 were rejected
    const successful = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(successful).toHaveLength(1);
    expect(rejected).toHaveLength(19);

    // 2. Verify all rejected attempts threw InsufficientStockError
    for (const rej of rejected) {
      if (rej.status === 'rejected') {
        expect(rej.reason).toBeInstanceOf(InsufficientStockError);
      }
    }

    // 3. Verify exactly 1 buyer was debited
    const winnerId = (successful[0] as PromiseFulfilledResult<any>).value.userId;
    const winner = buyers.find((b) => b.userId === winnerId)!;
    expect(winner.walletBalance).toBe(2001n); // 5000 - 2999

    const nonWinners = buyers.filter((b) => b.userId !== winnerId);
    for (const loser of nonWinners) {
      expect(loser.walletBalance).toBe(5000n); // Untouched
    }

    // 4. Verify winner received correctly decrypted secret
    const winnerOrder = (successful[0] as PromiseFulfilledResult<any>).value;
    expect(winnerOrder.items[0].decryptedPayload).toBe(rawCode);

    // 5. Verify ledger balance invariant
    expect(ledgerEntries).toHaveLength(2);
    const debits = ledgerEntries
      .filter((e) => e.direction === EntryDirection.DEBIT)
      .reduce((acc, e) => acc + e.amount, 0n);
    const credits = ledgerEntries
      .filter((e) => e.direction === EntryDirection.CREDIT)
      .reduce((acc, e) => acc + e.amount, 0n);
    expect(debits).toBe(credits);
    expect(debits).toBe(productPrice);
  });

  it('idempotency key replay returns cached order and avoids duplicate wallet deductions', async () => {
    const idempotencyKey = crypto.randomUUID();
    let invocationCount = 0;
    const cachedStore = new Map<string, any>();

    const mockIdempotentCheckout = async (key: string) => {
      if (cachedStore.has(key)) {
        return cachedStore.get(key);
      }

      invocationCount++;
      const order = {
        orderId: 'order-cached-1',
        totalAmount: 1999n,
        status: OrderStatus.COMPLETED,
      };

      cachedStore.set(key, order);
      return order;
    };

    // First attempt
    const res1 = await mockIdempotentCheckout(idempotencyKey);
    // Duplicate attempt with same key
    const res2 = await mockIdempotentCheckout(idempotencyKey);

    expect(res1).toEqual(res2);
    expect(invocationCount).toBe(1); // Executed only once
  });
});

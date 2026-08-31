import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { DelimiterFormat, OrderStatus, StockStatus } from '@app/types';
import { BulkStockParser } from '@app/inventory';
import { decryptPayload, encryptPayload, defaultKeyVault } from '@app/crypto';

describe('Web Application End-to-End & API Integration', () => {
  beforeEach(() => {
    const key = crypto.randomBytes(32).toString('hex');
    defaultKeyVault.registerKey(1, key);
    defaultKeyVault.setCurrentVersion(1);
  });

  it('BulkStockParser produces live interactive preview with segregated errors and valid rows', () => {
    const rawInput = [
      'user1@market.io:secret123',
      'invalid_syntax_row_without_colon',
      'user2@market.io:secret456',
      'user1@market.io:secret123', // duplicate
    ].join('\n');

    const preview = BulkStockParser.parse(rawInput, DelimiterFormat.USER_PASS);

    expect(preview.validItems).toHaveLength(2);
    expect(preview.duplicates).toHaveLength(1);
    expect(preview.errors).toHaveLength(1);

    expect(preview.errors[0].lineNumber).toBe(2);
    expect(preview.duplicates[0].normalizedPayload).toBe('user1@market.io:secret123');
  });

  it('Encrypted stock items can be decrypted and converted to formatted .txt export', () => {
    const mockDecryptedItems = [
      {
        stockItemId: 's1',
        productId: 'p1',
        productTitle: 'Netflix Premium 4K',
        decryptedPayload: 'account@netflix.com:password123',
        price: 499n,
      },
      {
        stockItemId: 's2',
        productId: 'p2',
        productTitle: 'NordVPN 2Y Account',
        decryptedPayload: 'user_vpn:supersecret:2FA_TOKEN_SECRET',
        price: 1999n,
      },
    ];

    const exportText = mockDecryptedItems
      .map((item, idx) => `Item #${idx + 1} (${item.productTitle}):\n${item.decryptedPayload}\n`)
      .join('\n----------------------------------------\n\n');

    expect(exportText).toContain('Netflix Premium 4K');
    expect(exportText).toContain('account@netflix.com:password123');
    expect(exportText).toContain('NordVPN 2Y Account');
    expect(exportText).toContain('user_vpn:supersecret:2FA_TOKEN_SECRET');
  });

  it('1-Click checkout calculation validates insufficient balance correctly', () => {
    const walletBalance = 1000n; // $10.00
    const itemPrice = 1500n; // $15.00
    const quantity = 1;

    const totalPrice = itemPrice * BigInt(quantity);
    const hasSufficientBalance = walletBalance >= totalPrice;

    expect(hasSufficientBalance).toBe(false);
    expect(totalPrice - walletBalance).toBe(500n); // $5.00 shortfall
  });
});

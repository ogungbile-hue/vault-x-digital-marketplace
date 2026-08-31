import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { DelimiterFormat, StockStatus } from '@app/types';
import { BulkStockParser, BulkIngestionService } from '@app/inventory';
import { decryptPayload, defaultKeyVault } from '@app/crypto';

describe('Admin Bulk Stock Delimiter Parser & Encrypted Ingestion Engine', () => {
  beforeEach(() => {
    const testKey = crypto.randomBytes(32).toString('hex');
    defaultKeyVault.registerKey(1, testKey);
    defaultKeyVault.setCurrentVersion(1);
  });

  describe('BulkStockParser', () => {
    it('should parse user:pass delimiter format and ignore blank lines', () => {
      const rawText = `
        alice@example.com:password123
        bob@domain.org:SecretPass!456
        
        charlie:MySafeP@ss789
      `;

      const result = BulkStockParser.parse(rawText, DelimiterFormat.USER_PASS);

      expect(result.errors).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
      expect(result.validItems).toHaveLength(3);

      expect(result.validItems[0].normalizedPayload).toBe('alice@example.com:password123');
      expect(result.validItems[1].normalizedPayload).toBe('bob@domain.org:SecretPass!456');
      expect(result.validItems[2].normalizedPayload).toBe('charlie:MySafeP@ss789');
    });

    it('should parse uid:pass:2fa_secret format', () => {
      const rawText = `
        user1001:pass999:JBSWY3DPEHPK3PXP
        user1002:pass888:KRSXG5CTMVRXEZLU
      `;

      const result = BulkStockParser.parse(rawText, DelimiterFormat.UID_PASS_2FA);

      expect(result.errors).toHaveLength(0);
      expect(result.validItems).toHaveLength(2);
      expect(result.validItems[0].normalizedPayload).toBe('user1001:pass999:JBSWY3DPEHPK3PXP');
    });

    it('should parse single token license keys', () => {
      const rawText = `
        MICROSOFT-OFFICE-2024-XXXX-YYYY
        MICROSOFT-OFFICE-2024-AAAA-BBBB
        MICROSOFT-OFFICE-2024-CCCC-DDDD
      `;

      const result = BulkStockParser.parse(rawText, DelimiterFormat.LICENSE_KEY);

      expect(result.errors).toHaveLength(0);
      expect(result.validItems).toHaveLength(3);
      expect(result.validItems[0].normalizedPayload).toBe('MICROSOFT-OFFICE-2024-XXXX-YYYY');
    });

    it('should capture malformed lines with 1-based line numbers and error details', () => {
      const rawText = [
        'valid_user:valid_pass',               // Line 1: Valid
        'malformed_line_missing_delimiter',    // Line 2: Error
        'another_user:another_pass',           // Line 3: Valid
        'user_only_colon:',                   // Line 4: Error
      ].join('\n');

      const result = BulkStockParser.parse(rawText, DelimiterFormat.USER_PASS);

      expect(result.validItems).toHaveLength(2);
      expect(result.errors).toHaveLength(2);

      expect(result.errors[0].lineNumber).toBe(2);
      expect(result.errors[0].rawLine).toBe('malformed_line_missing_delimiter');

      expect(result.errors[1].lineNumber).toBe(4);
      expect(result.errors[1].rawLine).toBe('user_only_colon:');
    });

    it('should detect in-batch duplicate entries and segregate them', () => {
      const rawText = `
        alpha@test.com:pass1
        beta@test.com:pass2
        alpha@test.com:pass1
        beta@test.com:pass2
        gamma@test.com:pass3
      `;

      const result = BulkStockParser.parse(rawText, DelimiterFormat.USER_PASS);

      expect(result.validItems).toHaveLength(3); // alpha, beta, gamma
      expect(result.duplicates).toHaveLength(2); // duplicate alpha & beta
      expect(result.duplicates[0].normalizedPayload).toBe('alpha@test.com:pass1');
      expect(result.duplicates[1].normalizedPayload).toBe('beta@test.com:pass2');
    });

    it('should support custom delimiters (e.g. pipe separator |)', () => {
      const rawText = `
        admin | secret123 | token999
        manager | p@ss456 | token888
      `;

      const result = BulkStockParser.parse(rawText, DelimiterFormat.CUSTOM, {
        customDelimiter: '|',
        expectedFieldCount: 3,
      });

      expect(result.errors).toHaveLength(0);
      expect(result.validItems).toHaveLength(2);
      expect(result.validItems[0].normalizedPayload).toBe('admin|secret123|token999');
    });
  });

  describe('BulkIngestionService (End-to-End Encryption & Insertion)', () => {
    let mockStockDatabase: any[] = [];
    let mockTx: any;

    beforeEach(() => {
      mockStockDatabase = [];
      mockTx = {
        product: {
          findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
            if (where.id === 'prod-test-sku') {
              return { id: 'prod-test-sku', title: 'Test SKU' };
            }
            return null;
          }),
        },
        stockItem: {
          createMany: vi.fn().mockImplementation(async ({ data }: any) => {
            for (const item of data) {
              mockStockDatabase.push({
                id: `stock-${crypto.randomUUID()}`,
                ...item,
                createdAt: new Date(),
              });
            }
            return { count: data.length };
          }),
        },
      };
    });

    it('should parse, encrypt with AES-256-GCM, and batch-insert valid items into inventory', async () => {
      const rawPayloads = [
        'user01@mail.com:pass01:2FA_TOKEN_01',
        'user02@mail.com:pass02:2FA_TOKEN_02',
        'user03@mail.com:pass03:2FA_TOKEN_03',
      ].join('\n');

      const summary = await BulkIngestionService.ingestBulkStock(
        {
          productId: 'prod-test-sku',
          rawContent: rawPayloads,
          format: DelimiterFormat.UID_PASS_2FA,
        },
        mockTx
      );

      expect(summary.totalParsed).toBe(3);
      expect(summary.inserted).toBe(3);
      expect(summary.duplicatesSkipped).toBe(0);
      expect(summary.errors).toHaveLength(0);

      // Verify database items were stored in encrypted envelope format
      expect(mockStockDatabase).toHaveLength(3);

      for (let i = 0; i < mockStockDatabase.length; i++) {
        const stored = mockStockDatabase[i];
        expect(stored.productId).toBe('prod-test-sku');
        expect(stored.status).toBe(StockStatus.AVAILABLE);
        expect(stored.payloadCiphertext).toBeDefined();
        expect(stored.iv).toHaveLength(24);
        expect(stored.tag).toHaveLength(32);

        // Verify accurate payload decryption
        const decrypted = decryptPayload({
          ciphertext: stored.payloadCiphertext,
          iv: stored.iv,
          tag: stored.tag,
          keyVersion: stored.keyVersion,
        });

        expect(decrypted).toBe(`user0${i + 1}@mail.com:pass0${i + 1}:2FA_TOKEN_0${i + 1}`);
      }
    });
  });
});

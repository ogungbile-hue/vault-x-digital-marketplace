import {
  BulkIngestionSummary,
  DelimiterFormat,
  StockStatus,
} from '@app/types';
import { prisma, PrismaTransaction } from '@app/database';
import { encryptPayload } from '@app/crypto';
import { BulkStockParser, ParseOptions } from './bulk-parser';

export interface IngestBulkStockInput {
  productId: string;
  rawContent: string;
  format?: DelimiterFormat;
  options?: ParseOptions;
  batchSize?: number;
}

export class BulkIngestionService {
  /**
   * Parses, validates, deduplicates, AES-256-GCM encrypts, and batch-inserts stock credentials into PostgreSQL.
   */
  public static async ingestBulkStock(
    input: IngestBulkStockInput,
    clientOrTx: PrismaTransaction = prisma
  ): Promise<BulkIngestionSummary> {
    const {
      productId,
      rawContent,
      format = DelimiterFormat.LICENSE_KEY,
      options = {},
      batchSize = 100,
    } = input;

    // 1. Verify product exists
    const product = await clientOrTx.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // 2. Parse raw lines
    const parseResult = BulkStockParser.parse(rawContent, format, options);

    if (parseResult.validItems.length === 0) {
      return {
        totalParsed: parseResult.validItems.length + parseResult.duplicates.length + parseResult.errors.length,
        inserted: 0,
        duplicatesSkipped: parseResult.duplicates.length,
        errors: parseResult.errors,
      };
    }

    // 3. Batch Encrypt & Insert
    const encryptedRows = parseResult.validItems.map((item) => {
      const envelope = encryptPayload(item.normalizedPayload);
      return {
        productId,
        status: StockStatus.AVAILABLE,
        payloadCiphertext: envelope.ciphertext,
        iv: envelope.iv,
        tag: envelope.tag,
        keyVersion: envelope.keyVersion,
        version: 1,
      };
    });

    // Chunked insertion to prevent statement parameter limits
    let insertedCount = 0;
    for (let i = 0; i < encryptedRows.length; i += batchSize) {
      const chunk = encryptedRows.slice(i, i + batchSize);
      const res = await clientOrTx.stockItem.createMany({
        data: chunk,
      });
      insertedCount += res.count;
    }

    return {
      totalParsed: parseResult.validItems.length + parseResult.duplicates.length + parseResult.errors.length,
      inserted: insertedCount,
      duplicatesSkipped: parseResult.duplicates.length,
      errors: parseResult.errors,
    };
  }
}

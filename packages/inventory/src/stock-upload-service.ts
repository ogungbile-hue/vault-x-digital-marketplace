import { StockStatus, StockUploadItem } from '@app/types';
import { prisma, PrismaTransaction } from '@app/database';
import { encryptPayload } from '@app/crypto';

export class StockUploadService {
  /**
   * Encrypts and batches raw digital items into the stock database as AVAILABLE inventory.
   */
  public static async uploadStockBatch(
    items: StockUploadItem[],
    clientOrTx: PrismaTransaction = prisma
  ) {
    const encryptedRows = items.map((item) => {
      const envelope = encryptPayload(item.rawPayload);
      return {
        productId: item.productId,
        status: StockStatus.AVAILABLE,
        payloadCiphertext: envelope.ciphertext,
        iv: envelope.iv,
        tag: envelope.tag,
        keyVersion: envelope.keyVersion,
        version: 1,
      };
    });

    return clientOrTx.stockItem.createMany({
      data: encryptedRows,
    });
  }
}

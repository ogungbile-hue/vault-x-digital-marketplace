import { FulfilledItem, RevealRequestMeta } from '@app/types';
import { prisma, PrismaTransaction } from '@app/database';
import { decryptPayload } from '@app/crypto';
import { OrderNotFoundError } from './errors';

export class RevealService {
  /**
   * Decrypts credentials on-demand for authenticated order view in user dashboard.
   * Emits an immutable entry in StockAccessLog for every item revealed.
   */
  public static async revealOrderCredentials(
    userId: string,
    orderId: string,
    meta: RevealRequestMeta = { ipAddress: '127.0.0.1', userAgent: 'Marketplace/1.0' },
    clientOrTx: PrismaTransaction = prisma
  ): Promise<FulfilledItem[]> {
    const order = await clientOrTx.order.findFirst({
      where: {
        id: orderId,
        userId: userId,
      },
      include: {
        items: {
          include: {
            product: true,
            stockItem: true,
          },
        },
      },
    });

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    const fulfilledItems: FulfilledItem[] = [];
    const accessLogs = [];

    for (const item of order.items) {
      const stock = item.stockItem;
      const decrypted = decryptPayload({
        ciphertext: stock.payloadCiphertext,
        iv: stock.iv,
        tag: stock.tag,
        keyVersion: stock.keyVersion,
      });

      fulfilledItems.push({
        stockItemId: stock.id,
        productId: item.productId,
        productTitle: item.product.title,
        decryptedPayload: decrypted,
        price: item.price,
      });

      accessLogs.push({
        stockItemId: stock.id,
        userId: userId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }

    await clientOrTx.stockAccessLog.createMany({
      data: accessLogs,
    });

    return fulfilledItems;
  }
}

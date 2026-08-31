import {
  AccountCategory,
  CheckoutRequest,
  CheckoutResult,
  EntryDirection,
  FulfilledItem,
  LedgerTransactionType,
  OrderStatus,
  RevealRequestMeta,
  StandardAccounts,
  StockStatus,
} from '@app/types';
import { prisma, PrismaTransaction } from '@app/database';
import { decryptPayload } from '@app/crypto';
import { InsufficientBalanceError, LedgerService } from '@app/ledger';
import { InsufficientStockError } from './errors';

interface LockedStockRow {
  id: string;
  product_id: string;
  payload_ciphertext: string;
  iv: string;
  tag: string;
  key_version: number;
}

export class CheckoutService {
  /**
   * Executes 1-click atomic instant checkout:
   * 1. Check idempotency record
   * 2. Pessimistically lock stock items (SELECT FOR UPDATE SKIP LOCKED)
   * 3. Fetch current product prices and calculate totals
   * 4. Check & debit user wallet via Double-Entry Ledger
   * 5. Mark stock items SOLD & create Order + OrderItems
   * 6. Decrypt payloads in-memory and write StockAccessLog
   * 7. Commit & return fulfilled credentials
   */
  public static async executeInstantCheckout(
    request: CheckoutRequest,
    clientMeta: RevealRequestMeta = { ipAddress: '127.0.0.1', userAgent: 'Marketplace/1.0' }
  ): Promise<CheckoutResult> {
    // 1. Idempotency Check
    const existingRecord = await prisma.idempotencyRecord.findUnique({
      where: { key: request.idempotencyKey },
    });

    if (existingRecord && existingRecord.responsePayload) {
      const parsed = JSON.parse(existingRecord.responsePayload);
      // Re-hydrate BigInt / Dates
      return {
        ...parsed,
        totalAmount: BigInt(parsed.totalAmount),
        createdAt: new Date(parsed.createdAt),
        items: parsed.items.map((i: any) => ({
          ...i,
          price: BigInt(i.price),
        })),
      };
    }

    // 2. Execute within atomic transaction
    return prisma.$transaction(async (tx: PrismaTransaction) => {
      const allLockedStockItems: LockedStockRow[] = [];
      const productPriceMap = new Map<string, { title: string; price: bigint }>();

      // Lock requested stock rows for each item
      for (const item of request.items) {
        // Fetch product info & price directly inside transaction
        const product = await tx.product.findUnique({
          where: { id: item.productId, isActive: true },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found or inactive`);
        }
        productPriceMap.set(item.productId, { title: product.title, price: product.price });

        // Pessimistic row locking with SKIP LOCKED
        const lockedRows = await tx.$queryRaw<LockedStockRow[]>`
          SELECT id, product_id, payload_ciphertext, iv, tag, key_version
          FROM stock_items
          WHERE product_id = ${item.productId} AND status = 'AVAILABLE'
          LIMIT ${item.quantity}
          FOR UPDATE SKIP LOCKED
        `;

        if (lockedRows.length < item.quantity) {
          throw new InsufficientStockError(
            item.productId,
            item.quantity,
            lockedRows.length
          );
        }

        allLockedStockItems.push(...lockedRows);
      }

      // Calculate total amount
      let totalAmount = 0n;
      for (const stockRow of allLockedStockItems) {
        const prod = productPriceMap.get(stockRow.product_id)!;
        totalAmount += prod.price;
      }

      // Verify wallet balance
      const wallet = await tx.wallet.findUnique({
        where: { userId: request.userId },
      });

      if (!wallet) {
        throw new Error(`Wallet not found for userId: ${request.userId}`);
      }

      if (wallet.balance < totalAmount) {
        throw new InsufficientBalanceError(wallet.balance, totalAmount);
      }

      // Create Order
      const order = await tx.order.create({
        data: {
          userId: request.userId,
          totalAmount,
          currency: 'USD',
          status: OrderStatus.COMPLETED,
          idempotencyKey: request.idempotencyKey,
        },
      });

      // Update Stock Items to SOLD and link to order
      const stockItemIds = allLockedStockItems.map((s) => s.id);
      await tx.stockItem.updateMany({
        where: { id: { in: stockItemIds } },
        data: {
          status: StockStatus.SOLD,
          orderId: order.id,
        },
      });

      // Create Order Items
      for (const stockRow of allLockedStockItems) {
        const prod = productPriceMap.get(stockRow.product_id)!;
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: stockRow.product_id,
            stockItemId: stockRow.id,
            price: prod.price,
          },
        });
      }

      // Record double-entry ledger transaction
      await LedgerService.recordTransaction(tx, {
        idempotencyKey: request.idempotencyKey,
        type: LedgerTransactionType.ORDER_PAYMENT,
        referenceId: order.id,
        description: `Order payment for Order #${order.id}`,
        entries: [
          {
            accountId: `LIABILITY:USER_WALLET:${request.userId}`,
            accountCategory: AccountCategory.LIABILITY,
            direction: EntryDirection.DEBIT,
            amount: totalAmount,
            currency: 'USD',
          },
          {
            accountId: StandardAccounts.PRODUCT_SALES,
            accountCategory: AccountCategory.REVENUE,
            direction: EntryDirection.CREDIT,
            amount: totalAmount,
            currency: 'USD',
          },
        ],
      });

      // Decrypt stock payloads in-memory & record access logs
      const fulfilledItems: FulfilledItem[] = [];
      const accessLogData = [];

      for (const stockRow of allLockedStockItems) {
        const prod = productPriceMap.get(stockRow.product_id)!;
        const decryptedPayload = decryptPayload({
          ciphertext: stockRow.payload_ciphertext,
          iv: stockRow.iv,
          tag: stockRow.tag,
          keyVersion: stockRow.key_version,
        });

        fulfilledItems.push({
          stockItemId: stockRow.id,
          productId: stockRow.product_id,
          productTitle: prod.title,
          decryptedPayload,
          price: prod.price,
        });

        accessLogData.push({
          stockItemId: stockRow.id,
          userId: request.userId,
          ipAddress: clientMeta.ipAddress,
          userAgent: clientMeta.userAgent,
        });
      }

      await tx.stockAccessLog.createMany({
        data: accessLogData,
      });

      const checkoutResult: CheckoutResult = {
        orderId: order.id,
        userId: request.userId,
        status: OrderStatus.COMPLETED,
        totalAmount,
        items: fulfilledItems,
        createdAt: order.createdAt,
      };

      // Store idempotency record
      await tx.idempotencyRecord.create({
        data: {
          key: request.idempotencyKey,
          action: 'CHECKOUT',
          responsePayload: JSON.stringify({
            ...checkoutResult,
            totalAmount: checkoutResult.totalAmount.toString(),
            items: checkoutResult.items.map((i) => ({
              ...i,
              price: i.price.toString(),
            })),
          }),
        },
      });

      return checkoutResult;
    });
  }
}

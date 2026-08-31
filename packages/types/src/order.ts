import { z } from 'zod';

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export const CheckoutRequestSchema = z.object({
  userId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ).min(1, 'At least one item required for checkout'),
  idempotencyKey: z.string().uuid(),
});

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export const FulfilledItemSchema = z.object({
  stockItemId: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  decryptedPayload: z.string(),
  price: z.bigint(),
});

export type FulfilledItem = z.infer<typeof FulfilledItemSchema>;

export const CheckoutResultSchema = z.object({
  orderId: z.string(),
  userId: z.string(),
  status: z.nativeEnum(OrderStatus),
  totalAmount: z.bigint(),
  items: z.array(FulfilledItemSchema),
  createdAt: z.date(),
});

export type CheckoutResult = z.infer<typeof CheckoutResultSchema>;

export const RevealRequestMetaSchema = z.object({
  ipAddress: z.string().default('127.0.0.1'),
  userAgent: z.string().default('Unknown/1.0'),
});

export type RevealRequestMeta = z.infer<typeof RevealRequestMetaSchema>;

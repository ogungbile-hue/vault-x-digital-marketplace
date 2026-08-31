import { z } from 'zod';
import { EncryptedEnvelopeSchema } from './crypto';

export enum StockStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  DEFECTIVE = 'DEFECTIVE',
}

export const StockUploadItemSchema = z.object({
  productId: z.string().min(1),
  rawPayload: z.string().min(1, 'Digital payload cannot be empty'),
});

export type StockUploadItem = z.infer<typeof StockUploadItemSchema>;

export const StockItemRowSchema = z.object({
  id: z.string(),
  productId: z.string(),
  status: z.nativeEnum(StockStatus),
  payloadCiphertext: z.string(),
  iv: z.string(),
  tag: z.string(),
  keyVersion: z.number(),
  version: z.number(),
  orderId: z.string().nullable(),
  lockedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type StockItemRow = z.infer<typeof StockItemRowSchema>;

import { z } from 'zod';

export enum WebhookProvider {
  PAYSTACK = 'PAYSTACK',
  CRYPTO_GENERIC = 'CRYPTO_GENERIC',
  COINBASE = 'COINBASE',
  NOWPAYMENTS = 'NOWPAYMENTS',
}

export enum WebhookStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  DUPLICATE = 'DUPLICATE',
}

export const IngestWebhookParamSchema = z.object({
  provider: z.nativeEnum(WebhookProvider),
  signature: z.string().optional(),
  rawBody: z.string(),
  secretKey: z.string(),
});

export type IngestWebhookParam = z.infer<typeof IngestWebhookParamSchema>;

export const NormalizedDepositEventSchema = z.object({
  provider: z.nativeEnum(WebhookProvider),
  externalEventId: z.string().min(1),
  userId: z.string().min(1),
  amount: z.bigint().positive(),
  currency: z.string().length(3).default('USD'),
  reference: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

export type NormalizedDepositEvent = z.infer<typeof NormalizedDepositEventSchema>;

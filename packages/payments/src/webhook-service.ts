import {
  NormalizedDepositEvent,
  WebhookProvider,
  WebhookStatus,
} from '@app/types';
import { prisma, PrismaTransaction } from '@app/database';
import { LedgerService } from '@app/ledger';
import {
  InvalidSignatureError,
  DuplicateWebhookError,
} from './errors';
import {
  verifyCryptoWebhookSignature,
  verifyPaystackSignature,
} from './signatures';

export interface ProcessWebhookResult {
  success: boolean;
  status: WebhookStatus;
  eventId: string;
  depositAmount?: bigint;
  error?: string;
}

export class WebhookService {
  /**
   * Validates cryptographic signature for the given provider.
   */
  public static verifySignature(
    provider: WebhookProvider,
    rawBody: string,
    signature: string | undefined,
    secretKey: string
  ): boolean {
    switch (provider) {
      case WebhookProvider.PAYSTACK:
        return verifyPaystackSignature(rawBody, signature, secretKey);
      case WebhookProvider.CRYPTO_GENERIC:
      case WebhookProvider.COINBASE:
      case WebhookProvider.NOWPAYMENTS:
        return verifyCryptoWebhookSignature(rawBody, signature, secretKey);
      default:
        return false;
    }
  }

  /**
   * Normalizes gateway-specific payload into a standard NormalizedDepositEvent.
   */
  public static parseDepositPayload(
    provider: WebhookProvider,
    payload: any
  ): NormalizedDepositEvent {
    if (provider === WebhookProvider.PAYSTACK) {
      // Paystack charge.success payload
      const eventData = payload.data || payload;
      const externalEventId = String(payload.event === 'charge.success' ? eventData.id : eventData.reference || eventData.id);
      const userId = eventData.metadata?.userId || eventData.customer?.customer_code || eventData.customer?.email;
      const amount = BigInt(eventData.amount); // Paystack sends amounts in minor units (kobo/cents)
      const currency = eventData.currency || 'USD';
      const reference = eventData.reference || externalEventId;

      return {
        provider,
        externalEventId,
        userId,
        amount,
        currency,
        reference,
        metadata: eventData.metadata || {},
      };
    }

    if (provider === WebhookProvider.CRYPTO_GENERIC || provider === WebhookProvider.NOWPAYMENTS) {
      // Crypto processor deposit payload
      const externalEventId = String(payload.payment_id || payload.txId || payload.id);
      const userId = payload.userId || payload.customer_id || payload.order_id;
      // Convert crypto amount or minor cents
      const amount = typeof payload.amount_cents !== 'undefined'
        ? BigInt(payload.amount_cents)
        : BigInt(Math.round(Number(payload.amount || payload.pay_amount || 0) * 100));

      return {
        provider,
        externalEventId,
        userId,
        amount,
        currency: payload.currency || 'USDT',
        reference: payload.reference || externalEventId,
        metadata: payload,
      };
    }

    throw new Error(`Unsupported webhook provider: ${provider}`);
  }

  /**
   * Atomically ingests, verifies signature, records webhook audit log, and credits ledger.
   * Guarantees that replay attacks (duplicate delivery) are safely recognized without double-crediting.
   */
  public static async processDepositWebhook(
    provider: WebhookProvider,
    rawBody: string,
    signature: string | undefined,
    secretKey: string,
    clientOrTx: PrismaTransaction = prisma
  ): Promise<ProcessWebhookResult> {
    // 1. Cryptographic Signature Verification
    const isValid = this.verifySignature(provider, rawBody, signature, secretKey);
    if (!isValid) {
      throw new InvalidSignatureError(provider);
    }

    const payload = JSON.parse(rawBody);
    const normalized = this.parseDepositPayload(provider, payload);

    // 2. Check for duplicate webhook delivery
    const existingEvent = await clientOrTx.webhookEvent.findUnique({
      where: {
        provider_externalEventId: {
          provider,
          externalEventId: normalized.externalEventId,
        },
      },
    });

    if (existingEvent) {
      if (existingEvent.status === WebhookStatus.PROCESSED) {
        return {
          success: true,
          status: WebhookStatus.DUPLICATE,
          eventId: existingEvent.id,
          depositAmount: normalized.amount,
        };
      }
    }

    // 3. Execute Ledger Credit & State Transition within Atomic DB Transaction
    const executeInTx = async (tx: PrismaTransaction) => {
      // Create or update WebhookEvent audit record
      const webhookRecord = await tx.webhookEvent.upsert({
        where: {
          provider_externalEventId: {
            provider,
            externalEventId: normalized.externalEventId,
          },
        },
        create: {
          provider,
          externalEventId: normalized.externalEventId,
          signature,
          payloadJson: rawBody,
          status: WebhookStatus.PENDING,
        },
        update: {
          status: WebhookStatus.PENDING,
        },
      });

      // Record double-entry deposit transaction:
      // DEBIT: ASSET:PLATFORM_CASH
      // CREDIT: LIABILITY:USER_WALLET:<userId>
      const idempotencyKey = `webhook:${provider.toLowerCase()}:${normalized.externalEventId}`;
      await LedgerService.recordDeposit(tx, {
        userId: normalized.userId,
        amount: normalized.amount,
        idempotencyKey,
        referenceId: normalized.reference,
        description: `Automated ${provider} deposit of ${normalized.amount} (Ref: ${normalized.reference})`,
      });

      // Transition WebhookEvent to PROCESSED
      await tx.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          status: WebhookStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      return {
        success: true,
        status: WebhookStatus.PROCESSED,
        eventId: webhookRecord.id,
        depositAmount: normalized.amount,
      };
    };

    // If clientOrTx already supports $transaction, use it, else run transaction
    if (typeof (clientOrTx as any).$transaction === 'function') {
      return (clientOrTx as any).$transaction(executeInTx);
    }
    return executeInTx(clientOrTx);
  }
}

import { z } from 'zod';

export const EncryptedEnvelopeSchema = z.object({
  ciphertext: z.string().min(1, 'Ciphertext cannot be empty'),
  iv: z.string().length(24, 'Hex-encoded IV must be 12 bytes (24 hex chars)'),
  tag: z.string().length(32, 'Hex-encoded Auth Tag must be 16 bytes (32 hex chars)'),
  keyVersion: z.number().int().positive().default(1),
});

export type EncryptedEnvelope = z.infer<typeof EncryptedEnvelopeSchema>;

export interface KeyVaultProvider {
  getKey(version: number): Buffer;
  getCurrentVersion(): number;
}

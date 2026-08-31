import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { AesGcmVault, EnvKeyVault } from '@app/crypto';

describe('Cryptographic Vault (AES-256-GCM)', () => {
  let keyVault: EnvKeyVault;
  let aesVault: AesGcmVault;
  const testKeyV1 = crypto.randomBytes(32).toString('hex');
  const testKeyV2 = crypto.randomBytes(32).toString('hex');

  beforeEach(() => {
    keyVault = new EnvKeyVault();
    keyVault.registerKey(1, testKeyV1);
    keyVault.registerKey(2, testKeyV2);
    keyVault.setCurrentVersion(1);
    aesVault = new AesGcmVault({ keyVault });
  });

  it('should successfully encrypt and decrypt digital stock credentials', () => {
    const rawSecret = 'STREAM-PREMIUM-KEY-9988-7766-ABCD';
    const envelope = aesVault.encrypt(rawSecret);

    expect(envelope.ciphertext).toBeDefined();
    expect(envelope.ciphertext).not.toBe(rawSecret);
    expect(envelope.iv).toHaveLength(24); // 12 bytes = 24 hex chars
    expect(envelope.tag).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(envelope.keyVersion).toBe(1);

    const decrypted = aesVault.decrypt(envelope);
    expect(decrypted).toBe(rawSecret);
  });

  it('should reject decryption and throw when ciphertext is tampered with', () => {
    const rawSecret = 'ACCOUNT:user@example.com|PASS:supersecret123';
    const envelope = aesVault.encrypt(rawSecret);

    // Tamper with the last byte of ciphertext
    const tamperedHex = envelope.ciphertext.slice(0, -2) + (envelope.ciphertext.slice(-2) === 'aa' ? 'bb' : 'aa');
    const tamperedEnvelope = { ...envelope, ciphertext: tamperedHex };

    expect(() => aesVault.decrypt(tamperedEnvelope)).toThrow();
  });

  it('should reject decryption and throw when authentication tag is tampered with', () => {
    const rawSecret = 'LICENSE-KEY-ABC-123';
    const envelope = aesVault.encrypt(rawSecret);

    // Tamper with the auth tag
    const tamperedTag = envelope.tag.slice(0, -2) + (envelope.tag.slice(-2) === '00' ? 'ff' : '00');
    const tamperedEnvelope = { ...envelope, tag: tamperedTag };

    expect(() => aesVault.decrypt(tamperedEnvelope)).toThrow();
  });

  it('should reject decryption when IV is modified', () => {
    const rawSecret = 'LICENSE-KEY-XYZ-999';
    const envelope = aesVault.encrypt(rawSecret);

    const tamperedIv = envelope.iv.slice(0, -2) + (envelope.iv.slice(-2) === '11' ? '22' : '11');
    const tamperedEnvelope = { ...envelope, iv: tamperedIv };

    expect(() => aesVault.decrypt(tamperedEnvelope)).toThrow();
  });

  it('should support key rotation across multiple key versions seamlessly', () => {
    const secretV1 = 'OLD-KEY-GENERATED-WITH-V1';
    const envelopeV1 = aesVault.encrypt(secretV1, 1);

    // Rotate current key to V2
    keyVault.setCurrentVersion(2);

    const secretV2 = 'NEW-KEY-GENERATED-WITH-V2';
    const envelopeV2 = aesVault.encrypt(secretV2);

    expect(envelopeV1.keyVersion).toBe(1);
    expect(envelopeV2.keyVersion).toBe(2);

    // Both can be decrypted concurrently using their respective key version
    expect(aesVault.decrypt(envelopeV1)).toBe(secretV1);
    expect(aesVault.decrypt(envelopeV2)).toBe(secretV2);
  });
});

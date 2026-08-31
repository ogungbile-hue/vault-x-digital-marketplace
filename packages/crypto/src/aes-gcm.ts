import crypto from 'node:crypto';
import { EncryptedEnvelope, KeyVaultProvider } from '@app/types';
import { defaultKeyVault } from './key-vault';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // 96-bit standard for GCM
const AUTH_TAG_LENGTH_BYTES = 16; // 128-bit authentication tag

export interface CryptoServiceOptions {
  keyVault?: KeyVaultProvider;
}

export class AesGcmVault {
  private keyVault: KeyVaultProvider;

  constructor(options: CryptoServiceOptions = {}) {
    this.keyVault = options.keyVault || defaultKeyVault;
  }

  /**
   * Encrypts plaintext string into an AES-256-GCM envelope with an authentication tag.
   */
  public encrypt(plaintext: string, keyVersion?: number): EncryptedEnvelope {
    const version = keyVersion ?? this.keyVault.getCurrentVersion();
    const key = this.keyVault.getKey(version);
    const iv = crypto.randomBytes(IV_LENGTH_BYTES);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    });

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag: authTag.toString('hex'),
      keyVersion: version,
    };
  }

  /**
   * Authenticates and decrypts an AES-256-GCM envelope back to plaintext string.
   * Throws an authentication error if ciphertext, IV, or auth tag was altered.
   */
  public decrypt(envelope: EncryptedEnvelope): string {
    const key = this.keyVault.getKey(envelope.keyVersion);
    const iv = Buffer.from(envelope.iv, 'hex');
    const authTag = Buffer.from(envelope.tag, 'hex');

    if (iv.length !== IV_LENGTH_BYTES) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH_BYTES} bytes, got ${iv.length}`);
    }

    if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
      throw new Error(`Invalid Auth Tag length: expected ${AUTH_TAG_LENGTH_BYTES} bytes, got ${authTag.length}`);
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    });

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(envelope.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export const defaultAesVault = new AesGcmVault();

export function encryptPayload(plaintext: string, keyVersion?: number): EncryptedEnvelope {
  return defaultAesVault.encrypt(plaintext, keyVersion);
}

export function decryptPayload(envelope: EncryptedEnvelope): string {
  return defaultAesVault.decrypt(envelope);
}

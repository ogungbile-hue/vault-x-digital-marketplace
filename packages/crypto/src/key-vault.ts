import { KeyVaultProvider } from '@app/types';

export class EnvKeyVault implements KeyVaultProvider {
  private keys: Map<number, Buffer> = new Map();
  private currentVersion: number = 1;

  constructor() {
    this.loadFromEnvironment();
  }

  public registerKey(version: number, keyHexOrBuffer: string | Buffer): void {
    const keyBuf = typeof keyHexOrBuffer === 'string'
      ? Buffer.from(keyHexOrBuffer, 'hex')
      : keyHexOrBuffer;

    if (keyBuf.length !== 32) {
      throw new Error(`Master key for version ${version} must be exactly 32 bytes (256 bits). Received: ${keyBuf.length} bytes.`);
    }

    this.keys.set(version, keyBuf);
    if (version > this.currentVersion) {
      this.currentVersion = version;
    }
  }

  public getKey(version: number): Buffer {
    const key = this.keys.get(version);
    if (!key) {
      throw new Error(`Encryption key version ${version} not found in KeyVault.`);
    }
    return key;
  }

  public getCurrentVersion(): number {
    return this.currentVersion;
  }

  public setCurrentVersion(version: number): void {
    if (!this.keys.has(version)) {
      throw new Error(`Cannot set current key version to ${version}; key is not registered.`);
    }
    this.currentVersion = version;
  }

  private loadFromEnvironment(): void {
    const currentVerStr = process.env.CURRENT_KEY_VERSION;
    if (currentVerStr) {
      const parsed = parseInt(currentVerStr, 10);
      if (!isNaN(parsed) && parsed > 0) {
        this.currentVersion = parsed;
      }
    }

    // Scan environment for MASTER_ENCRYPTION_KEY_V<N> or fallback MASTER_ENCRYPTION_KEY
    for (const [key, val] of Object.entries(process.env)) {
      if (key.startsWith('MASTER_ENCRYPTION_KEY_V') && val) {
        const verStr = key.replace('MASTER_ENCRYPTION_KEY_V', '');
        const ver = parseInt(verStr, 10);
        if (!isNaN(ver) && ver > 0) {
          try {
            this.registerKey(ver, val);
          } catch {
            // Ignore invalid length in env during initial load if testing
          }
        }
      }
    }

    // Default fallback if V1 not yet loaded
    if (process.env.MASTER_ENCRYPTION_KEY && !this.keys.has(1)) {
      try {
        this.registerKey(1, process.env.MASTER_ENCRYPTION_KEY);
      } catch {
        // Fallback handled in test/runtime
      }
    }
  }
}

export const defaultKeyVault = new EnvKeyVault();

# VAULT-X Core Architectural Knowledge Base

## 1. Concurrency Control & Inventory Allocation
- **Pessimistic Row-Level Locking:** Inventory allocation strictly requires raw SQL `SELECT ... FOR UPDATE SKIP LOCKED` inside an atomic PostgreSQL database transaction.
- **Zero Double-Spend Guarantee:** Never use Prisma's fluent `prisma.stockItem.findFirst()` for concurrent stock reservation, as it lacks row-level mutex guarantees under high load.
- **Race Condition Verification:** 20 parallel checkouts against 1 remaining stock unit must yield exactly 1 successful sale and 19 clean rejections without balance corruption.

## 2. Double-Entry Financial Invariants
- **Minor Units Precision:** All currency amounts are stored as integer minor units (`BigInt` / Cents / Kobo). Floating-point arithmetic is strictly prohibited.
- **Balanced Journal Ledger:** No wallet balance update may occur without an accompanying balanced `LedgerTransaction` where `SUM(debits) === SUM(credits)`.
- **Non-Negative Wallets:** Wallets enforce a database-level `CHECK (balance >= 0)`. Administrative disputes are recorded as explicit dispute ledger entries rather than silent negative balance mutations.
- **Chart of Accounts:**
  - `ASSET:PLATFORM_CASH`
  - `LIABILITY:USER_WALLET:<userId>`
  - `REVENUE:PRODUCT_SALES` / `REVENUE:PLATFORM_FEE`
  - `EXPENSE:GATEWAY_FEES` / `EXPENSE:REFUNDS`

## 3. Cryptographic Stock Vault (AES-256-GCM)
- **Encryption at Rest:** All sensitive digital credentials and secrets are encrypted with `AES-256-GCM` before inserting into PostgreSQL.
- **Envelope Metadata:** Stored as `ciphertext`, `iv` (12 bytes / 24 hex), `tag` (16 bytes / 32 hex), and `key_version` (integer).
- **Zero-Downtime Key Rotation:** Master keys are resolved by `key_version` through the Key Vault registry.
- **Access Auditing:** In-memory decryption at checkout or via `GET /api/orders/:id/reveal` generates an immutable `StockAccessLog` record (`stock_item_id`, `user_id`, `ip_address`, `user_agent`, `revealed_at`).

## 4. Bulk Stock Ingestion Engine
- **Supported Delimiters:** `user:pass`, `uid:pass:2fa_secret`, `uid:pass:2fa_secret:cookie`, `license_key`, and custom separators (`|`, `,`, `;`).
- **Interactive Syntax Validation:** Pre-commit line-numbered error detection highlights malformed rows in red before committing to database.
- **In-Batch Deduplication:** Duplicates within a batch are segregated and skipped.

## 5. Webhook Security & Idempotency Pipeline
- **Cryptographic Verification:** Signatures are validated using timing-safe comparisons (`crypto.timingSafeEqual`) against Paystack HMAC-SHA512 and generic Crypto HMAC-SHA256.
- **Replay Protection:** Unique constraint on `[provider, externalEventId]` in `WebhookEvent` table ensures replayed webhooks return `DUPLICATE` without duplicate ledger credits.

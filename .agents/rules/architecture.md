# System Architecture & Non-Negotiable Invariants

## 1. System Overview
High-concurrency, instant-fulfillment digital goods marketplace (**VAULT-X**) featuring an immutable double-entry ledger wallet engine, payload-encrypted stock vault (AES-256-GCM), and pessimistic row-locked inventory allocation (`SELECT ... FOR UPDATE SKIP LOCKED`).

## 2. Core Tech Stack
- **Frontend / Fullstack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI / Lucide React
- **State & Data Synchronization:** TanStack Query, Zustand
- **Backend / APIs:** Next.js Server Actions & Route Handlers (Node.js runtime)
- **Primary Database & ORM:** PostgreSQL + Prisma ORM (with raw SQL queries where atomic row-locking/concurrency guarantees are required)
- **Message Broker & Cache:** Redis + BullMQ
- **Testing Suite:** Vitest + Supertest (32/32 tests passing)

---

## 3. Strict Architectural Invariants & Rules

### A. Zero Client Trust & Transaction Boundaries
1. All mutations involving balances, discounts, vouchers, stock allocation, and cart total calculations must occur server-side inside explicit database transactions.
2. Prices and product configurations are fetched directly from the database during transaction execution; never trust client-submitted amounts.

### B. Double-Entry Financial Ledger Engine
1. **Chart of Accounts:**
   - `ASSET:PLATFORM_CASH` (External gateway funds received)
   - `LIABILITY:USER_WALLET:<userId>` (Customer deposit balances)
   - `REVENUE:PRODUCT_SALES` / `REVENUE:PLATFORM_FEE`
   - `EXPENSE:GATEWAY_FEES` / `EXPENSE:REFUNDS`
2. **Balanced Entries:** Every financial event generates a single immutable `LedgerTransaction` record linked to balanced `LedgerEntry` records (debit and credit).
3. **Invariant:** `SUM(debits) === SUM(credits)` across every transaction and system-wide.
4. **Monetary Precision:** All amounts stored as integer minor units (`BigInt` / Cents / Kobo) to prevent floating-point drift.
5. **Wallet Balance Constraint:** Database-level `CHECK (balance >= 0)` on `Wallets`. No silent negative mutations. Administrative disputes are recorded as explicit dispute ledger entries.
6. **No Raw Mutation:** Direct balance updates without corresponding ledger entries are strictly forbidden.

### C. Pessimistic Inventory Allocation & Zero Double-Spend
1. **1-Click Instant Transaction:** For wallet checkouts, row-level locking (`SELECT ... FOR UPDATE SKIP LOCKED`), balance deduction, ledger writes, order creation, and stock status mutation to `SOLD` execute within a single atomic database transaction. Never use `prisma.stockItem.findFirst()` for concurrent stock allocation.
2. **Direct-Pay Hold / Fallback:** 3-minute hold with optimistic locking `version`. If payment arrives post-reclaim, funds are safely credited to `LIABILITY:USER_WALLET` as an automated deposit.

### D. Payload Encryption at Rest (AES-256-GCM) & Access Audit Log
1. Sensitive stock payloads must be encrypted using `AES-256-GCM` before database insertion.
2. Envelope contains: `key_version` (integer, default 1), `payload_ciphertext`, `iv` (12 bytes), and `tag` (16 bytes).
3. Decryption happens strictly in-memory during checkout fulfillment or via `GET /api/orders/:id/reveal`.
4. Every decryption event must write to an immutable `StockAccessLog` table (`stock_item_id`, `user_id`, `ip_address`, `user_agent`, `revealed_at`).

### E. Ingestion Delimiter Parsing & Syntax Validation
1. Supported formats: `user:pass`, `uid:pass:2fa_secret`, `uid:pass:2fa_secret:cookie`, `license_key`, and custom delimiters.
2. Pre-commit syntax validation catches malformed lines with 1-based line numbers and deduplicates within the batch before AES-256-GCM encryption.

### F. Idempotency Standard & Webhook Security
1. All checkout mutations, deposit webhooks, and balance adjustments require an `Idempotency-Key` (UUIDv4) or provider event ID.
2. Webhooks verify HMAC signatures using `crypto.timingSafeEqual` and de-duplicate by `[provider, externalEventId]`.

---

## 4. References & Guides
- [knowledge-base.md](file:///C:/Users/shadows%20box/.gemini/antigravity-ide/scratch/digital-marketplace/.agents/rules/knowledge-base.md): In-depth architectural rules and invariant reference.
- [demo-and-handoff.md](file:///C:/Users/shadows%20box/.gemini/antigravity-ide/scratch/digital-marketplace/.agents/rules/demo-and-handoff.md): Client presentation demo script and production launch guide.

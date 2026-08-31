# VAULT-X: High-Concurrency Digital Goods Marketplace

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.22-teal)
![Vitest](https://img.shields.io/badge/Tests-32%20Passing-brightgreen)

VAULT-X is a high-concurrency, instant-fulfillment digital goods marketplace built with Next.js 14, TypeScript, PostgreSQL (Prisma), Redis, and Tailwind CSS. It features an immutable double-entry ledger wallet engine, pessimistic row-locked stock allocation, payload-level AES-256-GCM encryption at rest, and an operator back-office command center.

---

## 🌟 Core Architecture & Invariants

1. **Zero-Trust Concurrency Control:**
   - Digital stock allocation uses PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE SKIP LOCKED`) inside atomic transactions to eliminate double-spending under high concurrency.
2. **Double-Entry Financial Ledger:**
   - Every wallet balance modification (Deposit, Purchase, Refund) writes balanced `DEBIT` and `CREDIT` records (`SUM(debits) === SUM(credits)`).
   - Wallets enforce non-negative constraints (`CHECK (balance >= 0)`) in integer minor units (`BigInt` / Cents / Kobo).
3. **Cryptographic Vault (AES-256-GCM):**
   - Sensitive digital stock payloads are encrypted with 12-byte random IVs and 16-byte authentication tags.
   - Master key rotation via key versioning (`key_version`).
   - Every in-memory decryption event generates an immutable `StockAccessLog` audit record.
4. **Admin Bulk Stock Delimiter Parser:**
   - Ingests multi-line accounts with configurable delimiters (`user:pass`, `uid:pass:2fa_secret`, `license_key`, `custom`).
   - Real-time syntax error validation with line numbers and in-batch deduplication before AES-256-GCM encryption.
5. **Payment Webhook Security & Idempotency:**
   - Timing-safe HMAC signature verification for Paystack (SHA-512) and generic Crypto processors (SHA-256).
   - Replay protection guarantees that duplicate webhook deliveries return `DUPLICATE` without double ledger credits.

---

## 📂 Monorepo Structure

```text
digital-marketplace/
├── apps/
│   └── web/                   # Next.js 14 App Router, Tailwind CSS, TanStack Query, Zustand
├── packages/
│   ├── types/                 # Shared domain DTOs, Zod schemas, Enums
│   ├── database/              # Prisma schema, client singleton, database seeder
│   ├── crypto/                # AES-256-GCM encryption vault & multi-version key manager
│   ├── ledger/                # Double-entry ledger service, balance projections & audit
│   ├── inventory/             # Row-locked checkout, bulk delimiter parser & catalog
│   └── payments/              # Paystack & Crypto HMAC signature verification & webhooks
├── Dockerfile                 # Multi-stage production container build
├── docker-compose.yml         # Full stack orchestration (PostgreSQL + Redis + Next.js App)
└── tests/
    └── integration/           # 8 automated test suites (32 tests passing)
```

---

## 🧪 Running Automated Tests

```bash
# Execute all 32 integration tests
npx vitest run
```

```text
 ✓ tests/integration/crypto.test.ts          (5 tests) - GCM encryption, tampering rejection & key rotation
 ✓ tests/integration/ledger.test.ts          (5 tests) - Double-entry balancing & no overdrafts
 ✓ tests/integration/webhooks.test.ts        (4 tests) - Paystack/Crypto HMAC signatures & replay safety
 ✓ tests/integration/web-api.test.ts         (3 tests) - Live syntax preview, .txt export formatting
 ✓ tests/integration/catalog.test.ts         (2 tests) - Category badges & SKU stock aggregation
 ✓ tests/integration/concurrency.test.ts     (2 tests) - 20 parallel checkouts against 1 stock item
 ✓ tests/integration/bulk-ingestion.test.ts  (7 tests) - Delimiter parsing, line errors, batch encryption
 ✓ tests/integration/security.test.ts        (4 tests) - Sliding-window rate limiting & error masking

 Test Files  8 passed (8)
      Tests  32 passed (32)
```

---

## 🚀 Quick Start (Development)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Generate Prisma client & seed database:**
   ```bash
   npm run db:generate
   npm run db:seed
   ```

4. **Start local development server:**
   ```bash
   npm run dev --workspace=web
   ```
   Open [http://localhost:3000](http://localhost:3000) (or port displayed in terminal).

---

## 🐳 Docker Deployment

```bash
# Launch PostgreSQL, Redis, and Web App containers
docker compose up --build -d

# Seed baseline categories, products, and encrypted stock
docker compose exec web npm run db:seed
```

---

## 🔒 Admin Access

- Access the back-office command center at `/admin`.
- Authenticate through the Operator Gate using passkey `admin` or `admin2026`.

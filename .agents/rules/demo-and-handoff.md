# VAULT-X Client Presentation, Demo Checklist & Production Handoff

## 1. Client Presentation & Demo Flow Checklist

Structure client demonstrations around these four high-impact flows:

### Flow 1: The Storefront Experience (`/`)
- Showcase the modern Tailwind glassmorphism catalog.
- Demonstrate dynamic badge filtering (*USA*, *Aged 2018–2023*, *2FA Enabled*, *Dedicated IP*).
- Highlight real-time stock counters (`AVAILABLE` count vs. `Sold Out` states) and debounced instant search.

### Flow 2: 1-Click Instant Fulfillment & Decrypted Reveal
- Trigger a purchase from the pre-funded demo wallet ($100.00).
- Show the sub-50ms execution speed, the immediate post-purchase reveal modal, masked/unmasked toggle, 1-click clipboard copy, and `.txt` file export.
- Navigate to `/dashboard/orders` to demonstrate perpetual on-demand credential decryption and access audit logging.

### Flow 3: Back-Office Ingestion Power Tool (`/admin/inventory/upload`)
- Paste 50–100 raw multi-line account credentials with delimiters (`user:pass:2fa`).
- Demonstrate the live syntax validator highlighting malformed lines in red with line numbers and in-batch duplicates in amber.
- Execute batch AES-256-GCM encryption and verify real-time inventory increment in the catalog.

### Flow 4: Financial Ledger Transparency & Webhook Inspector (`/admin/ledger`)
- Walk through the immutable double-entry journal transactions.
- Point out the `SUM(debits) === SUM(credits)` mathematical invariant card.
- Inspect gateway webhook delivery logs and demonstrate replay attack protection.

---

## 2. Production Handoff & Launch Command

To launch the full production environment locally or on a cloud VPS:

```bash
# 1. Clone repository and configure production environment variables
cp .env.example .env

# 2. Launch PostgreSQL, Redis, and Next.js fullstack container stack
docker compose up --build -d

# 3. Seed baseline categories, sample stock, and admin credentials
docker compose exec web npm run db:seed
```

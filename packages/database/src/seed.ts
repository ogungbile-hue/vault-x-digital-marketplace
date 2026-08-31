import crypto from 'node:crypto';
import { prisma } from './client.js';
import { encryptPayload, defaultKeyVault } from '@app/crypto';
import { LedgerService } from '@app/ledger';
import { ProductStatus, StockStatus } from '@app/types';

export async function seedDatabase() {
  console.log('Seeding digital marketplace database...');

  // 1. Setup Master Key in Key Vault
  const masterKey = process.env.MASTER_ENCRYPTION_KEY_V1 || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  defaultKeyVault.registerKey(1, masterKey);
  defaultKeyVault.setCurrentVersion(1);

  // 2. Create Users & Wallets
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@marketplace.io' },
    update: {},
    create: {
      id: 'user-default-buyer',
      email: 'buyer@marketplace.io',
      name: 'Alex Buyer',
      wallet: {
        create: {
          balance: 0n,
          currency: 'USD',
        },
      },
    },
    include: { wallet: true },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@marketplace.io' },
    update: {},
    create: {
      id: 'user-admin-operator',
      email: 'admin@marketplace.io',
      name: 'Admin Operator',
      role: 'ADMIN',
      wallet: {
        create: {
          balance: 0n,
          currency: 'USD',
        },
      },
    },
  });

  // 3. Deposit $100.00 into Buyer's Wallet via Double-Entry Ledger
  const depositKey = 'seed:initial-deposit:buyer-100';
  const existingTx = await prisma.ledgerTransaction.findUnique({
    where: { idempotencyKey: depositKey },
  });

  if (!existingTx && buyer.wallet) {
    await prisma.$transaction(async (tx) => {
      await LedgerService.recordDeposit(tx, {
        userId: buyer.id,
        amount: 10000n, // $100.00 in cents
        idempotencyKey: depositKey,
        referenceId: 'DEP-SEED-100',
        description: 'Initial seed deposit of $100.00 to Alex Buyer',
      });
    });
    console.log('Initial wallet funded: $100.00 deposited to buyer via balanced ledger.');
  }

  // 4. Create Categories
  const catSocial = await prisma.category.upsert({
    where: { slug: 'social-accounts' },
    update: {},
    create: {
      name: 'Social Accounts',
      slug: 'social-accounts',
      icon: 'users',
      badges: ['USA', 'Aged 2018-2023', '2FA Enabled', 'Instant'],
    },
  });

  const catVpn = await prisma.category.upsert({
    where: { slug: 'vpns-proxies' },
    update: {},
    create: {
      name: 'VPNs & Proxies',
      slug: 'vpns-proxies',
      icon: 'shield',
      badges: ['Dedicated IP', 'No Logs', 'Residential'],
    },
  });

  const catStreaming = await prisma.category.upsert({
    where: { slug: 'streaming-entertainment' },
    update: {},
    create: {
      name: 'Streaming & Media',
      slug: 'streaming-entertainment',
      icon: 'tv',
      badges: ['4K UHD', 'Private Profile', 'Warranty 30D'],
    },
  });

  const catDev = await prisma.category.upsert({
    where: { slug: 'developer-tools' },
    update: {},
    create: {
      name: 'Developer & OS Licenses',
      slug: 'developer-tools',
      icon: 'code',
      badges: ['Official Key', 'Instant Activation', 'Lifetime'],
    },
  });

  // 5. Create Products & Encrypted Stock Items
  const sampleProducts = [
    {
      title: 'Twitter / X Aged (2020) + 2FA Secret',
      slug: 'twitter-aged-2020-2fa',
      categoryId: catSocial.id,
      price: 699n, // $6.99
      description: 'Aged 2020 account with active cookies and 2FA TOTP secret key for 1-click authenticator login.',
      stockPayloads: [
        'x_user_2020_01@mail.com:P@ssword2020:JBSWY3DPEHPK3PXP',
        'x_user_2020_02@mail.com:SecretPass2020:KRSXG5CTMVRXEZLU',
        'x_user_2020_03@mail.com:UltraSafe2020:MZXW633PN5XW6MZX',
        'x_user_2020_04@mail.com:Alpha2020Pass:NBSWY3DPEHPK3PXP',
      ],
    },
    {
      title: 'Instagram US Aged (2019) + Mail Access',
      slug: 'instagram-aged-2019-mail',
      categoryId: catSocial.id,
      price: 850n, // $8.50
      description: 'High-trust USA IP registered Instagram account with original linked email credentials included.',
      stockPayloads: [
        'insta_aged_01:SuperInsta#1:mail01@inbox.io:MailPass99',
        'insta_aged_02:SuperInsta#2:mail02@inbox.io:MailPass88',
        'insta_aged_03:SuperInsta#3:mail03@inbox.io:MailPass77',
      ],
    },
    {
      title: 'NordVPN Premium 2-Year Account',
      slug: 'nordvpn-premium-2y',
      categoryId: catVpn.id,
      price: 1499n, // $14.99
      description: 'Full 24-month subscription. Supports up to 6 simultaneous devices with double encryption servers.',
      stockPayloads: [
        'nord_sub_01@vpnmail.com:NordPass2026!',
        'nord_sub_02@vpnmail.com:NordSecure2026#',
        'nord_sub_03@vpnmail.com:NordUltra2026$',
      ],
    },
    {
      title: 'Netflix Premium 4K UHD 1-Month Private',
      slug: 'netflix-4k-uhd-1m',
      categoryId: catStreaming.id,
      price: 399n, // $3.99
      description: 'Dedicated 4K Ultra HD profile with 4-digit PIN lock. 30-day auto-replacement warranty.',
      stockPayloads: [
        'netflix_4k_01@stream.io:Watch4KPass#01',
        'netflix_4k_02@stream.io:Watch4KPass#02',
        'netflix_4k_03@stream.io:Watch4KPass#03',
        'netflix_4k_04@stream.io:Watch4KPass#04',
        'netflix_4k_05@stream.io:Watch4KPass#05',
      ],
    },
    {
      title: 'Windows 11 Professional Retail License Key',
      slug: 'windows-11-pro-retail',
      categoryId: catDev.id,
      price: 1199n, // $11.99
      description: '100% Genuine digital retail license key. Permanent lifetime online activation with Microsoft servers.',
      stockPayloads: [
        'WIN11-PRO-ABCD-EFGH-1234',
        'WIN11-PRO-5678-9012-IJKL',
        'WIN11-PRO-MNOP-QRST-3456',
        'WIN11-PRO-7890-UVWX-5678',
      ],
    },
    {
      title: 'OpenAI API $120 Prepaid Platform Key',
      slug: 'openai-api-120-key',
      categoryId: catDev.id,
      price: 2499n, // $24.99
      description: 'Tier-3 API organization key with $120 balance. Unlimited GPT-4o and o1 model access.',
      stockPayloads: [
        'sk-proj-OPENAI_KEY_SAMPLE_TOKEN_001_AABBCC',
        'sk-proj-OPENAI_KEY_SAMPLE_TOKEN_002_DDEEFF',
      ],
    },
  ];

  for (const p of sampleProducts) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        price: p.price,
        description: p.description,
        categoryId: p.categoryId,
      },
      create: {
        title: p.title,
        slug: p.slug,
        categoryId: p.categoryId,
        price: p.price,
        description: p.description,
        status: ProductStatus.ACTIVE,
        isActive: true,
      },
    });

    // Check existing stock items
    const existingStockCount = await prisma.stockItem.count({
      where: { productId: product.id },
    });

    if (existingStockCount === 0) {
      const encryptedRows = p.stockPayloads.map((payload) => {
        const envelope = encryptPayload(payload);
        return {
          productId: product.id,
          status: StockStatus.AVAILABLE,
          payloadCiphertext: envelope.ciphertext,
          iv: envelope.iv,
          tag: envelope.tag,
          keyVersion: envelope.keyVersion,
          version: 1,
        };
      });

      await prisma.stockItem.createMany({
        data: encryptedRows,
      });
      console.log(`Product '${product.title}' seeded with ${encryptedRows.length} encrypted stock units.`);
    }
  }

  console.log('Database seeding complete! All stock encrypted with AES-256-GCM.');
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(() => {
      console.log('Seed finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@app/types',
    '@app/database',
    '@app/crypto',
    '@app/ledger',
    '@app/inventory',
    '@app/payments',
  ],
};

export default nextConfig;

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountMinor: bigint | number | string, currency: string = 'USD'): string {
  const num = typeof amountMinor === 'bigint' ? Number(amountMinor) / 100 : Number(amountMinor) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num);
}

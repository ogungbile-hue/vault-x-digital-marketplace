import { describe, it, expect, beforeEach } from 'vitest';
import { SlidingWindowRateLimiter } from '../../apps/web/src/lib/rate-limiter';
import { maskError } from '../../apps/web/src/lib/error-mask';

describe('Security Hardening, Rate Limiting & Error Masking', () => {
  describe('SlidingWindowRateLimiter', () => {
    let limiter: SlidingWindowRateLimiter;

    beforeEach(() => {
      limiter = new SlidingWindowRateLimiter({
        windowMs: 1000, // 1 second window
        maxRequests: 3,  // 3 requests allowed
      });
    });

    it('should allow requests within the limit and reject once threshold is exceeded', () => {
      const ip = '192.168.1.100';

      // 1st request -> allowed
      expect(limiter.check(ip).allowed).toBe(true);
      // 2nd request -> allowed
      expect(limiter.check(ip).allowed).toBe(true);
      // 3rd request -> allowed
      expect(limiter.check(ip).allowed).toBe(true);

      // 4th request -> BLOCKED (Rate limit exceeded)
      const check4 = limiter.check(ip);
      expect(check4.allowed).toBe(false);
      expect(check4.remaining).toBe(0);
      expect(check4.resetMs).toBeGreaterThan(0);
    });

    it('should isolate limits between different IP addresses', () => {
      const ipA = '10.0.0.1';
      const ipB = '10.0.0.2';

      limiter.check(ipA);
      limiter.check(ipA);
      limiter.check(ipA);
      expect(limiter.check(ipA).allowed).toBe(false);

      // IP B should still be allowed
      expect(limiter.check(ipB).allowed).toBe(true);
    });
  });

  describe('Error Masking Utility', () => {
    it('should preserve known safe business domain errors for user feedback', () => {
      const safeError = new Error('Insufficient wallet balance: available ($10), required ($50).');
      const response = maskError(safeError, 400);

      expect(response.status).toBe(400);
      // Check response body structure
      expect(safeError.message).toContain('Insufficient wallet balance');
    });

    it('should sanitize raw internal/database errors to prevent data leakage', () => {
      const sensitiveDbError = new Error(
        'PrismaClientKnownRequestError: Connection failed at postgresql://postgres:super_secret_password@db.prod.internal:5432'
      );

      const response = maskError(sensitiveDbError, 500);
      expect(response.status).toBe(500);
    });
  });
});

import { z } from 'zod';

export enum DelimiterFormat {
  USER_PASS = 'user:pass',
  UID_PASS_2FA = 'uid:pass:2fa_secret',
  UID_PASS_2FA_COOKIE = 'uid:pass:2fa_secret:cookie',
  LICENSE_KEY = 'license_key',
  CUSTOM = 'custom',
}

export interface ParsedStockLine {
  lineNumber: number;
  rawLine: string;
  normalizedPayload: string;
}

export interface ParseError {
  lineNumber: number;
  rawLine: string;
  error: string;
}

export interface BulkParseResult {
  validItems: ParsedStockLine[];
  duplicates: ParsedStockLine[];
  errors: ParseError[];
}

export interface BulkIngestionSummary {
  totalParsed: number;
  inserted: number;
  duplicatesSkipped: number;
  errors: ParseError[];
}

import {
  BulkParseResult,
  DelimiterFormat,
  ParseError,
  ParsedStockLine,
} from '@app/types';

export interface ParseOptions {
  customDelimiter?: string;
  expectedFieldCount?: number;
}

export class BulkStockParser {
  /**
   * Parses raw multi-line stock strings according to the configured delimiter format.
   * Performs whitespace trimming, line-numbered error detection, and in-batch deduplication.
   */
  public static parse(
    rawContent: string,
    format: DelimiterFormat = DelimiterFormat.LICENSE_KEY,
    options: ParseOptions = {}
  ): BulkParseResult {
    const lines = rawContent.split(/\r?\n/);
    const validItems: ParsedStockLine[] = [];
    const duplicates: ParsedStockLine[] = [];
    const errors: ParseError[] = [];
    const seenPayloads = new Set<string>();

    for (let index = 0; index < lines.length; index++) {
      const lineNumber = index + 1;
      const rawLine = lines[index];
      const trimmedLine = rawLine.trim();

      // Skip completely empty lines
      if (!trimmedLine) {
        continue;
      }

      // Format validation & normalization
      const validation = this.validateAndNormalizeLine(trimmedLine, format, options);

      if (!validation.isValid) {
        errors.push({
          lineNumber,
          rawLine,
          error: validation.errorMessage || 'Invalid delimiter format',
        });
        continue;
      }

      const normalized = validation.normalizedPayload!;

      // In-batch deduplication check
      if (seenPayloads.has(normalized)) {
        duplicates.push({
          lineNumber,
          rawLine,
          normalizedPayload: normalized,
        });
        continue;
      }

      seenPayloads.add(normalized);
      validItems.push({
        lineNumber,
        rawLine,
        normalizedPayload: normalized,
      });
    }

    return {
      validItems,
      duplicates,
      errors,
    };
  }

  private static validateAndNormalizeLine(
    line: string,
    format: DelimiterFormat,
    options: ParseOptions
  ): { isValid: boolean; normalizedPayload?: string; errorMessage?: string } {
    switch (format) {
      case DelimiterFormat.LICENSE_KEY: {
        // Single token, no whitespace inside or must be non-empty string
        if (line.length === 0) {
          return { isValid: false, errorMessage: 'License key cannot be empty' };
        }
        return { isValid: true, normalizedPayload: line };
      }

      case DelimiterFormat.USER_PASS: {
        // Split by ':' or custom delimiter
        const delimiter = options.customDelimiter || ':';
        const parts = line.split(delimiter).map((p) => p.trim());
        if (parts.length < 2 || !parts[0] || !parts[1]) {
          return {
            isValid: false,
            errorMessage: `Expected 'user:pass' format separated by '${delimiter}'`,
          };
        }
        return { isValid: true, normalizedPayload: parts.join(':') };
      }

      case DelimiterFormat.UID_PASS_2FA: {
        const delimiter = options.customDelimiter || ':';
        const parts = line.split(delimiter).map((p) => p.trim());
        if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
          return {
            isValid: false,
            errorMessage: `Expected 'uid:pass:2fa_secret' format separated by '${delimiter}'`,
          };
        }
        return { isValid: true, normalizedPayload: parts.join(':') };
      }

      case DelimiterFormat.UID_PASS_2FA_COOKIE: {
        const delimiter = options.customDelimiter || ':';
        const parts = line.split(delimiter).map((p) => p.trim());
        if (parts.length < 4 || !parts[0] || !parts[1] || !parts[2] || !parts[3]) {
          return {
            isValid: false,
            errorMessage: `Expected 'uid:pass:2fa_secret:cookie' format separated by '${delimiter}'`,
          };
        }
        return { isValid: true, normalizedPayload: parts.join(':') };
      }

      case DelimiterFormat.CUSTOM: {
        const delimiter = options.customDelimiter || ':';
        const expectedCount = options.expectedFieldCount || 1;
        const parts = line.split(delimiter).map((p) => p.trim());
        if (parts.length < expectedCount || parts.some((p) => !p)) {
          return {
            isValid: false,
            errorMessage: `Custom format failed: expected ${expectedCount} non-empty parts separated by '${delimiter}'`,
          };
        }
        return { isValid: true, normalizedPayload: parts.join(delimiter) };
      }

      default:
        return { isValid: false, errorMessage: `Unsupported format: ${format}` };
    }
  }
}

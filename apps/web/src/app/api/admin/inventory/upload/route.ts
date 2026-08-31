import { NextRequest, NextResponse } from 'next/server';
import { BulkIngestionService, BulkStockParser } from '@app/inventory';
import { DelimiterFormat } from '@app/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, rawContent, format, previewOnly, customDelimiter, expectedFieldCount } = body;

    if (!rawContent) {
      return NextResponse.json(
        { success: false, error: 'Raw stock content is required' },
        { status: 400 }
      );
    }

    // If client just wants a live preview before committing to database
    if (previewOnly) {
      const parseResult = BulkStockParser.parse(
        rawContent,
        format as DelimiterFormat,
        {
          customDelimiter,
          expectedFieldCount: expectedFieldCount ? parseInt(expectedFieldCount, 10) : undefined,
        }
      );
      return NextResponse.json({ success: true, preview: parseResult });
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product SKU selection is required' },
        { status: 400 }
      );
    }

    const summary = await BulkIngestionService.ingestBulkStock({
      productId,
      rawContent,
      format: format as DelimiterFormat,
      options: {
        customDelimiter,
        expectedFieldCount: expectedFieldCount ? parseInt(expectedFieldCount, 10) : undefined,
      },
    });

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Bulk ingestion failed' },
      { status: 400 }
    );
  }
}

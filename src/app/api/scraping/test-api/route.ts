import { NextRequest, NextResponse } from 'next/server';
import { DecodoAPI } from '@/lib/web-scraping/decodo-api';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Initialize Decodo API
    const decodo = new DecodoAPI(
      process.env.DECODO_USERNAME || '',
      process.env.DECODO_PASSWORD || ''
    );

    // Test with a simple request
    const testResponse = await decodo.scrape({
      url: url,
      parse: false,
      headless: 'html',
      country_code: 'us',
    });

    return NextResponse.json({
      success: testResponse.success,
      error: testResponse.error,
      data: testResponse.data ? {
        contentLength: testResponse.data.content?.length || 0,
        statusCode: testResponse.data.status_code,
        url: testResponse.data.url,
      } : null,
    });
  } catch (error) {
    console.error('API test error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
}
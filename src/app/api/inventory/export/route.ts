import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { query } from '@/lib/umbrel/client';
import { ExportConfig, WebsiteInventory } from '@/types/inventory';

// Helper to build WHERE clause from export filters
function buildExportWhereClause(filters: ExportConfig['filters']): { clause: string; params: unknown[] } {
  if (!filters) {
    return { clause: '', params: [] };
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const { search, website, contact, category, status } = filters;

  if (search) {
    conditions.push(`(website ILIKE $${paramIndex} OR contact ILIKE $${paramIndex} OR category ILIKE $${paramIndex} OR notes ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (website) {
    conditions.push(`website ILIKE $${paramIndex}`);
    params.push(`%${website}%`);
    paramIndex++;
  }

  if (contact) {
    conditions.push(`contact ILIKE $${paramIndex}`);
    params.push(`%${contact}%`);
    paramIndex++;
  }

  if (category) {
    conditions.push(`category = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }

  if (status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  // Authority metrics filters
  if (filters.domain_rating_min) {
    conditions.push(`domain_rating >= $${paramIndex}`);
    params.push(filters.domain_rating_min);
    paramIndex++;
  }
  if (filters.domain_rating_max) {
    conditions.push(`domain_rating <= $${paramIndex}`);
    params.push(filters.domain_rating_max);
    paramIndex++;
  }

  if (filters.da_min) {
    conditions.push(`da >= $${paramIndex}`);
    params.push(filters.da_min);
    paramIndex++;
  }
  if (filters.da_max) {
    conditions.push(`da <= $${paramIndex}`);
    params.push(filters.da_max);
    paramIndex++;
  }

  if (filters.backlinks_min) {
    conditions.push(`backlinks >= $${paramIndex}`);
    params.push(filters.backlinks_min);
    paramIndex++;
  }
  if (filters.backlinks_max) {
    conditions.push(`backlinks <= $${paramIndex}`);
    params.push(filters.backlinks_max);
    paramIndex++;
  }

  // Traffic filters
  if (filters.organic_traffic_min) {
    conditions.push(`organic_traffic >= $${paramIndex}`);
    params.push(filters.organic_traffic_min);
    paramIndex++;
  }
  if (filters.organic_traffic_max) {
    conditions.push(`organic_traffic <= $${paramIndex}`);
    params.push(filters.organic_traffic_max);
    paramIndex++;
  }

  if (filters.us_traffic_min) {
    conditions.push(`us_traffic >= $${paramIndex}`);
    params.push(filters.us_traffic_min);
    paramIndex++;
  }
  if (filters.us_traffic_max) {
    conditions.push(`us_traffic <= $${paramIndex}`);
    params.push(filters.us_traffic_max);
    paramIndex++;
  }

  if (filters.uk_traffic_min) {
    conditions.push(`uk_traffic >= $${paramIndex}`);
    params.push(filters.uk_traffic_min);
    paramIndex++;
  }
  if (filters.uk_traffic_max) {
    conditions.push(`uk_traffic <= $${paramIndex}`);
    params.push(filters.uk_traffic_max);
    paramIndex++;
  }

  if (filters.canada_traffic_min) {
    conditions.push(`canada_traffic >= $${paramIndex}`);
    params.push(filters.canada_traffic_min);
    paramIndex++;
  }
  if (filters.canada_traffic_max) {
    conditions.push(`canada_traffic <= $${paramIndex}`);
    params.push(filters.canada_traffic_max);
    paramIndex++;
  }

  // Price filters
  if (filters.client_price_min) {
    conditions.push(`client_price >= $${paramIndex}`);
    params.push(filters.client_price_min);
    paramIndex++;
  }
  if (filters.client_price_max) {
    conditions.push(`client_price <= $${paramIndex}`);
    params.push(filters.client_price_max);
    paramIndex++;
  }

  if (filters.price_min) {
    conditions.push(`price >= $${paramIndex}`);
    params.push(filters.price_min);
    paramIndex++;
  }
  if (filters.price_max) {
    conditions.push(`price <= $${paramIndex}`);
    params.push(filters.price_max);
    paramIndex++;
  }

  // Boolean filters
  if (filters.is_indexed !== undefined) {
    conditions.push(`is_indexed = $${paramIndex}`);
    params.push(filters.is_indexed);
    paramIndex++;
  }
  if (filters.do_follow !== undefined) {
    conditions.push(`do_follow = $${paramIndex}`);
    params.push(filters.do_follow);
    paramIndex++;
  }
  if (filters.news !== undefined) {
    conditions.push(`news = $${paramIndex}`);
    params.push(filters.news);
    paramIndex++;
  }
  if (filters.sponsored !== undefined) {
    conditions.push(`sponsored = $${paramIndex}`);
    params.push(filters.sponsored);
    paramIndex++;
  }

  // AI flags
  if (filters.ai_overview !== undefined) {
    conditions.push(`ai_overview = $${paramIndex}`);
    params.push(filters.ai_overview);
    paramIndex++;
  }
  if (filters.chatgpt !== undefined) {
    conditions.push(`chatgpt = $${paramIndex}`);
    params.push(filters.chatgpt);
    paramIndex++;
  }
  if (filters.perplexity !== undefined) {
    conditions.push(`perplexity = $${paramIndex}`);
    params.push(filters.perplexity);
    paramIndex++;
  }
  if (filters.gemini !== undefined) {
    conditions.push(`gemini = $${paramIndex}`);
    params.push(filters.gemini);
    paramIndex++;
  }
  if (filters.copilot !== undefined) {
    conditions.push(`copilot = $${paramIndex}`);
    params.push(filters.copilot);
    paramIndex++;
  }

  // Niche filters
  if (filters.cbd !== undefined) {
    conditions.push(`cbd = $${paramIndex}`);
    params.push(filters.cbd);
    paramIndex++;
  }
  if (filters.casino !== undefined) {
    conditions.push(`casino = $${paramIndex}`);
    params.push(filters.casino);
    paramIndex++;
  }
  if (filters.dating !== undefined) {
    conditions.push(`dating = $${paramIndex}`);
    params.push(filters.dating);
    paramIndex++;
  }
  if (filters.crypto !== undefined) {
    conditions.push(`crypto = $${paramIndex}`);
    params.push(filters.crypto);
    paramIndex++;
  }

  // TAT filters
  if (filters.tat_min) {
    conditions.push(`tat >= $${paramIndex}`);
    params.push(filters.tat_min);
    paramIndex++;
  }
  if (filters.tat_max) {
    conditions.push(`tat <= $${paramIndex}`);
    params.push(filters.tat_max);
    paramIndex++;
  }

  // Date filters
  if (filters.created_from) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(filters.created_from);
    paramIndex++;
  }
  if (filters.created_to) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(filters.created_to);
    paramIndex++;
  }
  if (filters.updated_from) {
    conditions.push(`updated_at >= $${paramIndex}`);
    params.push(filters.updated_from);
    paramIndex++;
  }
  if (filters.updated_to) {
    conditions.push(`updated_at <= $${paramIndex}`);
    params.push(filters.updated_to);
    paramIndex++;
  }

  return {
    clause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    params
  };
}

// POST - Export inventory data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ExportConfig = await request.json();
    const { format, columns, filters, filename } = body;

    // Build WHERE clause from filters
    const { clause: whereClause, params } = buildExportWhereClause(filters);

    // Fetch data with filters
    const result = await query<WebsiteInventory>(
      `SELECT * FROM website_inventory ${whereClause} ORDER BY website ASC`,
      params
    );

    const websites = result.rows;

    if (!websites || websites.length === 0) {
      return NextResponse.json({ error: 'No data found to export' }, { status: 404 });
    }

    // Filter columns if specified
    let exportData: Record<string, unknown>[] = websites;
    if (columns && columns.length > 0) {
      exportData = websites.map(website => {
        const filteredWebsite: Record<string, unknown> = {};
        columns.forEach(column => {
          filteredWebsite[column] = website[column as keyof WebsiteInventory];
        });
        return filteredWebsite;
      });
    }

    // Generate filename if not provided
    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `website-inventory-${timestamp}`;

    if (format === 'json') {
      return NextResponse.json(exportData, {
        headers: {
          'Content-Disposition': `attachment; filename="${exportFilename}.json"`,
          'Content-Type': 'application/json'
        }
      });
    }

    if (format === 'csv') {
      // Convert to CSV
      if (exportData.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 404 });
      }

      // Get headers from first object
      const headers = Object.keys(exportData[0]);

      // Create CSV content
      const csvHeaders = headers.join(',');
      const csvRows = exportData.map(row => {
        return headers.map(header => {
          const value = row[header];
          // Handle null/undefined values and escape commas/quotes
          if (value === null || value === undefined) {
            return '';
          }
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',');
      });

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Disposition': `attachment; filename="${exportFilename}.csv"`,
          'Content-Type': 'text/csv; charset=utf-8'
        }
      });
    }

    // For xlsx format, return JSON with special header to indicate Excel export needed
    if (format === 'xlsx') {
      return NextResponse.json(exportData, {
        headers: {
          'Content-Disposition': `attachment; filename="${exportFilename}.xlsx"`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'X-Export-Format': 'xlsx'
        }
      });
    }

    return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 });

  } catch (error) {
    console.error('Error in export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

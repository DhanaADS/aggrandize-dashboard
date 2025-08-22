import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { ExportConfig } from '@/types/inventory';

// POST - Export inventory data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ExportConfig = await request.json();
    const { format, columns, filters, filename } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query with filters (similar to GET endpoint)
    let query = supabase
      .from('website_inventory')
      .select('*');

    // Apply filters if provided
    if (filters) {
      const { search, website, contact, category, status } = filters;

      if (search) {
        query = query.or(`website.ilike.%${search}%,contact.ilike.%${search}%,category.ilike.%${search}%,notes.ilike.%${search}%`);
      }

      if (website) {
        query = query.ilike('website', `%${website}%`);
      }

      if (contact) {
        query = query.ilike('contact', `%${contact}%`);
      }

      if (category) {
        query = query.eq('category', category);
      }

      if (status) {
        query = query.eq('status', status);
      }

      // Authority metrics filters
      if (filters.domain_rating_min) query = query.gte('domain_rating', filters.domain_rating_min);
      if (filters.domain_rating_max) query = query.lte('domain_rating', filters.domain_rating_max);
      
      if (filters.da_min) query = query.gte('da', filters.da_min);
      if (filters.da_max) query = query.lte('da', filters.da_max);
      
      if (filters.backlinks_min) query = query.gte('backlinks', filters.backlinks_min);
      if (filters.backlinks_max) query = query.lte('backlinks', filters.backlinks_max);

      // Traffic filters
      if (filters.organic_traffic_min) query = query.gte('organic_traffic', filters.organic_traffic_min);
      if (filters.organic_traffic_max) query = query.lte('organic_traffic', filters.organic_traffic_max);
      
      if (filters.us_traffic_min) query = query.gte('us_traffic', filters.us_traffic_min);
      if (filters.us_traffic_max) query = query.lte('us_traffic', filters.us_traffic_max);
      
      if (filters.uk_traffic_min) query = query.gte('uk_traffic', filters.uk_traffic_min);
      if (filters.uk_traffic_max) query = query.lte('uk_traffic', filters.uk_traffic_max);
      
      if (filters.canada_traffic_min) query = query.gte('canada_traffic', filters.canada_traffic_min);
      if (filters.canada_traffic_max) query = query.lte('canada_traffic', filters.canada_traffic_max);

      // Price filters
      if (filters.client_price_min) query = query.gte('client_price', filters.client_price_min);
      if (filters.client_price_max) query = query.lte('client_price', filters.client_price_max);
      
      if (filters.price_min) query = query.gte('price', filters.price_min);
      if (filters.price_max) query = query.lte('price', filters.price_max);

      // Boolean filters
      if (filters.is_indexed !== undefined) query = query.eq('is_indexed', filters.is_indexed);
      if (filters.do_follow !== undefined) query = query.eq('do_follow', filters.do_follow);
      if (filters.news !== undefined) query = query.eq('news', filters.news);
      if (filters.sponsored !== undefined) query = query.eq('sponsored', filters.sponsored);
      
      // AI flags
      if (filters.ai_overview !== undefined) query = query.eq('ai_overview', filters.ai_overview);
      if (filters.chatgpt !== undefined) query = query.eq('chatgpt', filters.chatgpt);
      if (filters.perplexity !== undefined) query = query.eq('perplexity', filters.perplexity);
      if (filters.gemini !== undefined) query = query.eq('gemini', filters.gemini);
      if (filters.copilot !== undefined) query = query.eq('copilot', filters.copilot);
      
      // Niche filters
      if (filters.cbd !== undefined) query = query.eq('cbd', filters.cbd);
      if (filters.casino !== undefined) query = query.eq('casino', filters.casino);
      if (filters.dating !== undefined) query = query.eq('dating', filters.dating);
      if (filters.crypto !== undefined) query = query.eq('crypto', filters.crypto);

      // TAT filters
      if (filters.tat_min) query = query.gte('tat', filters.tat_min);
      if (filters.tat_max) query = query.lte('tat', filters.tat_max);

      // Date filters
      if (filters.created_from) query = query.gte('created_at', filters.created_from);
      if (filters.created_to) query = query.lte('created_at', filters.created_to);
      if (filters.updated_from) query = query.gte('updated_at', filters.updated_from);
      if (filters.updated_to) query = query.lte('updated_at', filters.updated_to);
    }

    // Order by website name for consistent exports
    query = query.order('website', { ascending: true });

    const { data: websites, error } = await query;

    if (error) {
      console.error('Export query error:', error);
      return NextResponse.json({ error: 'Failed to fetch data for export' }, { status: 500 });
    }

    if (!websites || websites.length === 0) {
      return NextResponse.json({ error: 'No data found to export' }, { status: 404 });
    }

    // Filter columns if specified
    let exportData = websites;
    if (columns && columns.length > 0) {
      exportData = websites.map(website => {
        const filteredWebsite: any = {};
        columns.forEach(column => {
          filteredWebsite[column] = website[column as keyof typeof website];
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
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/umbrel/query-wrapper';
import { WebsiteInventory, InventoryFilters, InventoryResponse, InventoryMetrics } from '@/types/inventory';

// Helper to build WHERE clause from filters
function buildWhereClause(searchParams: URLSearchParams): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Search filter
  const search = searchParams.get('search');
  if (search) {
    conditions.push(`(website ILIKE $${paramIndex} OR contact ILIKE $${paramIndex} OR category ILIKE $${paramIndex} OR notes ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const website = searchParams.get('website');
  if (website) {
    conditions.push(`website ILIKE $${paramIndex}`);
    params.push(`%${website}%`);
    paramIndex++;
  }

  const contact = searchParams.get('contact');
  if (contact) {
    conditions.push(`contact ILIKE $${paramIndex}`);
    params.push(`%${contact}%`);
    paramIndex++;
  }

  const category = searchParams.get('category');
  if (category) {
    conditions.push(`category = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }

  const status = searchParams.get('status');
  if (status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  // Authority metrics filters (using actual DB column: dr)
  const drMin = searchParams.get('domain_rating_min');
  if (drMin) {
    conditions.push(`dr >= $${paramIndex}`);
    params.push(parseInt(drMin));
    paramIndex++;
  }
  const drMax = searchParams.get('domain_rating_max');
  if (drMax) {
    conditions.push(`dr <= $${paramIndex}`);
    params.push(parseInt(drMax));
    paramIndex++;
  }

  const daMin = searchParams.get('da_min');
  if (daMin) {
    conditions.push(`da >= $${paramIndex}`);
    params.push(parseInt(daMin));
    paramIndex++;
  }
  const daMax = searchParams.get('da_max');
  if (daMax) {
    conditions.push(`da <= $${paramIndex}`);
    params.push(parseInt(daMax));
    paramIndex++;
  }

  // Note: backlinks column doesn't exist in DB, skipping filter

  // Traffic filters (using actual DB column: traffic)
  const orgMin = searchParams.get('organic_traffic_min');
  if (orgMin) {
    conditions.push(`traffic >= $${paramIndex}`);
    params.push(parseInt(orgMin));
    paramIndex++;
  }
  const orgMax = searchParams.get('organic_traffic_max');
  if (orgMax) {
    conditions.push(`traffic <= $${paramIndex}`);
    params.push(parseInt(orgMax));
    paramIndex++;
  }

  // Note: us_traffic, uk_traffic, canada_traffic columns don't exist in DB, skipping filters

  // Price filters
  const clientPriceMin = searchParams.get('client_price_min');
  if (clientPriceMin) {
    conditions.push(`client_price >= $${paramIndex}`);
    params.push(parseFloat(clientPriceMin));
    paramIndex++;
  }
  const clientPriceMax = searchParams.get('client_price_max');
  if (clientPriceMax) {
    conditions.push(`client_price <= $${paramIndex}`);
    params.push(parseFloat(clientPriceMax));
    paramIndex++;
  }

  // Price filter (using actual DB column: our_price)
  const priceMin = searchParams.get('price_min');
  if (priceMin) {
    conditions.push(`our_price >= $${paramIndex}`);
    params.push(parseFloat(priceMin));
    paramIndex++;
  }
  const priceMax = searchParams.get('price_max');
  if (priceMax) {
    conditions.push(`our_price <= $${paramIndex}`);
    params.push(parseFloat(priceMax));
    paramIndex++;
  }

  // Note: is_indexed, do_follow, news, sponsored columns don't exist in DB, skipping filters

  // Note: AI flags (ai_overview, chatgpt, perplexity, gemini, copilot) don't exist as separate columns
  // DB has: ai_platform, ai_platform_score instead

  // Niche filters (using actual DB columns: accepts_cbd, accepts_casino, accepts_dating, accepts_crypto)
  const cbd = searchParams.get('cbd');
  if (cbd !== null) {
    conditions.push(`accepts_cbd = $${paramIndex}`);
    params.push(cbd === 'true');
    paramIndex++;
  }

  const casino = searchParams.get('casino');
  if (casino !== null) {
    conditions.push(`accepts_casino = $${paramIndex}`);
    params.push(casino === 'true');
    paramIndex++;
  }

  const dating = searchParams.get('dating');
  if (dating !== null) {
    conditions.push(`accepts_dating = $${paramIndex}`);
    params.push(dating === 'true');
    paramIndex++;
  }

  const crypto = searchParams.get('crypto');
  if (crypto !== null) {
    conditions.push(`accepts_crypto = $${paramIndex}`);
    params.push(crypto === 'true');
    paramIndex++;
  }

  // TAT filters
  const tatMin = searchParams.get('tat_min');
  if (tatMin) {
    conditions.push(`tat >= $${paramIndex}`);
    params.push(parseInt(tatMin));
    paramIndex++;
  }
  const tatMax = searchParams.get('tat_max');
  if (tatMax) {
    conditions.push(`tat <= $${paramIndex}`);
    params.push(parseInt(tatMax));
    paramIndex++;
  }

  // Date filters
  const createdFrom = searchParams.get('created_from');
  if (createdFrom) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(createdFrom);
    paramIndex++;
  }
  const createdTo = searchParams.get('created_to');
  if (createdTo) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(createdTo);
    paramIndex++;
  }

  return {
    clause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    params
  };
}

// GET inventory with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Sort parameters
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    // Action parameter
    const action = searchParams.get('action');

    // If requesting metrics/summary
    if (action === 'metrics') {
      // Use actual DB column names: dr, traffic, our_price, accepts_cbd, accepts_casino, accepts_dating, accepts_crypto
      const metricsResult = await query<{
        id: string;
        dr: number | null;
        da: number | null;
        traffic: number | null;
        client_price: number | null;
        our_price: number | null;
        status: string;
        accepts_cbd: boolean;
        accepts_casino: boolean;
        accepts_dating: boolean;
        accepts_crypto: boolean;
      }>(`
        SELECT id, dr, da, traffic, client_price, our_price, status,
               accepts_cbd, accepts_casino, accepts_dating, accepts_crypto
        FROM website_inventory
      `);

      const metrics = metricsResult.rows;

      // Calculate metrics
      const totalWebsites = metrics.length;
      const activeWebsites = metrics.filter(w => w.status === 'active').length;
      const inactiveWebsites = metrics.filter(w => w.status === 'inactive').length;
      const pendingWebsites = metrics.filter(w => w.status === 'pending').length;
      const blacklistedWebsites = metrics.filter(w => w.status === 'blacklisted').length;

      const metricsWithDR = metrics.filter(w => w.dr != null);
      const avgDomainRating = metricsWithDR.length > 0
        ? metricsWithDR.reduce((sum, w) => sum + (w.dr || 0), 0) / metricsWithDR.length
        : 0;

      const metricsWithDa = metrics.filter(w => w.da != null);
      const avgDa = metricsWithDa.length > 0
        ? metricsWithDa.reduce((sum, w) => sum + (w.da || 0), 0) / metricsWithDa.length
        : 0;

      const totalOrganicTraffic = metrics.reduce((sum, w) => sum + (w.traffic || 0), 0);
      const totalBacklinks = 0; // Column doesn't exist in DB

      const metricsWithClientPrice = metrics.filter(w => w.client_price != null);
      const avgClientPrice = metricsWithClientPrice.length > 0
        ? metricsWithClientPrice.reduce((sum, w) => sum + (w.client_price || 0), 0) / metricsWithClientPrice.length
        : 0;

      const metricsWithPrice = metrics.filter(w => w.our_price != null);
      const avgPrice = metricsWithPrice.length > 0
        ? metricsWithPrice.reduce((sum, w) => sum + (w.our_price || 0), 0) / metricsWithPrice.length
        : 0;

      const totalClientValue = metrics.reduce((sum, w) => sum + (w.client_price || 0), 0);
      const totalValue = metrics.reduce((sum, w) => sum + (w.our_price || 0), 0);

      const inventoryMetrics: InventoryMetrics = {
        total_websites: totalWebsites,
        active_websites: activeWebsites,
        inactive_websites: inactiveWebsites,
        pending_websites: pendingWebsites,
        blacklisted_websites: blacklistedWebsites,
        avg_domain_rating: Math.round(avgDomainRating * 100) / 100,
        avg_da: Math.round(avgDa * 100) / 100,
        total_organic_traffic: totalOrganicTraffic,
        total_backlinks: totalBacklinks,
        avg_client_price: Math.round(avgClientPrice * 100) / 100,
        avg_price: Math.round(avgPrice * 100) / 100,
        total_client_value: Math.round(totalClientValue * 100) / 100,
        total_value: Math.round(totalValue * 100) / 100,
        niche_breakdown: {
          cbd_count: metrics.filter(w => w.accepts_cbd).length,
          casino_count: metrics.filter(w => w.accepts_casino).length,
          dating_count: metrics.filter(w => w.accepts_dating).length,
          crypto_count: metrics.filter(w => w.accepts_crypto).length,
          news_count: 0, // Column doesn't exist in DB
          sponsored_count: 0, // Column doesn't exist in DB
        },
        traffic_distribution: {
          high_traffic: metrics.filter(w => (w.traffic || 0) > 1000000).length,
          medium_traffic: metrics.filter(w => (w.traffic || 0) >= 100000 && (w.traffic || 0) <= 1000000).length,
          low_traffic: metrics.filter(w => (w.traffic || 0) < 100000).length,
        },
        authority_distribution: {
          high_authority: metrics.filter(w => (w.dr || 0) >= 80).length,
          medium_authority: metrics.filter(w => (w.dr || 0) >= 50 && (w.dr || 0) < 80).length,
          low_authority: metrics.filter(w => (w.dr || 0) < 50).length,
        }
      };

      return NextResponse.json({
        success: true,
        metrics: inventoryMetrics
      });
    }

    // Build WHERE clause from filters
    const { clause: whereClause, params: whereParams } = buildWhereClause(searchParams);

    // Validate sort column to prevent SQL injection (using actual DB column names)
    const validSortColumns = ['created_at', 'updated_at', 'website', 'dr', 'da',
      'traffic', 'client_price', 'our_price', 'status', 'category', 'contact', 'tat', 'spam_score'];
    // Map frontend column names to actual DB column names
    const columnMapping: Record<string, string> = {
      'domain_rating': 'dr',
      'organic_traffic': 'traffic',
      'price': 'our_price',
      'backlinks': 'dr', // fallback since backlinks doesn't exist
    };
    const mappedSortBy = columnMapping[sortBy] || sortBy;
    const safeSortBy = validSortColumns.includes(mappedSortBy) ? mappedSortBy : 'created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count for pagination
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM website_inventory ${whereClause}`,
      whereParams
    );
    const totalCount = parseInt(countResult.rows[0]?.count || '0');

    // Fetch websites with pagination (using aliases to map DB columns to frontend expected names)
    const websitesResult = await query<WebsiteInventory>(
      `SELECT
        id, website, contact, category, status, notes, tat, spam_score,
        dr as domain_rating, da, traffic as organic_traffic,
        client_price, our_price as price,
        accepts_cbd as cbd, accepts_casino as casino,
        accepts_dating as dating, accepts_crypto as crypto,
        link_type, guidelines, platform, niche_tags,
        ai_platform, ai_platform_score, ai_country, ai_traffic_breakdown,
        created_at, updated_at
       FROM website_inventory ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}`,
      [...whereParams, limit, offset]
    );

    const totalPages = Math.ceil(totalCount / limit);

    const response: InventoryResponse = {
      websites: websitesResult.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages
      },
      totalCount
    };

    return NextResponse.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Error in inventory GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new website
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Get user ID from user_profiles
    const userProfile = await queryOne<{ id: string }>(
      'SELECT id FROM user_profiles WHERE email = $1',
      [session.user.email]
    );

    // Build INSERT query dynamically
    const fields = Object.keys(body);
    if (userProfile?.id) {
      fields.push('created_by');
    }

    const values: unknown[] = Object.values(body);
    if (userProfile?.id) {
      values.push(userProfile.id);
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const fieldNames = fields.join(', ');

    const result = await query<WebsiteInventory>(
      `INSERT INTO website_inventory (${fieldNames}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    const website = result.rows[0];
    if (!website) {
      throw new Error('Failed to create website');
    }

    return NextResponse.json({
      success: true,
      website
    });

  } catch (error: unknown) {
    console.error('Error creating website:', error);

    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({
        error: 'Website already exists in inventory',
        details: (error as Error).message
      }, { status: 409 });
    }

    return NextResponse.json({
      error: 'Failed to create website',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

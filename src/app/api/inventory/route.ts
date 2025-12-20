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

  // Authority metrics filters
  const drMin = searchParams.get('domain_rating_min');
  if (drMin) {
    conditions.push(`domain_rating >= $${paramIndex}`);
    params.push(parseInt(drMin));
    paramIndex++;
  }
  const drMax = searchParams.get('domain_rating_max');
  if (drMax) {
    conditions.push(`domain_rating <= $${paramIndex}`);
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

  const backlinksMin = searchParams.get('backlinks_min');
  if (backlinksMin) {
    conditions.push(`backlinks >= $${paramIndex}`);
    params.push(parseInt(backlinksMin));
    paramIndex++;
  }
  const backlinksMax = searchParams.get('backlinks_max');
  if (backlinksMax) {
    conditions.push(`backlinks <= $${paramIndex}`);
    params.push(parseInt(backlinksMax));
    paramIndex++;
  }

  // Traffic filters
  const orgMin = searchParams.get('organic_traffic_min');
  if (orgMin) {
    conditions.push(`organic_traffic >= $${paramIndex}`);
    params.push(parseInt(orgMin));
    paramIndex++;
  }
  const orgMax = searchParams.get('organic_traffic_max');
  if (orgMax) {
    conditions.push(`organic_traffic <= $${paramIndex}`);
    params.push(parseInt(orgMax));
    paramIndex++;
  }

  const usMin = searchParams.get('us_traffic_min');
  if (usMin) {
    conditions.push(`us_traffic >= $${paramIndex}`);
    params.push(parseInt(usMin));
    paramIndex++;
  }
  const usMax = searchParams.get('us_traffic_max');
  if (usMax) {
    conditions.push(`us_traffic <= $${paramIndex}`);
    params.push(parseInt(usMax));
    paramIndex++;
  }

  const ukMin = searchParams.get('uk_traffic_min');
  if (ukMin) {
    conditions.push(`uk_traffic >= $${paramIndex}`);
    params.push(parseInt(ukMin));
    paramIndex++;
  }
  const ukMax = searchParams.get('uk_traffic_max');
  if (ukMax) {
    conditions.push(`uk_traffic <= $${paramIndex}`);
    params.push(parseInt(ukMax));
    paramIndex++;
  }

  const caMin = searchParams.get('canada_traffic_min');
  if (caMin) {
    conditions.push(`canada_traffic >= $${paramIndex}`);
    params.push(parseInt(caMin));
    paramIndex++;
  }
  const caMax = searchParams.get('canada_traffic_max');
  if (caMax) {
    conditions.push(`canada_traffic <= $${paramIndex}`);
    params.push(parseInt(caMax));
    paramIndex++;
  }

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

  const priceMin = searchParams.get('price_min');
  if (priceMin) {
    conditions.push(`price >= $${paramIndex}`);
    params.push(parseFloat(priceMin));
    paramIndex++;
  }
  const priceMax = searchParams.get('price_max');
  if (priceMax) {
    conditions.push(`price <= $${paramIndex}`);
    params.push(parseFloat(priceMax));
    paramIndex++;
  }

  // Boolean filters
  const isIndexed = searchParams.get('is_indexed');
  if (isIndexed !== null) {
    conditions.push(`is_indexed = $${paramIndex}`);
    params.push(isIndexed === 'true');
    paramIndex++;
  }

  const doFollow = searchParams.get('do_follow');
  if (doFollow !== null) {
    conditions.push(`do_follow = $${paramIndex}`);
    params.push(doFollow === 'true');
    paramIndex++;
  }

  const news = searchParams.get('news');
  if (news !== null) {
    conditions.push(`news = $${paramIndex}`);
    params.push(news === 'true');
    paramIndex++;
  }

  const sponsored = searchParams.get('sponsored');
  if (sponsored !== null) {
    conditions.push(`sponsored = $${paramIndex}`);
    params.push(sponsored === 'true');
    paramIndex++;
  }

  // AI flags
  const aiOverview = searchParams.get('ai_overview');
  if (aiOverview !== null) {
    conditions.push(`ai_overview = $${paramIndex}`);
    params.push(aiOverview === 'true');
    paramIndex++;
  }

  const chatgpt = searchParams.get('chatgpt');
  if (chatgpt !== null) {
    conditions.push(`chatgpt = $${paramIndex}`);
    params.push(chatgpt === 'true');
    paramIndex++;
  }

  const perplexity = searchParams.get('perplexity');
  if (perplexity !== null) {
    conditions.push(`perplexity = $${paramIndex}`);
    params.push(perplexity === 'true');
    paramIndex++;
  }

  const gemini = searchParams.get('gemini');
  if (gemini !== null) {
    conditions.push(`gemini = $${paramIndex}`);
    params.push(gemini === 'true');
    paramIndex++;
  }

  const copilot = searchParams.get('copilot');
  if (copilot !== null) {
    conditions.push(`copilot = $${paramIndex}`);
    params.push(copilot === 'true');
    paramIndex++;
  }

  // Niche filters
  const cbd = searchParams.get('cbd');
  if (cbd !== null) {
    conditions.push(`cbd = $${paramIndex}`);
    params.push(cbd === 'true');
    paramIndex++;
  }

  const casino = searchParams.get('casino');
  if (casino !== null) {
    conditions.push(`casino = $${paramIndex}`);
    params.push(casino === 'true');
    paramIndex++;
  }

  const dating = searchParams.get('dating');
  if (dating !== null) {
    conditions.push(`dating = $${paramIndex}`);
    params.push(dating === 'true');
    paramIndex++;
  }

  const crypto = searchParams.get('crypto');
  if (crypto !== null) {
    conditions.push(`crypto = $${paramIndex}`);
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
      const metricsResult = await query<WebsiteInventory>(`
        SELECT id, domain_rating, da, organic_traffic, backlinks,
               client_price, price, status, cbd, casino, dating, crypto, news, sponsored
        FROM website_inventory
      `);

      const metrics = metricsResult.rows;

      // Calculate metrics
      const totalWebsites = metrics.length;
      const activeWebsites = metrics.filter(w => w.status === 'active').length;
      const inactiveWebsites = metrics.filter(w => w.status === 'inactive').length;
      const pendingWebsites = metrics.filter(w => w.status === 'pending').length;
      const blacklistedWebsites = metrics.filter(w => w.status === 'blacklisted').length;

      const metricsWithDR = metrics.filter(w => w.domain_rating);
      const avgDomainRating = metricsWithDR.length > 0
        ? metrics.reduce((sum, w) => sum + (w.domain_rating || 0), 0) / metricsWithDR.length
        : 0;

      const metricsWithDa = metrics.filter(w => w.da);
      const avgDa = metricsWithDa.length > 0
        ? metrics.reduce((sum, w) => sum + (w.da || 0), 0) / metricsWithDa.length
        : 0;

      const totalOrganicTraffic = metrics.reduce((sum, w) => sum + (w.organic_traffic || 0), 0);
      const totalBacklinks = metrics.reduce((sum, w) => sum + (w.backlinks || 0), 0);

      const metricsWithClientPrice = metrics.filter(w => w.client_price);
      const avgClientPrice = metricsWithClientPrice.length > 0
        ? metrics.reduce((sum, w) => sum + (w.client_price || 0), 0) / metricsWithClientPrice.length
        : 0;

      const metricsWithPrice = metrics.filter(w => w.price);
      const avgPrice = metricsWithPrice.length > 0
        ? metrics.reduce((sum, w) => sum + (w.price || 0), 0) / metricsWithPrice.length
        : 0;

      const totalClientValue = metrics.reduce((sum, w) => sum + (w.client_price || 0), 0);
      const totalValue = metrics.reduce((sum, w) => sum + (w.price || 0), 0);

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
          cbd_count: metrics.filter(w => w.cbd).length,
          casino_count: metrics.filter(w => w.casino).length,
          dating_count: metrics.filter(w => w.dating).length,
          crypto_count: metrics.filter(w => w.crypto).length,
          news_count: metrics.filter(w => w.news).length,
          sponsored_count: metrics.filter(w => w.sponsored).length,
        },
        traffic_distribution: {
          high_traffic: metrics.filter(w => (w.organic_traffic || 0) > 1000000).length,
          medium_traffic: metrics.filter(w => (w.organic_traffic || 0) >= 100000 && (w.organic_traffic || 0) <= 1000000).length,
          low_traffic: metrics.filter(w => (w.organic_traffic || 0) < 100000).length,
        },
        authority_distribution: {
          high_authority: metrics.filter(w => (w.domain_rating || 0) >= 80).length,
          medium_authority: metrics.filter(w => (w.domain_rating || 0) >= 50 && (w.domain_rating || 0) < 80).length,
          low_authority: metrics.filter(w => (w.domain_rating || 0) < 50).length,
        }
      };

      return NextResponse.json({
        success: true,
        metrics: inventoryMetrics
      });
    }

    // Build WHERE clause from filters
    const { clause: whereClause, params: whereParams } = buildWhereClause(searchParams);

    // Validate sort column to prevent SQL injection
    const validSortColumns = ['created_at', 'updated_at', 'website', 'domain_rating', 'da',
      'organic_traffic', 'backlinks', 'client_price', 'price', 'status', 'category', 'contact'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count for pagination
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM website_inventory ${whereClause}`,
      whereParams
    );
    const totalCount = parseInt(countResult.rows[0]?.count || '0');

    // Fetch websites with pagination
    const websitesResult = await query<WebsiteInventory>(
      `SELECT * FROM website_inventory ${whereClause}
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

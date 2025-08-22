import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { WebsiteInventory, InventoryFilters, InventoryResponse, InventoryMetrics } from '@/types/inventory';

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
    
    // Use service key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // If requesting metrics/summary
    if (action === 'metrics') {
      const { data: metrics, error: metricsError } = await supabase
        .from('website_inventory')
        .select(`
          id,
          domain_rating,
          da,
          organic_traffic,
          backlinks,
          client_price,
          price,
          status,
          cbd,
          casino,
          dating,
          crypto,
          news,
          sponsored
        `);

      if (metricsError) {
        console.error('Error fetching metrics:', metricsError);
        return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
      }

      // Calculate metrics
      const totalWebsites = metrics?.length || 0;
      const activeWebsites = metrics?.filter(w => w.status === 'active').length || 0;
      const inactiveWebsites = metrics?.filter(w => w.status === 'inactive').length || 0;
      const pendingWebsites = metrics?.filter(w => w.status === 'pending').length || 0;
      const blacklistedWebsites = metrics?.filter(w => w.status === 'blacklisted').length || 0;

      const avgDomainRating = metrics && metrics.length > 0 
        ? metrics.reduce((sum, w) => sum + (w.domain_rating || 0), 0) / metrics.filter(w => w.domain_rating).length
        : 0;

      const avgDa = metrics && metrics.length > 0 
        ? metrics.reduce((sum, w) => sum + (w.da || 0), 0) / metrics.filter(w => w.da).length
        : 0;

      const totalOrganicTraffic = metrics?.reduce((sum, w) => sum + (w.organic_traffic || 0), 0) || 0;
      const totalBacklinks = metrics?.reduce((sum, w) => sum + (w.backlinks || 0), 0) || 0;

      const avgClientPrice = metrics && metrics.length > 0 
        ? metrics.reduce((sum, w) => sum + (w.client_price || 0), 0) / metrics.filter(w => w.client_price).length
        : 0;

      const avgPrice = metrics && metrics.length > 0 
        ? metrics.reduce((sum, w) => sum + (w.price || 0), 0) / metrics.filter(w => w.price).length
        : 0;

      const totalClientValue = metrics?.reduce((sum, w) => sum + (w.client_price || 0), 0) || 0;
      const totalValue = metrics?.reduce((sum, w) => sum + (w.price || 0), 0) || 0;

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
          cbd_count: metrics?.filter(w => w.cbd).length || 0,
          casino_count: metrics?.filter(w => w.casino).length || 0,
          dating_count: metrics?.filter(w => w.dating).length || 0,
          crypto_count: metrics?.filter(w => w.crypto).length || 0,
          news_count: metrics?.filter(w => w.news).length || 0,
          sponsored_count: metrics?.filter(w => w.sponsored).length || 0,
        },
        traffic_distribution: {
          high_traffic: metrics?.filter(w => (w.organic_traffic || 0) > 1000000).length || 0,
          medium_traffic: metrics?.filter(w => (w.organic_traffic || 0) >= 100000 && (w.organic_traffic || 0) <= 1000000).length || 0,
          low_traffic: metrics?.filter(w => (w.organic_traffic || 0) < 100000).length || 0,
        },
        authority_distribution: {
          high_authority: metrics?.filter(w => (w.domain_rating || 0) >= 80).length || 0,
          medium_authority: metrics?.filter(w => (w.domain_rating || 0) >= 50 && (w.domain_rating || 0) < 80).length || 0,
          low_authority: metrics?.filter(w => (w.domain_rating || 0) < 50).length || 0,
        }
      };

      return NextResponse.json({ 
        success: true, 
        metrics: inventoryMetrics 
      });
    }

    // Build the query with filters
    let query = supabase
      .from('website_inventory')
      .select('*');

    // Apply filters
    const search = searchParams.get('search');
    if (search) {
      query = query.or(`website.ilike.%${search}%,contact.ilike.%${search}%,category.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    const website = searchParams.get('website');
    if (website) {
      query = query.ilike('website', `%${website}%`);
    }

    const contact = searchParams.get('contact');
    if (contact) {
      query = query.ilike('contact', `%${contact}%`);
    }

    const category = searchParams.get('category');
    if (category) {
      query = query.eq('category', category);
    }

    const status = searchParams.get('status');
    if (status) {
      query = query.eq('status', status);
    }

    // Authority metrics filters
    const drMin = searchParams.get('domain_rating_min');
    const drMax = searchParams.get('domain_rating_max');
    if (drMin) query = query.gte('domain_rating', parseInt(drMin));
    if (drMax) query = query.lte('domain_rating', parseInt(drMax));

    const daMin = searchParams.get('da_min');
    const daMax = searchParams.get('da_max');
    if (daMin) query = query.gte('da', parseInt(daMin));
    if (daMax) query = query.lte('da', parseInt(daMax));

    const backlinksMin = searchParams.get('backlinks_min');
    const backlinksMax = searchParams.get('backlinks_max');
    if (backlinksMin) query = query.gte('backlinks', parseInt(backlinksMin));
    if (backlinksMax) query = query.lte('backlinks', parseInt(backlinksMax));

    // Traffic filters
    const orgMin = searchParams.get('organic_traffic_min');
    const orgMax = searchParams.get('organic_traffic_max');
    if (orgMin) query = query.gte('organic_traffic', parseInt(orgMin));
    if (orgMax) query = query.lte('organic_traffic', parseInt(orgMax));

    const usMin = searchParams.get('us_traffic_min');
    const usMax = searchParams.get('us_traffic_max');
    if (usMin) query = query.gte('us_traffic', parseInt(usMin));
    if (usMax) query = query.lte('us_traffic', parseInt(usMax));

    const ukMin = searchParams.get('uk_traffic_min');
    const ukMax = searchParams.get('uk_traffic_max');
    if (ukMin) query = query.gte('uk_traffic', parseInt(ukMin));
    if (ukMax) query = query.lte('uk_traffic', parseInt(ukMax));

    const caMin = searchParams.get('canada_traffic_min');
    const caMax = searchParams.get('canada_traffic_max');
    if (caMin) query = query.gte('canada_traffic', parseInt(caMin));
    if (caMax) query = query.lte('canada_traffic', parseInt(caMax));

    // Price filters
    const clientPriceMin = searchParams.get('client_price_min');
    const clientPriceMax = searchParams.get('client_price_max');
    if (clientPriceMin) query = query.gte('client_price', parseFloat(clientPriceMin));
    if (clientPriceMax) query = query.lte('client_price', parseFloat(clientPriceMax));

    const priceMin = searchParams.get('price_min');
    const priceMax = searchParams.get('price_max');
    if (priceMin) query = query.gte('price', parseFloat(priceMin));
    if (priceMax) query = query.lte('price', parseFloat(priceMax));

    // Boolean filters
    const isIndexed = searchParams.get('is_indexed');
    if (isIndexed !== null) query = query.eq('is_indexed', isIndexed === 'true');

    const doFollow = searchParams.get('do_follow');
    if (doFollow !== null) query = query.eq('do_follow', doFollow === 'true');

    const news = searchParams.get('news');
    if (news !== null) query = query.eq('news', news === 'true');

    const sponsored = searchParams.get('sponsored');
    if (sponsored !== null) query = query.eq('sponsored', sponsored === 'true');

    // AI flags
    const aiOverview = searchParams.get('ai_overview');
    if (aiOverview !== null) query = query.eq('ai_overview', aiOverview === 'true');

    const chatgpt = searchParams.get('chatgpt');
    if (chatgpt !== null) query = query.eq('chatgpt', chatgpt === 'true');

    const perplexity = searchParams.get('perplexity');
    if (perplexity !== null) query = query.eq('perplexity', perplexity === 'true');

    const gemini = searchParams.get('gemini');
    if (gemini !== null) query = query.eq('gemini', gemini === 'true');

    const copilot = searchParams.get('copilot');
    if (copilot !== null) query = query.eq('copilot', copilot === 'true');

    // Niche filters
    const cbd = searchParams.get('cbd');
    if (cbd !== null) query = query.eq('cbd', cbd === 'true');

    const casino = searchParams.get('casino');
    if (casino !== null) query = query.eq('casino', casino === 'true');

    const dating = searchParams.get('dating');
    if (dating !== null) query = query.eq('dating', dating === 'true');

    const crypto = searchParams.get('crypto');
    if (crypto !== null) query = query.eq('crypto', crypto === 'true');

    // TAT filters
    const tatMin = searchParams.get('tat_min');
    const tatMax = searchParams.get('tat_max');
    if (tatMin) query = query.gte('tat', parseInt(tatMin));
    if (tatMax) query = query.lte('tat', parseInt(tatMax));

    // Date filters
    const createdFrom = searchParams.get('created_from');
    const createdTo = searchParams.get('created_to');
    if (createdFrom) query = query.gte('created_at', createdFrom);
    if (createdTo) query = query.lte('created_at', createdTo);

    // Get total count for pagination
    const { count: totalCount, error: countError } = await query
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting count:', countError);
      return NextResponse.json({ error: 'Failed to get count' }, { status: 500 });
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: websites, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
    }

    const totalPages = Math.ceil((totalCount || 0) / limit);

    const response: InventoryResponse = {
      websites: websites || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages
      },
      totalCount: totalCount || 0
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
    
    // Use service key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user ID from user_profiles
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', session.user.email)
      .single();

    const websiteData = {
      ...body,
      created_by: userProfile?.id
    };

    const { data, error } = await supabase
      .from('website_inventory')
      .insert(websiteData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Handle unique constraint violations
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'Website already exists in inventory',
          details: error.message 
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create website',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      website: data 
    });

  } catch (error) {
    console.error('Error creating website:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
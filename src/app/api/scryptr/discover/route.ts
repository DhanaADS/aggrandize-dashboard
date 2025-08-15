import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { parseString } from 'xml2js';

interface DiscoveredSource {
  type: 'sitemap' | 'rss' | 'atom';
  url: string;
  title: string;
  count: number;
  selected: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    console.log(`Discovering sources for: ${domain}`);
    const sources: DiscoveredSource[] = [];

    // Check if the input is a specific sitemap/RSS URL
    if (domain.includes('/sitemap') || domain.includes('/rss') || domain.includes('/feed') || domain.includes('.xml')) {
      console.log('Direct sitemap/feed URL detected');
      
      try {
        // Try to process as direct sitemap URL
        if (domain.includes('sitemap') || domain.endsWith('.xml')) {
          const count = await getSitemapCount(domain);
          if (count > 0) {
            sources.push({
              type: 'sitemap',
              url: domain,
              title: `Direct Sitemap`,
              count,
              selected: false
            });
          }
        } else {
          // Try as RSS/Atom feed
          const feedResponse = await fetch(domain, {
            headers: { 'User-Agent': 'Scryptr/1.0' }
          });
          
          if (feedResponse.ok) {
            const contentType = feedResponse.headers.get('content-type') || '';
            if (contentType.includes('xml')) {
              sources.push({
                type: contentType.includes('atom') ? 'atom' : 'rss',
                url: domain,
                title: `Direct Feed`,
                count: 20, // Estimate
                selected: false
              });
            }
          }
        }
      } catch (error) {
        console.log('Failed to process direct URL:', error);
      }
    }

    // If no direct URL worked or it's a domain, do domain discovery
    if (sources.length === 0) {
      // Clean domain (remove protocol, www, trailing slash)
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      const baseUrl = `https://${cleanDomain}`;
      
      console.log(`Doing domain discovery for: ${baseUrl}`);

      // 1. Check robots.txt for sitemap
      try {
        const robotsResponse = await fetch(`${baseUrl}/robots.txt`, {
        headers: { 'User-Agent': 'Scryptr/1.0' }
      });
      
      if (robotsResponse.ok) {
        const robotsText = await robotsResponse.text();
        const sitemapMatches = robotsText.match(/Sitemap:\s*(.*)/gi);
        
        if (sitemapMatches) {
          for (const match of sitemapMatches) {
            const sitemapUrl = match.replace(/Sitemap:\s*/i, '').trim();
            const count = await getSitemapCount(sitemapUrl);
            if (count > 0) {
              sources.push({
                type: 'sitemap',
                url: sitemapUrl,
                title: `Sitemap from robots.txt`,
                count,
                selected: false
              });
            }
          }
        }
      }
    } catch (error) {
      console.log('robots.txt not accessible:', error);
    }

    // 2. Try common sitemap locations if none found
    if (sources.length === 0) {
      const commonSitemaps = [
        '/sitemap.xml',
        '/sitemap_index.xml',
        '/sitemap-index.xml'
      ];

      for (const path of commonSitemaps) {
        try {
          const sitemapUrl = `${baseUrl}${path}`;
          const count = await getSitemapCount(sitemapUrl);
          if (count > 0) {
            sources.push({
              type: 'sitemap',
              url: sitemapUrl,
              title: `Main Sitemap`,
              count,
              selected: false
            });
            break; // Only add the first working sitemap
          }
        } catch (error) {
          console.log(`Sitemap ${path} not found:`, error);
        }
      }
    }

    // 3. Look for RSS/Atom feeds
    try {
      const pageResponse = await fetch(baseUrl, {
        headers: { 'User-Agent': 'Scryptr/1.0' }
      });
      
      if (pageResponse.ok) {
        const html = await pageResponse.text();
        const $ = cheerio.load(html);
        
        // Look for RSS/Atom feed links in HTML head
        $('link[type="application/rss+xml"], link[type="application/atom+xml"]').each((_, element) => {
          const href = $(element).attr('href');
          const title = $(element).attr('title') || 'RSS Feed';
          const type = $(element).attr('type');
          
          if (href) {
            const feedUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
            sources.push({
              type: type?.includes('atom') ? 'atom' : 'rss',
              url: feedUrl,
              title,
              count: 20, // Estimate for feeds
              selected: false
            });
          }
        });
      }
    } catch (error) {
      console.log('Could not fetch homepage for feed discovery:', error);
    }

    // 4. Try common RSS feed locations
    const commonFeeds = [
      { path: '/feed/', title: 'Main RSS Feed' },
      { path: '/feed.xml', title: 'XML Feed' },
      { path: '/rss/', title: 'RSS Feed' },
      { path: '/rss.xml', title: 'RSS Feed' },
      { path: '/atom.xml', title: 'Atom Feed' }
    ];

    for (const feed of commonFeeds) {
      try {
        const feedUrl = `${baseUrl}${feed.path}`;
        const feedResponse = await fetch(feedUrl, {
          headers: { 'User-Agent': 'Scryptr/1.0' }
        });
        
        if (feedResponse.ok && feedResponse.headers.get('content-type')?.includes('xml')) {
          // Check if this feed URL is already in our sources
          const exists = sources.some(s => s.url === feedUrl);
          if (!exists) {
            sources.push({
              type: 'rss',
              url: feedUrl,
              title: feed.title,
              count: 20, // Estimate
              selected: false
            });
          }
        }
      } catch (error) {
        console.log(`Feed ${feed.path} not found:`, error);
      }
    }
    } // Close domain discovery section

    console.log(`Found ${sources.length} sources for ${domain}`);
    
    // Extract domain name for response (handle both URLs and domains)
    const responseDomain = domain.includes('://') 
      ? new URL(domain).hostname.replace(/^www\./, '')
      : domain.replace(/^www\./, '');
    
    return NextResponse.json({
      success: true,
      domain: responseDomain,
      sources,
      total_estimated: sources.reduce((sum, s) => sum + s.count, 0)
    });

  } catch (error) {
    console.error('Discovery error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to discover sources';
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        domain: null,
        sources: [],
        total_estimated: 0
      },
      { status: 500 }
    );
  }
}

async function getSitemapCount(sitemapUrl: string): Promise<number> {
  try {
    const response = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'Scryptr/1.0' }
    });
    
    if (!response.ok) return 0;
    
    const xml = await response.text();
    
    return new Promise((resolve) => {
      parseString(xml, (err, result) => {
        if (err) {
          resolve(0);
          return;
        }
        
        try {
          // Handle sitemap index
          if (result.sitemapindex && result.sitemapindex.sitemap) {
            resolve(result.sitemapindex.sitemap.length);
            return;
          }
          
          // Handle regular sitemap
          if (result.urlset && result.urlset.url) {
            resolve(result.urlset.url.length);
            return;
          }
          
          resolve(0);
        } catch (parseError) {
          resolve(0);
        }
      });
    });
  } catch (error) {
    console.log('Error counting sitemap URLs:', error);
    return 0;
  }
}
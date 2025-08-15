import { NextRequest, NextResponse } from 'next/server';
import { parseString } from 'xml2js';

interface SitemapEntry {
  url: string;
  lastmod?: string;
  type: 'content' | 'structural' | 'other';
  category: string;
  urlCount: number;
  description: string;
  year?: number;
  month?: number;
  dateGroup?: string;
  selected: boolean;
}

const CONTENT_KEYWORDS = [
  'post', 'news', 'article', 'blog', 'story', 'interview', 
  'review', 'analysis', 'report', 'content', 'feed'
];

const STRUCTURAL_KEYWORDS = [
  'page', 'category', 'tag', 'author', 'organization', 
  'people', 'certification', 'patent', 'product', 'static'
];

export async function POST(request: NextRequest) {
  try {
    const { sitemapUrl } = await request.json();
    
    console.log(`Analyzing sitemap index: ${sitemapUrl}`);
    
    // Fetch the sitemap index
    const response = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'Scryptr/1.0' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status}`);
    }
    
    const xml = await response.text();
    
    // Parse sitemap index
    const sitemapEntries = await parseSitemapIndex(xml);
    
    // Classify and analyze each sub-sitemap
    const analyzedSitemaps = await Promise.all(
      sitemapEntries.map(entry => analyzeSitemap(entry))
    );
    
    // Filter out failed analyses
    const validSitemaps = analyzedSitemaps.filter(sitemap => sitemap !== null);
    
    // Group by type
    const groupedSitemaps = {
      content: validSitemaps.filter(s => s.type === 'content'),
      structural: validSitemaps.filter(s => s.type === 'structural'),
      other: validSitemaps.filter(s => s.type === 'other')
    };

    // Group content sitemaps by date
    const contentByDate = groupContentSitemapsByDate(groupedSitemaps.content);
    
    // Calculate totals
    const totalUrls = validSitemaps.reduce((sum, s) => sum + s.urlCount, 0);
    const contentUrls = groupedSitemaps.content.reduce((sum, s) => sum + s.urlCount, 0);
    
    console.log(`Analysis complete: ${validSitemaps.length} sitemaps, ${totalUrls} total URLs, ${contentUrls} content URLs`);
    
    return NextResponse.json({
      success: true,
      data: {
        total_sitemaps: validSitemaps.length,
        total_urls: totalUrls,
        content_urls: contentUrls,
        grouped: groupedSitemaps,
        content_by_date: contentByDate,
        all_sitemaps: validSitemaps,
        recommendations: generateRecommendations(groupedSitemaps.content)
      }
    });
    
  } catch (error) {
    console.error('Sitemap analysis error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Analysis failed' 
      },
      { status: 500 }
    );
  }
}

async function parseSitemapIndex(xml: string): Promise<Array<{url: string, lastmod?: string}>> {
  return new Promise((resolve) => {
    parseString(xml, (err, result) => {
      if (err) {
        resolve([]);
        return;
      }
      
      try {
        const entries: Array<{url: string, lastmod?: string}> = [];
        
        // Handle sitemap index
        if (result.sitemapindex?.sitemap) {
          for (const sitemap of result.sitemapindex.sitemap) {
            if (sitemap.loc?.[0]) {
              entries.push({
                url: sitemap.loc[0],
                lastmod: sitemap.lastmod?.[0]
              });
            }
          }
        }
        
        resolve(entries);
      } catch (parseError) {
        resolve([]);
      }
    });
  });
}

async function analyzeSitemap(entry: {url: string, lastmod?: string}): Promise<SitemapEntry | null> {
  try {
    // Extract sitemap name for classification
    const sitemapName = entry.url.split('/').pop()?.toLowerCase() || '';
    
    // Classify sitemap type
    const type = classifySitemap(sitemapName);
    const category = extractCategory(sitemapName);
    
    // Extract date information from sitemap name or lastmod
    const dateInfo = extractDateFromSitemap(sitemapName, entry.lastmod);
    
    // Count URLs in sitemap (quick analysis)
    const urlCount = await countSitemapUrls(entry.url);
    
    if (urlCount === 0) {
      return null; // Skip empty sitemaps
    }
    
    return {
      url: entry.url,
      lastmod: entry.lastmod,
      type,
      category,
      urlCount,
      description: generateDescription(sitemapName, type, urlCount),
      year: dateInfo.year,
      month: dateInfo.month,
      dateGroup: dateInfo.dateGroup,
      selected: false // Initialize all sitemaps as unselected
    };
    
  } catch (error) {
    console.log(`Failed to analyze sitemap: ${entry.url}`, error);
    return null;
  }
}

function classifySitemap(sitemapName: string): 'content' | 'structural' | 'other' {
  // Check for content keywords
  for (const keyword of CONTENT_KEYWORDS) {
    if (sitemapName.includes(keyword)) {
      return 'content';
    }
  }
  
  // Check for structural keywords
  for (const keyword of STRUCTURAL_KEYWORDS) {
    if (sitemapName.includes(keyword)) {
      return 'structural';
    }
  }
  
  return 'other';
}

function extractCategory(sitemapName: string): string {
  // Extract category from sitemap name
  if (sitemapName.includes('post')) return 'Posts';
  if (sitemapName.includes('news')) return 'News';
  if (sitemapName.includes('blog')) return 'Blog';
  if (sitemapName.includes('article')) return 'Articles';
  if (sitemapName.includes('interview')) return 'Interviews';
  if (sitemapName.includes('investment')) return 'Investment';
  if (sitemapName.includes('funding')) return 'Funding';
  if (sitemapName.includes('startup')) return 'Startups';
  if (sitemapName.includes('ai')) return 'AI';
  if (sitemapName.includes('tech')) return 'Technology';
  if (sitemapName.includes('page')) return 'Pages';
  if (sitemapName.includes('category')) return 'Categories';
  if (sitemapName.includes('tag')) return 'Tags';
  if (sitemapName.includes('author')) return 'Authors';
  if (sitemapName.includes('people')) return 'People';
  if (sitemapName.includes('organization')) return 'Organizations';
  
  return 'Other';
}

function generateDescription(sitemapName: string, type: string, urlCount: number): string {
  const category = extractCategory(sitemapName);
  
  if (type === 'content') {
    return `${urlCount} ${category.toLowerCase()} articles`;
  } else if (type === 'structural') {
    return `${urlCount} ${category.toLowerCase()} pages`;
  } else {
    return `${urlCount} URLs`;
  }
}

async function countSitemapUrls(sitemapUrl: string): Promise<number> {
  try {
    const response = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'Scryptr/1.0' },
      // Add timeout to avoid hanging
      signal: AbortSignal.timeout(10000)
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
          // Count URLs in sitemap
          if (result.urlset?.url) {
            resolve(result.urlset.url.length);
          } else {
            resolve(0);
          }
        } catch (parseError) {
          resolve(0);
        }
      });
    });
  } catch (error) {
    return 0;
  }
}

function generateRecommendations(contentSitemaps: SitemapEntry[]): string[] {
  const recommendations: string[] = [];
  
  const totalContentUrls = contentSitemaps.reduce((sum, s) => sum + s.urlCount, 0);
  
  if (contentSitemaps.length === 0) {
    recommendations.push("No content sitemaps found. Try selecting 'Other' sitemaps or use RSS feeds instead.");
  } else {
    recommendations.push(`Found ${contentSitemaps.length} content sitemaps with ${totalContentUrls} articles.`);
    
    // Recommend specific categories
    const topCategories = contentSitemaps
      .sort((a, b) => b.urlCount - a.urlCount)
      .slice(0, 3);
    
    if (topCategories.length > 0) {
      recommendations.push(`Recommended: ${topCategories.map(s => s.category).join(', ')} for best content coverage.`);
    }
    
    if (totalContentUrls > 1000) {
      recommendations.push("Large dataset detected. Consider using date filters to limit extraction scope.");
    }
  }
  
  return recommendations;
}

function extractDateFromSitemap(sitemapName: string, lastmod?: string): {
  year?: number;
  month?: number;
  dateGroup?: string;
} {
  let year: number | undefined;
  let month: number | undefined;
  let dateGroup: string | undefined;
  
  // Enhanced date pattern matching
  const patterns = [
    // YYYY-MM or YYYY_MM format
    /(\d{4})[_-](\d{1,2})/,
    // YYYY-MM-DD format
    /(\d{4})[_-](\d{1,2})[_-](\d{1,2})/,
    // post-YYYY-MM format
    /post[_-](\d{4})[_-](\d{1,2})/,
    // sitemap-YYYY-MM format
    /sitemap[_-](\d{4})[_-](\d{1,2})/,
    // news-YYYY-MM format
    /news[_-](\d{4})[_-](\d{1,2})/,
    // article-YYYY-MM format
    /article[_-](\d{4})[_-](\d{1,2})/,
    // YYYY-QN (quarterly) format
    /(\d{4})[_-]q(\d)/i,
    // Just year YYYY format (lowest priority)
    /(\d{4})/
  ];
  
  // Month name patterns
  const monthNames = {
    'january': 1, 'jan': 1,
    'february': 2, 'feb': 2,
    'march': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'may': 5,
    'june': 6, 'jun': 6,
    'july': 7, 'jul': 7,
    'august': 8, 'aug': 8,
    'september': 9, 'sep': 9, 'sept': 9,
    'october': 10, 'oct': 10,
    'november': 11, 'nov': 11,
    'december': 12, 'dec': 12
  };
  
  // Try month name patterns first (january-2025, jan-2025, etc.)
  const monthNamePattern = /(\w+)[_-](\d{4})|(\d{4})[_-](\w+)/i;
  const monthNameMatch = sitemapName.match(monthNamePattern);
  
  if (monthNameMatch) {
    const monthStr = (monthNameMatch[1] || monthNameMatch[4])?.toLowerCase();
    const yearStr = monthNameMatch[2] || monthNameMatch[3];
    
    if (monthStr && yearStr && monthNames[monthStr as keyof typeof monthNames]) {
      year = parseInt(yearStr);
      month = monthNames[monthStr as keyof typeof monthNames];
      dateGroup = `${year}-${month.toString().padStart(2, '0')}`;
      return { year, month, dateGroup };
    }
  }
  
  // Try numeric patterns
  for (const pattern of patterns) {
    const match = sitemapName.match(pattern);
    if (match) {
      if (pattern.source.includes('q') && match[2]) {
        // Quarterly format (2025-Q1)
        year = parseInt(match[1]);
        const quarter = parseInt(match[2]);
        month = (quarter - 1) * 3 + 1; // Q1=Jan, Q2=Apr, Q3=Jul, Q4=Oct
        dateGroup = `${year}-Q${quarter}`;
        return { year, month, dateGroup };
      } else if (match[2]) {
        // Year-Month format
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        if (month >= 1 && month <= 12) {
          dateGroup = `${year}-${month.toString().padStart(2, '0')}`;
          return { year, month, dateGroup };
        }
      } else if (match[1]) {
        // Year only format
        year = parseInt(match[1]);
        // Only use year if it's reasonable (2020-2030)
        if (year >= 2020 && year <= 2030) {
          dateGroup = year.toString();
          return { year, month, dateGroup };
        }
      }
    }
  }
  
  // Fallback to lastmod date
  if (lastmod) {
    const date = new Date(lastmod);
    if (!isNaN(date.getTime())) {
      year = date.getFullYear();
      month = date.getMonth() + 1;
      dateGroup = `${year}-${month.toString().padStart(2, '0')}`;
    }
  }
  
  return { year, month, dateGroup };
}

function groupContentSitemapsByDate(contentSitemaps: SitemapEntry[]): Record<string, SitemapEntry[]> {
  const grouped: Record<string, SitemapEntry[]> = {};
  
  for (const sitemap of contentSitemaps) {
    const dateGroup = sitemap.dateGroup || 'unknown';
    
    if (!grouped[dateGroup]) {
      grouped[dateGroup] = [];
    }
    
    grouped[dateGroup].push(sitemap);
  }
  
  // Sort groups by date (newest first)
  const sortedGroups: Record<string, SitemapEntry[]> = {};
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'unknown') return 1;
    if (b === 'unknown') return -1;
    return b.localeCompare(a);
  });
  
  for (const key of sortedKeys) {
    sortedGroups[key] = grouped[key].sort((a, b) => b.urlCount - a.urlCount);
  }
  
  return sortedGroups;
}
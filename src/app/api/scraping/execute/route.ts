import { NextRequest, NextResponse } from 'next/server';
import { DecodoAPI } from '@/lib/web-scraping/decodo-api';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ScrapingJob {
  id: string;
  targetUrl: string;
  strategy: any;
  fields: any[];
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: {
    current: number;
    total: number;
    message: string;
  };
  results: any[];
  createdAt: string;
}

// In-memory storage for demo (use database in production)
const jobs = new Map<string, ScrapingJob>();

export async function POST(request: NextRequest) {
  try {
    const { prompt, config, articleLimit, isDemoMode = true } = await request.json();

    // Create job
    const jobId = Date.now().toString();
    const job: ScrapingJob = {
      id: jobId,
      targetUrl: config.targetUrl,
      strategy: config.strategy,
      fields: config.fields,
      status: 'pending',
      progress: { current: 0, total: 0, message: 'Initializing...' },
      results: [],
      createdAt: new Date().toISOString(),
    };

    jobs.set(jobId, job);

    // Start scraping in background
    executeScrapingJob(jobId, config, prompt, articleLimit, isDemoMode).catch(console.error);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('Error starting scraping job:', error);
    return NextResponse.json(
      { error: 'Failed to start scraping job' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(job);
}

async function executeScrapingJob(jobId: string, config: any, prompt?: string, articleLimit?: number, isDemoMode: boolean = true) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'running';
    jobs.set(jobId, job);

    if (isDemoMode) {
      // Demo mode - simulate scraping without using API
      const limit = Math.min(articleLimit || 3, 10); // Max 10 items for demo
      job.progress.total = limit;
      job.progress.message = 'Demo Mode: Simulating scraping...';
      jobs.set(jobId, job);

      // Simulate processing delay
      for (let i = 0; i < limit; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second per item

        job.progress.current = i + 1;
        job.progress.message = `Demo Mode: Processing item ${i + 1}/${limit}...`;
        jobs.set(jobId, job);

        // Generate demo data based on prompt
        const result: any = {};

        // Common fields
        result.url = config.targetUrl;
        result.scrapedAt = new Date().toISOString();

        // Generate field values based on field names and prompt
        config.fields.forEach((field: any) => {
          const fieldName = field.name.toLowerCase();

          // Extract domain from target URL for realistic URLs
          const urlDomain = config.targetUrl ? new URL(config.targetUrl).hostname : 'example.com';
          const cleanDomain = urlDomain.replace('www.', '');

          if (fieldName.includes('title') || fieldName.includes('headline')) {
            result[field.name] = `Sample Article Title ${i + 1}: ${prompt?.substring(0, 30) || 'Topic'}`;
          } else if (fieldName.includes('company') && fieldName.includes('website')) {
            // Generate company website URLs
            const companies = ['techcorp', 'innovatelab', 'dataflow', 'cloudsync', 'aisolutions', 'startupx', 'fintechy'];
            const company = companies[i % companies.length];
            result[field.name] = `https://www.${company}.com`;
          } else if (fieldName.includes('company') || fieldName.includes('organization')) {
            // Generate company names
            const companies = ['TechCorp', 'InnovateLab', 'DataFlow', 'CloudSync', 'AI Solutions', 'StartupX', 'FinTechY'];
            result[field.name] = companies[i % companies.length];
          } else if (fieldName.includes('article') && fieldName.includes('url')) {
            // Generate realistic article URLs
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate() - i).padStart(2, '0');
            const title = `sample-article-${i + 1}`.replace(/\s+/g, '-');
            result[field.name] = `https://${cleanDomain}/${year}/${month}/${day}/${title}`;
          } else if (fieldName.includes('url') && !fieldName.includes('company')) {
            // Generic URL field - could be article or page URL
            if (fieldName.includes('article') || prompt?.toLowerCase().includes('article')) {
              // Article URL pattern
              const date = new Date();
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const title = `sample-article-${i + 1}`.replace(/\s+/g, '-');
              result[field.name] = `https://${cleanDomain}/${year}/${month}/${title}`;
            } else {
              // Regular URL
              result[field.name] = `https://${cleanDomain}/page/${i + 1}`;
            }
          } else if (fieldName.includes('funding') || fieldName.includes('amount') || fieldName.includes('investment')) {
            const amounts = ['$2.5M', '$5.0M', '$10M', '$15.5M', '$20M', '$50M', '$100M'];
            result[field.name] = amounts[i % amounts.length];
          } else if (fieldName.includes('date') || fieldName.includes('published')) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            result[field.name] = date.toISOString().split('T')[0];
          } else if (fieldName.includes('description') || fieldName.includes('summary')) {
            result[field.name] = `This is a sample description for item ${i + 1} related to ${prompt?.substring(0, 50) || 'the topic'}.`;
          } else {
            result[field.name] = `Sample ${field.name} value ${i + 1}`;
          }
        });

        job.results.push(result);
      }
    } else {
      // Real API mode - use actual Decodo API
      try {
        // Initialize Decodo API
        const decodo = new DecodoAPI(
          process.env.DECODO_USERNAME || '',
          process.env.DECODO_PASSWORD || ''
        );

        // First, scrape the main page to get article URLs
        job.progress.total = articleLimit || 3;
        job.progress.message = 'Real API Mode: Fetching page content...';
        jobs.set(jobId, job);

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API request timeout')), 30000); // 30 second timeout
        });

        // Race the API call against the timeout
        const mainPageResponse = await Promise.race([
          decodo.scrape({
            url: config.targetUrl,
            parse: false,
            headless: 'html',
            country_code: 'us',
          }),
          timeoutPromise
        ]) as any;

        console.log('Decodo API Response:', JSON.stringify(mainPageResponse, null, 2));

        if (!mainPageResponse.success) {
          throw new Error(`Failed to fetch main page: ${mainPageResponse.error}`);
        }

        // Get the HTML content
        const htmlContent = mainPageResponse.data?.content || '';
        console.log('HTML Content Length:', htmlContent.length);
        console.log('HTML Content Preview:', htmlContent.substring(0, 500));

        // If no content found, create a simple demo with the target URL
        if (!htmlContent || htmlContent.length < 100) {
          console.log('No content found, using fallback');
          // Create some demo URLs based on the target
          const limitedUrls = [];
          const baseUrl = config.targetUrl;
          for (let i = 0; i < Math.min(articleLimit || 3, 3); i++) {
            limitedUrls.push(baseUrl);
          }

          job.progress.total = limitedUrls.length;
          job.progress.message = `Real API Mode: Found ${limitedUrls.length} articles (limited content)...`;
          jobs.set(jobId, job);

          // Process these URLs
          for (let i = 0; i < limitedUrls.length; i++) {
            const articleUrl = limitedUrls[i];
            job.progress.current = i + 1;
            job.progress.message = `Real API Mode: Processing article ${i + 1}/${limitedUrls.length}...`;
            jobs.set(jobId, job);

            // Create result with the URL
            const result: any = {
              articleUrl: articleUrl,
              scrapedAt: new Date().toISOString(),
              title: `Article ${i + 1} from ${new URL(articleUrl).hostname}`,
            };

            // Add AI analysis for the main page content
            if (config.fields.length > 0 && htmlContent) {
              try {
                const fieldDescriptions = config.fields.map((field: any) => {
                  return `${field.name}: ${field.description || field.name} (${field.type})`;
                }).join('\n');

                const completion = await openai.chat.completions.create({
                  model: "gpt-4-turbo-preview",
                  messages: [
                    {
                      role: "system",
                      content: `You are an expert data extraction assistant. Based on the limited content provided, extract the requested fields.

User's goal: ${prompt || 'Extract structured data from the content'}

Rules:
1. Return only JSON format
2. For missing information, use null or empty string
3. This is a summary page, so extract aggregate information if available

Fields to extract:
${fieldDescriptions}

Response format:
{
  "title": "extracted or null",
  "companyName": "extracted or null",
  "companyWebsite": "extracted or null",
  "fundingAmount": "extracted or null",
  "date": "extracted or null",
  "description": "extracted or null"
}`
                    },
                    {
                      role: "user",
                      content: htmlContent.substring(0, 8000)
                    }
                  ],
                  response_format: { type: "json_object" },
                  temperature: 0.1,
                });

                const aiResult = JSON.parse(completion.choices[0].message.content || '{}');
                Object.assign(result, aiResult);
              } catch (error) {
                console.error('AI analysis failed:', error);
              }
            }

            job.results.push(result);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          // Extract article URLs from the main page content
          const articleUrls = extractArticleUrls(htmlContent, config.targetUrl);
          console.log('Extracted Article URLs:', articleUrls);
          const limitedUrls = articleUrls.slice(0, articleLimit || 3);

        job.progress.total = limitedUrls.length;
        job.progress.message = `Real API Mode: Found ${limitedUrls.length} articles to scrape...`;
        jobs.set(jobId, job);

        // Scrape each article
        for (let i = 0; i < limitedUrls.length; i++) {
          const articleUrl = limitedUrls[i];
          job.progress.current = i + 1;
          job.progress.message = `Real API Mode: Scraping article ${i + 1}/${limitedUrls.length}...`;
          jobs.set(jobId, job);

          // Create timeout for each article request
          const articleTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Article request timeout')), 30000); // 30 second timeout
          });

          // Scrape the article page with timeout
          const articleResponse = await Promise.race([
            decodo.scrape({
              url: articleUrl,
              parse: false,
              headless: 'html',
              country_code: 'us',
            }),
            articleTimeoutPromise
          ]) as any;

          console.log(`Article ${i + 1} Response:`, articleResponse.success ? 'Success' : 'Failed');
          if (!articleResponse.success) {
            console.log(`Article Error: ${articleResponse.error}`);
          }

          if (articleResponse.success) {
            // Analyze the content with AI
            const result: any = {
              articleUrl: articleUrl,
              scrapedAt: new Date().toISOString(),
            };

            // Use AI to extract structured data
            if (config.fields.length > 0) {
              try {
                const fieldDescriptions = config.fields.map((field: any) => {
                  return `${field.name}: ${field.description || field.name} (${field.type})`;
                }).join('\n');

                const completion = await openai.chat.completions.create({
                  model: "gpt-4-turbo-preview",
                  messages: [
                    {
                      role: "system",
                      content: `You are an expert data extraction assistant. Analyze the provided HTML content and extract the requested fields.

User's goal: ${prompt || 'Extract structured data from the content'}

Rules:
1. Return only JSON format
2. For missing information, use null or empty string
3. Clean and format the extracted data
4. If you find URLs, ensure they are absolute URLs

Fields to extract:
${fieldDescriptions}

Response format:
{
  "title": "extracted or null",
  "companyName": "extracted or null",
  "companyWebsite": "extracted or null",
  "fundingAmount": "extracted or null",
  "date": "extracted or null",
  "description": "extracted or null"
}`
                    },
                    {
                      role: "user",
                      content: articleResponse.data?.content?.substring(0, 15000) || ''
                    }
                  ],
                  response_format: { type: "json_object" },
                  temperature: 0.1,
                });

                const aiResult = JSON.parse(completion.choices[0].message.content || '{}');
                Object.assign(result, aiResult);
              } catch (error) {
                console.error('AI analysis failed:', error);
                // Add default values for failed fields
                config.fields.forEach((field: any) => {
                  if (!result[field.name]) {
                    result[field.name] = null;
                  }
                });
              }
            }

            job.results.push(result);
          } else {
            console.error(`Failed to scrape article ${articleUrl}: ${articleResponse.error}`);
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        }
      } catch (error) {
        console.error('Real API scraping failed:', error);
        // Fall back to demo mode with a message
        job.progress.message = `Real API failed (${error instanceof Error ? error.message.substring(0, 50) : 'Unknown error'}) - Falling back to demo mode`;
        jobs.set(jobId, job);

        // Generate demo data as fallback
        const limit = Math.min(articleLimit || 3, 5); // Max 5 items for fallback
        job.progress.total = limit;
        jobs.set(jobId, job);

        for (let i = 0; i < limit; i++) {
          job.progress.current = i + 1;
          job.progress.message = `Fallback Demo Mode: Processing item ${i + 1}/${limit}...`;
          jobs.set(jobId, job);

          // Generate demo data
          const result: any = {
            articleUrl: config.targetUrl,
            scrapedAt: new Date().toISOString(),
            title: `Fallback Article Title ${i + 1} (API Failed)`,
            companyName: 'Demo Company',
            fundingAmount: '$0',
          };

          // Add any additional fields
          config.fields.forEach((field: any) => {
            if (!result[field.name]) {
              result[field.name] = `Fallback ${field.name}`;
            }
          });

          job.results.push(result);
          await new Promise(resolve => setTimeout(resolve, 500)); // Faster for fallback
        }
      }
    }

    job.status = 'completed';
    job.progress.message = `${isDemoMode ? 'Demo' : 'Real API'} scraping completed!`;
    jobs.set(jobId, job);
  } catch (error) {
    job.status = 'error';
    job.progress.message = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    jobs.set(jobId, job);
  }
}

function extractArticleUrls(html: string, baseUrl: string): string[] {
  // Multiple regex patterns for different news site URL structures
  const patterns = [
    // Standard date-based: /2024/01/15/article-title
    /href="([^"]*\/\d{4}\/\d{2}\/\d{1,2}\/[^"]*)"/g,
    // Month/year only: /2024/01/article-title
    /href="([^"]*\/\d{4}\/\d{2}\/[^"]*)"/g,
    // Article with ID: /article/12345 or /news/article-123
    /href="([^"]*(?:article|news|post|story)\/[^"]*)"/gi,
    // Title-based: /news/article-title.html
    /href="([^"]*(?:article|news|post|story)[^"]*\.(?:html|htm|php))"/gi,
    // General news pattern with title
    /href="([^"]*(?:article|news|post|story|blog)[^"]*)"/gi,
    // Any URL that looks like an article (contains year and meaningful words)
    /href="([^"]*(?:\d{4}|20\d{2})[^"]*(?:funding|startup|company|business|tech|finance)[^"]*)"/gi,
  ];

  const allUrls: string[] = [];

  // Try each pattern
  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const url = match.replace(/href="([^"]*)"/, '$1');

        // Skip if it's clearly not an article URL
        if (url.match(/\/(tag|category|author|search|rss|feed|comment|email|share|twitter|facebook|linkedin)\//i)) {
          return;
        }

        // Skip common non-article file extensions
        if (url.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|zip|css|js)$/i)) {
          return;
        }

        allUrls.push(url);
      });
    }
  }

  // Convert to absolute URLs and deduplicate
  const uniqueUrls = [...new Set(allUrls)];

  return uniqueUrls.map(url => {
    // Convert relative URLs to absolute
    if (url.startsWith('/')) {
      return new URL(url, baseUrl).href;
    } else if (url.startsWith('./')) {
      return new URL(url.substring(2), baseUrl).href;
    } else if (!url.startsWith('http')) {
      return new URL(url, baseUrl).href;
    }
    return url;
  }).filter(url => {
    // Ensure valid URLs and same domain (optional, comment out if you want cross-domain)
    try {
      const parsedUrl = new URL(url);
      const baseDomain = new URL(baseUrl).hostname;

      // Basic validation
      if (!parsedUrl.protocol || !parsedUrl.hostname) {
        return false;
      }

      // Optional: restrict to same domain
      // return parsedUrl.hostname === baseDomain;

      return true;
    } catch {
      return false;
    }
  });
}
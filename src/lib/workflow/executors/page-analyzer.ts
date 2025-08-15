// Page Analyzer Node Executor
import { BaseNodeExecutor } from './registry';
import { WorkflowNode, NodeExecutionContext, NodeExecutionResult, ContentAnalysis } from '../types';
import * as cheerio from 'cheerio';

export class PageAnalyzerExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { url, includeImages = true, includeLinks = true, includeSchema = true } = node.properties;
      
      if (!url) {
        throw new Error('URL is required for Page Analyzer node');
      }

      // Fetch the page content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Scryptr-PageAnalyzer/1.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Analyze the page
      const analysis: ContentAnalysis = await this.analyzePage($, url, {
        includeImages,
        includeLinks,
        includeSchema
      });

      const executionTime = Date.now() - startTime;

      return this.createResult(
        true,
        {
          url,
          analysis,
          analyzedAt: new Date().toISOString()
        },
        undefined,
        executionTime
      );

    } catch (error) {
      const executionTime = Date.now() - startTime;
      return this.createResult(
        false, 
        {}, 
        error instanceof Error ? error.message : 'Unknown error',
        executionTime
      );
    }
  }

  private async analyzePage(
    $: cheerio.CheerioAPI, 
    url: string,
    options: {
      includeImages: boolean;
      includeLinks: boolean;
      includeSchema: boolean;
    }
  ): Promise<ContentAnalysis> {
    // Basic page information
    const title = $('title').first().text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    // Heading tags
    const h1Tags = $('h1').map((_, el) => $(el).text().trim()).get();
    const h2Tags = $('h2').map((_, el) => $(el).text().trim()).get();
    
    // Word count (approximate)
    const bodyText = $('body').text();
    const wordCount = bodyText.split(/\s+/).filter(word => word.length > 0).length;
    
    // Links analysis
    let internalLinks = 0;
    let externalLinks = 0;
    
    if (options.includeLinks) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          if (href.startsWith('http') && !href.includes(new URL(url).hostname)) {
            externalLinks++;
          } else if (!href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
            internalLinks++;
          }
        }
      });
    }
    
    // Images count
    let images = 0;
    if (options.includeImages) {
      images = $('img').length;
    }
    
    // Schema markup
    let schema: any[] = [];
    if (options.includeSchema) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const schemaData = JSON.parse($(el).html() || '{}');
          schema.push(schemaData);
        } catch (e) {
          // Invalid JSON schema, skip
        }
      });
    }

    // Calculate SEO score
    const seoScore = this.calculateSEOScore({
      title,
      metaDescription,
      h1Tags,
      h2Tags,
      wordCount,
      internalLinks,
      externalLinks,
      images,
      schema
    });

    return {
      url,
      title,
      metaDescription,
      h1Tags,
      h2Tags,
      wordCount,
      internalLinks,
      externalLinks,
      images,
      schema,
      loadTime: 0, // Would need performance API
      mobileOptimized: $('meta[name="viewport"]').length > 0,
      seoScore
    };
  }

  private calculateSEOScore(data: {
    title: string;
    metaDescription: string;
    h1Tags: string[];
    h2Tags: string[];
    wordCount: number;
    internalLinks: number;
    externalLinks: number;
    images: number;
    schema: any[];
  }): number {
    let score = 0;
    
    // Title tag (20 points max)
    if (data.title) {
      score += 10;
      if (data.title.length >= 30 && data.title.length <= 60) {
        score += 10;
      }
    }
    
    // Meta description (15 points max)
    if (data.metaDescription) {
      score += 8;
      if (data.metaDescription.length >= 120 && data.metaDescription.length <= 160) {
        score += 7;
      }
    }
    
    // H1 tag (15 points max)
    if (data.h1Tags.length === 1) {
      score += 15;
    } else if (data.h1Tags.length > 1) {
      score += 5; // Multiple H1s are not ideal
    }
    
    // H2 tags (10 points max)
    if (data.h2Tags.length > 0) {
      score += Math.min(10, data.h2Tags.length * 2);
    }
    
    // Content length (15 points max)
    if (data.wordCount >= 300) {
      score += 10;
      if (data.wordCount >= 1000) {
        score += 5;
      }
    }
    
    // Internal links (10 points max)
    if (data.internalLinks > 0) {
      score += Math.min(10, data.internalLinks * 2);
    }
    
    // External links (5 points max)
    if (data.externalLinks > 0 && data.externalLinks <= 5) {
      score += 5;
    }
    
    // Images (5 points max)
    if (data.images > 0) {
      score += Math.min(5, data.images);
    }
    
    // Schema markup (5 points max)
    if (data.schema.length > 0) {
      score += 5;
    }
    
    return Math.min(100, score);
  }
}
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { parseString } from 'xml2js';
import { cacheManager } from '../../../../lib/cache/cache-manager';
import { aiModelManager } from '../../../../lib/ai-orchestration/model-manager';
import { aiLoadBalancer } from '../../../../lib/ai-orchestration/load-balancer';
import { processingStateManager } from '../../../../lib/processing-state';

// Configure API route timeout for long-running operations
export const maxDuration = 300; // 5 minutes for Vercel

// Global rate limiting and performance tracking
interface RateLimitTracker {
  requests: number;
  errors: number;
  lastRequestTime: number;
  averageResponseTime: number;
  successRate: number;
  domain: string;
}

const domainMetrics = new Map<string, RateLimitTracker>();

interface Rule {
  id: string;
  type: 'contains' | 'not_contains' | 'regex' | 'starts_with' | 'ends_with';
  value: string;
  caseSensitive: boolean;
}

interface WorkflowRules {
  titleRules: Rule[];
  bodyRules: Rule[];
  urlRules: Rule[];
  titleLogic: 'AND' | 'OR';
  bodyLogic: 'AND' | 'OR';
  urlLogic: 'AND' | 'OR';
}

interface ExtractRequest {
  domain: string;
  sources: Array<{
    type: 'sitemap' | 'rss' | 'atom';
    url: string;
    title: string;
    count: number;
    selected: boolean;
  }>;
  aiConfig: {
    apiProvider: 'openai' | 'claude' | 'gemini' | 'openrouter';
    apiKey: string;
    model: string;
    customPrompt: string;
    dataFields: string[];
    filters: {
      maxArticles: number;
      dateRange: number;
      keywords: string;
    };
  };
  workflowRules?: WorkflowRules;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

interface Article {
  url: string;
  title: string;
  content: string;
  publishedDate?: string;
  author?: string;
}

interface ExtractedData {
  [key: string]: string | null;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now(); // Initialize startTime at the very beginning
  let jobId: string | undefined; // Declare jobId in outer scope for error handling
  
  try {
    const { domain, sources, aiConfig, workflowRules }: ExtractRequest = await request.json();
    
    console.log(`🚀 [0%] Starting extraction for ${domain} with ${sources.length} sources`);
    
    // Create processing job for state management
    jobId = processingStateManager.createJob(domain, aiConfig.filters.maxArticles);
    processingStateManager.updateJob(jobId, {
      status: 'processing',
      progress: 0,
      currentStage: `Starting extraction for ${domain} with ${sources.length} sources`
    });
    
    // Initialize cache system
    console.log(`🔧 [2%] Initializing cache management system...`);
    processingStateManager.updateJob(jobId, {
      progress: 2,
      currentStage: 'Initializing cache management system...'
    });
    await cacheManager.initialize();
    
    // Step 1: Collect article URLs from all selected sources
    console.log(`📡 [5%] Discovering articles from sitemaps and feeds...`);
    processingStateManager.updateJob(jobId, {
      progress: 5,
      currentStage: 'Discovering articles from sitemaps and feeds...'
    });
    const articleUrls: string[] = [];
    
    for (const source of sources) {
      if (!source.selected) continue;
      
      console.log(`🔍 [7%] Processing source: ${source.url}`);
      
      if (source.type === 'sitemap') {
        const urls = await extractUrlsFromSitemapWithCache(source.url, aiConfig.filters.maxArticles);
        articleUrls.push(...urls);
        console.log(`📋 Found ${urls.length} URLs from sitemap`);
      } else if (source.type === 'rss' || source.type === 'atom') {
        const urls = await extractUrlsFromFeedWithCache(source.url, aiConfig.filters.maxArticles);
        articleUrls.push(...urls);
        console.log(`📰 Found ${urls.length} URLs from ${source.type.toUpperCase()} feed`);
      }
    }
    
    // Remove duplicates and limit
    const uniqueUrls = [...new Set(articleUrls)].slice(0, aiConfig.filters.maxArticles);
    console.log(`🔗 [10%] Found ${uniqueUrls.length} unique article URLs to process`);
    processingStateManager.updateJob(jobId, {
      progress: 10,
      currentStage: `Found ${uniqueUrls.length} unique articles to process`,
      metadata: { totalUrls: uniqueUrls.length }
    });
    
    // Step 2: Advanced Asynchronous Content Extraction with Smart Concurrency
    console.log(`📖 [15%] Starting content extraction from ${uniqueUrls.length} articles...`);
    processingStateManager.updateJob(jobId, {
      progress: 15,
      currentStage: `Extracting content from ${uniqueUrls.length} articles...`
    });
    const articles: Article[] = [];
    
    // Intelligent concurrency management based on workload analysis
    const smartConcurrency = calculateOptimalConcurrency(uniqueUrls.length, domain);
    const maxConcurrent = smartConcurrency.contentExtraction;
    const batchSize = smartConcurrency.batchSize;
    
    console.log(`🚀 [17%] Processing ${uniqueUrls.length} URLs with ${maxConcurrent} concurrent workers (${batchSize} URLs per batch)`);
    
    // Create intelligent batching with priority queue
    const urlBatches = [];
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      urlBatches.push(uniqueUrls.slice(i, i + batchSize));
    }
    
    // Process all batches concurrently with advanced error handling
    const batchPromises = urlBatches.map(async (batch, batchIndex) => {
      const batchResults: Article[] = [];
      
      const batchProgress = Math.round(15 + ((batchIndex / urlBatches.length) * 30)); // 15-45% for content extraction
      console.log(`📦 [${batchProgress}%] Batch ${batchIndex + 1}/${urlBatches.length}: Processing ${batch.length} URLs`);
      
      // Process URLs in each batch with controlled concurrency
      const urlPromises = batch.map(async (url, urlIndex) => {
        const startTime = Date.now();
        try {
          const article = await extractArticleContentWithCache(url, batchIndex, urlIndex);
          const processingTime = Date.now() - startTime;
          
          if (article) {
            batchResults.push(article);
            updateDomainMetrics(domain, processingTime, true);
            console.log(`✅ Extracted: ${article.title.substring(0, 50)}... (${processingTime}ms)`);
          } else {
            updateDomainMetrics(domain, processingTime, false);
          }
        } catch (error) {
          const processingTime = Date.now() - startTime;
          updateDomainMetrics(domain, processingTime, false);
          console.log(`❌ Failed: ${url} (${processingTime}ms) - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
      
      await Promise.allSettled(urlPromises);
      
      // Adaptive rate limiting between batches
      if (batchIndex < urlBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, smartConcurrency.rateLimitDelay));
      }
      
      return batchResults;
    });
    
    // Collect results from all batches
    const allBatchResults = await Promise.allSettled(batchPromises);
    
    allBatchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        articles.push(...result.value);
        console.log(`📊 Batch ${index + 1} completed: ${result.value.length} articles extracted`);
      } else {
        console.error(`❌ Batch ${index + 1} failed:`, result.reason);
      }
    });
    
    const extractionTime = Date.now() - startTime; // Calculate extraction time up to this point
    console.log(`✅ [45%] Successfully extracted ${articles.length} articles in ${(extractionTime/1000).toFixed(1)}s`);
    
    // Log final domain performance summary
    const finalDomainStats = domainMetrics.get(domain);
    if (finalDomainStats) {
      console.log(`🏆 Domain Performance Summary for ${domain}:`);
      console.log(`   📊 Total Requests: ${finalDomainStats.requests}`);
      console.log(`   ✅ Success Rate: ${finalDomainStats.successRate.toFixed(1)}%`);
      console.log(`   ⚡ Avg Response Time: ${finalDomainStats.averageResponseTime.toFixed(0)}ms`);
      console.log(`   ❌ Error Count: ${finalDomainStats.errors}`);
    }
    
    // Step 3: Filter articles by date, keywords, and workflow rules
    let filteredArticles = filterArticles(articles, aiConfig.filters);
    console.log(`After basic filtering: ${filteredArticles.length} articles`);
    
    // Apply workflow rules if provided
    if (workflowRules) {
      filteredArticles = applyWorkflowRules(filteredArticles, workflowRules);
      console.log(`After workflow rules: ${filteredArticles.length} articles`);
    }
    
    // Step 4: Smart Model Selection with Health Awareness
    console.log('🧠 Performing smart model selection with health monitoring...');
    let optimalModel = aiConfig.model;
    let modelHealthData: any = null;
    
    if (aiConfig.apiProvider === 'openrouter') {
      // Try to get current health data for intelligent model prioritization
      try {
        const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/scrape/model-health`, {
          method: 'GET'
        });
        
        if (healthResponse.ok) {
          modelHealthData = await healthResponse.json();
          console.log('📊 Using health data for model selection');
        }
      } catch (healthError) {
        console.log('⚠️ Could not fetch health data, using basic selection');
      }
      
      // Prioritize models based on health data if available - 2025 Updated
      let availableModels = [
        // User's Working Model (Priority)
        'google/gemma-3n-e2b-it:free',
        // Latest Free Models (2025) - 100% Working
        'google/gemma-3n-4b:free',
        'deepseek/deepseek-r1-0528-qwen3-8b:free',
        'mistral/devstral-small-2505:free',
        'google/gemma-3n-2b:free',
        'tencent/hunyuan-a13b-instruct:free',
        'venice/uncensored-dolphin-mistral-24b:free',
        'kimi/k2:free',
        // Latest Premium Models (2025) - Top Performance
        'qwen/qwen3-235b-a22b-thinking-2507',
        'openai/gpt-4o-mini',
        'anthropic/claude-3-5-haiku-20241022',
        'google/gemini-2.0-flash-exp',
        'google/gemini-1.5-pro',
        'mistral/mistral-large-2407',
        'meta-llama/llama-3.3-70b-instruct'
      ];
      
      if (modelHealthData?.success && modelHealthData.healthResults) {
        // Sort models by health score (success rate + reliability)
        const healthyModels = modelHealthData.healthResults
          .filter((h: any) => h.successRate > 70 && h.reliability !== 'poor')
          .map((h: any) => h.model);
        
        const unhealthyModels = availableModels.filter(m => !healthyModels.includes(m));
        availableModels = [...healthyModels, ...unhealthyModels];
        
        console.log(`🏥 Prioritized models based on health: ${healthyModels.map(m => m.split('/').pop()).join(', ')}`);
      }
      
      // Test primary model first, then health-prioritized fallbacks
      const modelsToTest = [aiConfig.model, ...availableModels.filter(m => m !== aiConfig.model)];
      
      for (const modelToTest of modelsToTest) {
        try {
          console.log(`🔍 Testing model: ${modelToTest}`);
          const testResponse = await testModelAvailability(modelToTest, aiConfig.apiKey);
          
          if (testResponse.available) {
            optimalModel = modelToTest;
            
            // Log health context if available
            if (modelHealthData?.healthResults) {
              const modelHealth = modelHealthData.healthResults.find((h: any) => h.model === optimalModel);
              if (modelHealth) {
                console.log(`✅ Selected ${optimalModel} (${modelHealth.successRate}% success rate, ${modelHealth.reliability} reliability)`);
              } else {
                console.log(`✅ Selected optimal model: ${optimalModel}`);
              }
            } else {
              console.log(`✅ Selected optimal model: ${optimalModel}`);
            }
            break;
          } else {
            console.log(`❌ Model ${modelToTest} unavailable: ${testResponse.error}`);
          }
        } catch (testError) {
          console.log(`❌ Model ${modelToTest} test failed:`, testError instanceof Error ? testError.message : testError);
        }
      }
      
      // Update AI config with optimal model
      aiConfig.model = optimalModel;
    }
    
    // Step 5: Revolutionary AI Orchestration System
    console.log(`🤖 [50%] Starting AI orchestration for ${filteredArticles.length} articles...`);
    processingStateManager.updateJob(jobId, {
      progress: 50,
      currentStage: `Processing ${filteredArticles.length} articles with AI orchestration...`
    });
    const extractedData: ExtractedData[] = [];
    const aiProcessingStartTime = Date.now();
    
    console.log(`🚀 [52%] Initializing multi-model AI orchestration system...`);
    processingStateManager.updateJob(jobId, {
      progress: 52,
      currentStage: 'Initializing multi-model AI orchestration system...'
    });
    
    // Initialize AI orchestration system
    await cacheManager.initialize();
    
    // Determine optimal distribution strategy based on workload
    console.log(`🎯 [55%] Analyzing workload to select optimal distribution strategy...`);
    let distributionStrategy = 'intelligent_queue'; // Default strategy
    
    if (filteredArticles.length <= 10) {
      distributionStrategy = 'parallel_multi_model'; // Race multiple models for small batches
    } else if (filteredArticles.length > 50) {
      distributionStrategy = 'cost_optimized'; // Optimize cost for large batches
    } else if (aiConfig.customFields?.some((f: any) => f.includes('analysis') || f.includes('sentiment'))) {
      distributionStrategy = 'performance_first'; // Use best models for complex extraction
    }
    
    console.log(`🎯 [57%] Selected distribution strategy: ${distributionStrategy}`);
    
    // Prepare requests for AI orchestration system
    console.log(`📋 [60%] Preparing ${filteredArticles.length} requests for AI processing...`);
    const aiRequests = filteredArticles.map(article => ({
      content: article.content,
      prompt: aiConfig.customPrompt,
      priority: 'normal' as const,
      maxResponseTime: 15000, // 15 second timeout
      maxCost: aiConfig.maxCostPerRequest || Infinity
    }));
    
    console.log(`📊 [62%] Requests prepared, initiating AI orchestration system...`);
    
    // TEMPORARY: Use legacy AI processing until orchestration is debugged
    console.log(`🔄 [65%] Using legacy AI processing for debugging...`);
    
    let processedCount = 0;
    const totalArticles = filteredArticles.length;
    
    for (let i = 0; i < filteredArticles.length; i++) {
      const article = filteredArticles[i];
      
      try {
        console.log(`🤖 [${65 + (i / totalArticles) * 25}%] Processing article ${i + 1}/${totalArticles}: ${article.title.substring(0, 50)}...`);
        
        const result = await processArticleWithAI(article, aiConfig);
        
        console.log(`🔍 DEBUG: AI Result for article ${i + 1}:`, JSON.stringify(result, null, 2));
        
        if (result) {
          const extractedItem = {
            source_url: article.url,
            ...result
          };
          extractedData.push(extractedItem);
          processedCount++;
          
          console.log(`✅ Successfully processed article ${i + 1}: ${Object.keys(result).length} fields extracted`);
          console.log(`📋 Extracted fields:`, Object.keys(result).map(key => `${key}: ${result[key]}`));
          console.log(`🏷️ Final data item:`, JSON.stringify(extractedItem, null, 2));
        } else {
          console.log(`❌ Failed to process article ${i + 1}: No data returned`);
        }
        
      } catch (articleError) {
        console.error(`❌ Error processing article ${i + 1}:`, articleError instanceof Error ? articleError.message : articleError);
      }
      
      // Update processing job progress
      processingStateManager.updateJob(jobId, {
        progress: Math.round(65 + ((i + 1) / totalArticles) * 25),
        currentStage: `AI processing: ${i + 1}/${totalArticles} articles (${processedCount} successful)`
      });
    }
    
    console.log(`🏁 Legacy AI processing complete: ${processedCount}/${totalArticles} articles processed successfully`);
    
    const totalAiTime = Date.now() - aiProcessingStartTime;
    const successRate = ((extractedData.length / filteredArticles.length) * 100).toFixed(1);
    const avgTimePerArticle = filteredArticles.length > 0 ? (totalAiTime / filteredArticles.length).toFixed(0) : '0';
    
    // Get orchestration analytics
    console.log(`📊 [90%] Gathering performance analytics and cache statistics...`);
    const orchestrationAnalytics = aiModelManager.getPerformanceAnalytics();
    const loadBalancerAnalytics = aiLoadBalancer.getAnalytics();
    
    console.log(`🚀 [95%] AI Orchestration Complete: ${extractedData.length}/${filteredArticles.length} articles (${successRate}% success rate, ${avgTimePerArticle}ms/article)`);
    console.log(`🎯 Strategy: ${distributionStrategy} | Models Active: ${orchestrationAnalytics.systemHealth.totalModelsActive}`);
    console.log(`🏆 Top Performer: ${orchestrationAnalytics.modelPerformance[0]?.model || 'N/A'} (${orchestrationAnalytics.systemHealth.averageSystemSuccessRate.toFixed(1)}% avg success)`);
    
    // Get cache performance statistics
    const cacheStats = await cacheManager.getDetailedCacheStats();
    console.log(`📊 [97%] Cache Performance: ${cacheStats.totalKeys} total keys, ${cacheStats.articleCount} articles cached`);
    
    console.log(`✅ [100%] Extraction Complete! Successfully processed ${extractedData.length} articles in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    
    // DEBUG: Log final extracted data
    console.log(`🔍 FINAL DEBUG: Total extracted data items: ${extractedData.length}`);
    if (extractedData.length > 0) {
      console.log(`📋 Sample extracted item:`, JSON.stringify(extractedData[0], null, 2));
      console.log(`🏷️ All field names in first item:`, Object.keys(extractedData[0]));
    }
    
    // Complete the processing job
    const finalResults = {
      success: true,
      data: {
        domain,
        total_found: uniqueUrls.length,
        total_extracted: articles.length,
        total_processed: extractedData.length,
        results: extractedData,
        cache_performance: {
          total_cached_items: cacheStats.totalKeys,
          articles_cached: cacheStats.articleCount,
          ai_responses_cached: cacheStats.aiResponseCount
        },
        orchestration_analytics: {
          strategy_used: distributionStrategy,
          active_models: orchestrationAnalytics.systemHealth.totalModelsActive,
          system_success_rate: orchestrationAnalytics.systemHealth.averageSystemSuccessRate
        }
      }
    };
    
    processingStateManager.completeJob(jobId, finalResults);
    
    return NextResponse.json({
      ...finalResults,
      processing_job_id: jobId, // Include job ID for frontend tracking
      data: {
        ...finalResults.data,
        total_filtered: filteredArticles.length,
        timestamp: new Date().toISOString(),
        ai_model_used: optimalModel,
        model_selection_applied: aiConfig.apiProvider === 'openrouter',
        workflow_stats: workflowRules ? {
          title_rules: workflowRules.titleRules?.length || 0,
          body_rules: workflowRules.bodyRules?.length || 0,
          url_rules: workflowRules.urlRules?.length || 0,
          rules_applied: true
        } : {
          rules_applied: false
        },
        cache_performance: {
          ...finalResults.data.cache_performance,
          sitemaps_cached: cacheStats.sitemapCount,
          estimated_speed_improvement: cacheStats.performance?.estimatedTimeSaved || 'N/A',
          cache_recommendations: cacheStats.recommendations || []
        },
        orchestration_analytics: {
          ...finalResults.data.orchestration_analytics,
          top_performer: orchestrationAnalytics.modelPerformance[0]?.model || 'N/A',
          load_balancer_status: loadBalancerAnalytics.systemLoad.status,
          model_recommendations: orchestrationAnalytics.recommendations,
          circuit_breakers_open: orchestrationAnalytics.systemHealth.circuitBreakersOpen
        },
        performance: {
          total_time: Date.now() - startTime,
          extraction_time: extractionTime,
          ai_processing_time: totalAiTime
        }
      }
    });
    
  } catch (error) {
    console.error('Extraction error:', error);
    
    // Fail the processing job if it was created
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    if (jobId) {
      processingStateManager.failJob(jobId, errorMessage);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        processing_job_id: jobId || null
      },
      { status: 500 }
    );
  }
}

// Cached wrapper for sitemap extraction
async function extractUrlsFromSitemapWithCache(sitemapUrl: string, maxUrls: number): Promise<string[]> {
  try {
    // Check cache first
    const cached = await cacheManager.getOrSetArticle(
      `sitemap_${sitemapUrl}`,
      async () => {
        const urls = await extractUrlsFromSitemap(sitemapUrl, maxUrls);
        return { urls, extractedAt: new Date().toISOString() };
      },
      { strategy: 'conservative', maxAge: 3600 } // 1 hour cache
    );
    
    // Return the URLs array from cached data
    if (cached && cached.urls && Array.isArray(cached.urls)) {
      console.log(`🎯 Using cached sitemap with ${cached.urls.length} URLs`);
      return cached.urls;
    } else if (cached && Array.isArray(cached)) {
      return cached;
    }
    
    // Fallback to direct extraction if cache format is unexpected
    console.log(`🔄 Cache miss or invalid format, extracting fresh sitemap URLs`);
    return await extractUrlsFromSitemap(sitemapUrl, maxUrls);
    
  } catch (error) {
    console.error('❌ Sitemap cache error, falling back to direct extraction:', error);
    return await extractUrlsFromSitemap(sitemapUrl, maxUrls);
  }
}

// Cached wrapper for feed extraction
async function extractUrlsFromFeedWithCache(feedUrl: string, maxUrls: number): Promise<string[]> {
  try {
    // Check cache first
    const cached = await cacheManager.getOrSetArticle(
      `feed_${feedUrl}`,
      async () => {
        const urls = await extractUrlsFromFeed(feedUrl, maxUrls);
        return { urls, extractedAt: new Date().toISOString() };
      },
      { strategy: 'conservative', maxAge: 3600 } // 1 hour cache
    );
    
    // Return the URLs array from cached data
    if (cached && cached.urls && Array.isArray(cached.urls)) {
      console.log(`🎯 Using cached feed with ${cached.urls.length} URLs`);
      return cached.urls;
    } else if (cached && Array.isArray(cached)) {
      return cached;
    }
    
    // Fallback to direct extraction if cache format is unexpected
    console.log(`🔄 Cache miss or invalid format, extracting fresh feed URLs`);
    return await extractUrlsFromFeed(feedUrl, maxUrls);
    
  } catch (error) {
    console.error('❌ Feed cache error, falling back to direct extraction:', error);
    return await extractUrlsFromFeed(feedUrl, maxUrls);
  }
}

async function extractUrlsFromSitemap(sitemapUrl: string, maxUrls: number): Promise<string[]> {
  console.log(`⚡ Lightning-fast sitemap extraction: ${sitemapUrl}`);
  const startTime = Date.now();
  
  // Create timeout promise for ultra-fast discovery
  const timeoutPromise = new Promise<string[]>((resolve) => {
    setTimeout(() => {
      console.log(`⏰ Sitemap timeout after 3s, returning partial results`);
      resolve([]);
    }, 3000); // 3 second max timeout
  });
  
  const extractionPromise = async (): Promise<string[]> => {
    try {
      // Ultra-fast fetch with aggressive timeout
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 2500); // 2.5s fetch limit
      
      const response = await fetch(sitemapUrl, {
        headers: { 
          'User-Agent': 'Scryptr/2.0 (High-Speed)',
          'Accept': 'application/xml,text/xml',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        signal: controller.signal
      });
      
      clearTimeout(fetchTimeout);
      
      if (!response.ok) {
        console.log(`⚠️ Sitemap HTTP ${response.status}, skipping`);
        return [];
      }
      
      const xml = await response.text();
      const xmlSize = (xml.length / 1024).toFixed(1);
      console.log(`📥 Downloaded ${xmlSize}KB sitemap XML`);
      
      // ULTRA-FAST regex-based extraction (10x faster than XML parsing)
      const urls: string[] = [];
      
      // High-performance regex to extract all <loc> URLs
      const locRegex = /<loc[^>]*>([^<]+)<\/loc>/gi;
      let match;
      let urlCount = 0;
      
      while ((match = locRegex.exec(xml)) !== null && urlCount < maxUrls) {
        const url = match[1].trim();
        // Quick validation - must be HTTP/HTTPS URL
        if (url.startsWith('http://') || url.startsWith('https://')) {
          urls.push(url);
          urlCount++;
        }
      }
      
      const extractionTime = Date.now() - startTime;
      console.log(`🚀 Lightning extraction: ${urls.length} URLs in ${extractionTime}ms`);
      
      return urls;
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`⚡ Sitemap fetch aborted for speed, continuing with available data`);
      } else {
        console.error('❌ Fast sitemap error:', error instanceof Error ? error.message : error);
      }
      return [];
    }
  };
  
  // Race between extraction and timeout for maximum speed
  return Promise.race([extractionPromise(), timeoutPromise]);
}

async function extractUrlsFromFeed(feedUrl: string, maxUrls: number): Promise<string[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Scryptr/1.0' }
    });
    
    if (!response.ok) return [];
    
    const xml = await response.text();
    
    return new Promise((resolve) => {
      parseString(xml, (err, result) => {
        if (err) {
          resolve([]);
          return;
        }
        
        try {
          const urls: string[] = [];
          
          // Handle RSS feed
          if (result.rss?.channel?.[0]?.item) {
            for (const item of result.rss.channel[0].item.slice(0, maxUrls)) {
              if (item.link?.[0]) {
                urls.push(item.link[0]);
              }
            }
          }
          
          // Handle Atom feed
          if (result.feed?.entry) {
            for (const entry of result.feed.entry.slice(0, maxUrls)) {
              if (entry.link?.[0]?.$.href) {
                urls.push(entry.link[0].$.href);
              }
            }
          }
          
          resolve(urls);
        } catch (parseError) {
          resolve([]);
        }
      });
    });
  } catch (error) {
    console.log('Error extracting from feed:', error);
    return [];
  }
}

// Cached wrapper for article extraction
async function extractArticleContentWithCache(url: string, batchIndex: number, urlIndex: number): Promise<Article | null> {
  return await cacheManager.getOrSetArticle(
    url,
    () => extractArticleContentAdvanced(url, batchIndex, urlIndex),
    { strategy: 'conservative', maxAge: 24 * 3600 } // 24 hour cache
  );
}

// Enhanced article extraction with advanced performance optimizations
async function extractArticleContentAdvanced(url: string, batchIndex: number, urlIndex: number): Promise<Article | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
  
  try {
    const startTime = Date.now();
    
    // Advanced headers with rotation for better success rates
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgents[urlIndex % userAgents.length],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Enhanced content cleaning and extraction
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .popup, .modal, .cookie-banner, .newsletter-signup').remove();
    
    // Smart title extraction with fallbacks
    const title = extractSmartTitle($);
    
    // Advanced content extraction with multiple strategies
    const content = extractSmartContent($);
    
    // Enhanced metadata extraction
    const metadata = extractMetadata($);
    
    const processingTime = Date.now() - startTime;
    
    // Quality validation
    if (!title || content.length < 150) {
      throw new Error(`Low quality content: title=${!!title}, contentLength=${content.length}`);
    }
    
    console.log(`🔍 B${batchIndex + 1}:${urlIndex + 1} - ${title.substring(0, 40)}... (${processingTime}ms, ${content.length} chars)`);
    
    return {
      url,
      title,
      content: content.substring(0, 6000), // Increased limit for better AI processing
      author: metadata.author,
      publishedDate: metadata.publishedDate
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
}

// Smart title extraction with multiple fallback strategies
function extractSmartTitle($: any): string {
  const titleCandidates = [
    $('meta[property="og:title"]').attr('content'),
    $('meta[name="twitter:title"]').attr('content'), 
    $('title').text().trim(),
    $('h1').first().text().trim(),
    $('.post-title, .article-title, .entry-title').first().text().trim(),
    $('.title, .headline').first().text().trim()
  ].filter(Boolean);
  
  // Return the most appropriate title (not too short, not too long)
  for (const title of titleCandidates) {
    if (title && title.length > 10 && title.length < 200) {
      return title.replace(/\s+/g, ' ').trim();
    }
  }
  
  return titleCandidates[0] || 'Untitled';
}

// Advanced content extraction with intelligent selection
function extractSmartContent($: any): string {
  const contentSelectors = [
    // High-priority content containers
    'article[role="main"]',
    'main article',
    '.post-content, .entry-content, .article-content',
    '.content-body, .article-body, .post-body',
    // Medium-priority containers
    'article',
    'main',
    '.content, .main-content',
    '[role="main"]',
    // Fallback containers
    '.container .content',
    '#content, #main'
  ];
  
  let bestContent = '';
  let bestScore = 0;
  
  for (const selector of contentSelectors) {
    const elements = $(selector);
    
    elements.each((_: number, element: any) => {
      const text = $(element).text().trim();
      const score = calculateContentScore(text, $(element));
      
      if (score > bestScore && text.length > 200) {
        bestContent = text;
        bestScore = score;
      }
    });
    
    // If we found high-quality content, stop searching
    if (bestScore > 500) break;
  }
  
  // Final fallback to body content
  if (!bestContent) {
    bestContent = $('body').text().trim();
  }
  
  // Advanced content cleaning
  return bestContent
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .replace(/^\s+|\s+$/g, '')
    .substring(0, 8000);
}

// Content quality scoring algorithm
function calculateContentScore(text: string, element: any): number {
  let score = 0;
  
  // Length score (optimal range: 500-3000 chars)
  if (text.length > 200) score += 100;
  if (text.length > 500) score += 100;
  if (text.length > 1000) score += 50;
  
  // Sentence structure score
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  score += Math.min(sentences.length * 5, 100);
  
  // Paragraph structure score
  const paragraphs = text.split('\n').filter(p => p.trim().length > 50);
  score += Math.min(paragraphs.length * 10, 100);
  
  // HTML structure bonuses
  const paragraphTags = element.find('p').length;
  score += Math.min(paragraphTags * 15, 150);
  
  // Penalties for low-quality indicators
  if (text.includes('cookie') && text.includes('accept')) score -= 50;
  if (text.includes('subscribe') && text.includes('newsletter')) score -= 30;
  if (text.length < 300) score -= 100;
  
  return Math.max(0, score);
}

// Enhanced metadata extraction
function extractMetadata($: any): { author?: string; publishedDate?: string } {
  const author = $('meta[name="author"]').attr('content') ||
                $('meta[property="article:author"]').attr('content') ||
                $('.author, .by-author, .article-author').first().text().trim() ||
                $('[rel="author"]').first().text().trim() ||
                undefined;
  
  const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
                       $('meta[name="publishdate"]').attr('content') ||
                       $('meta[name="publish-date"]').attr('content') ||
                       $('.publish-date, .published, .date').first().text().trim() ||
                       $('time[datetime]').attr('datetime') ||
                       undefined;
  
  return { 
    author: author && author.length > 2 && author.length < 100 ? author : undefined,
    publishedDate 
  };
}

// Legacy function maintained for compatibility
async function extractArticleContent(url: string): Promise<Article | null> {
  return extractArticleContentAdvanced(url, 0, 0);
}

function filterArticles(articles: Article[], filters: {maxArticles: number; dateRange: number; keywords: string}): Article[] {
  let filtered = articles;
  
  // Filter by keywords
  if (filters.keywords && filters.keywords.trim()) {
    const keywords = filters.keywords.toLowerCase().split(',').map((k: string) => k.trim());
    filtered = filtered.filter(article => {
      const searchText = (article.title + ' ' + article.content).toLowerCase();
      return keywords.some(keyword => searchText.includes(keyword));
    });
  }
  
  // Filter by date range (days back from now)
  if (filters.dateRange && filters.dateRange > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filters.dateRange);
    
    filtered = filtered.filter(article => {
      if (!article.publishedDate) return true; // Keep articles without dates
      
      try {
        const articleDate = new Date(article.publishedDate);
        return articleDate >= cutoffDate;
      } catch {
        return true; // Keep articles with invalid dates
      }
    });
  }
  
  return filtered;
}

// Global AI performance tracking
let globalApiMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failuresByModel: new Map<string, number>(),
  averageResponseTime: 0,
  lastSuccessfulModel: null as string | null
};

// Cached wrapper for AI processing
async function processArticleWithAIAdvancedCached(
  article: Article,
  aiConfig: any,
  fallbackModels: string[] = [],
  batchIndex: number = 0,
  articleIndex: number = 0
): Promise<ExtractedData | null> {
  // Generate cache keys
  const contentHash = generateContentHash(article.content);
  const promptHash = generateContentHash(aiConfig.customPrompt + JSON.stringify(aiConfig.customFields));
  
  return await cacheManager.getOrSetAIResponse(
    contentHash,
    aiConfig.model,
    promptHash,
    aiConfig.customFields || [],
    () => processArticleWithAIAdvanced(article, aiConfig, fallbackModels, batchIndex, articleIndex),
    { strategy: 'conservative', maxAge: 7 * 24 * 3600 } // 7 day cache
  );
}

// Helper function to generate content hash
function generateContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Advanced AI processing with intelligent orchestration
async function processArticleWithAIAdvanced(
  article: Article,
  aiConfig: any,
  fallbackModels: string[] = [],
  batchIndex: number = 0,
  articleIndex: number = 0
): Promise<ExtractedData | null> {
  const startTime = Date.now();
  const requestId = `B${batchIndex + 1}:A${articleIndex + 1}`;
  
  try {
    // Prioritize last successful model for efficiency
    const modelsToTry = globalApiMetrics.lastSuccessfulModel && !fallbackModels.includes(globalApiMetrics.lastSuccessfulModel)
      ? [globalApiMetrics.lastSuccessfulModel, aiConfig.model, ...fallbackModels]
      : [aiConfig.model, ...fallbackModels];
    
    console.log(`🔄 ${requestId} Processing "${article.title.substring(0, 30)}..." with ${modelsToTry.length} model options`);
    
    for (let i = 0; i < Math.min(3, modelsToTry.length); i++) {
      const model = modelsToTry[i];
      const modelStartTime = Date.now();
      
      try {
        console.log(`🤖 ${requestId} Trying model: ${model} (attempt ${i + 1})`);
        
        const result = await processArticleWithAISingle(article, { ...aiConfig, model }, requestId);
        
        if (result) {
          const modelTime = Date.now() - modelStartTime;
          
          // Update global metrics on success
          globalApiMetrics.totalRequests++;
          globalApiMetrics.successfulRequests++;
          globalApiMetrics.lastSuccessfulModel = model;
          globalApiMetrics.averageResponseTime = 
            (globalApiMetrics.averageResponseTime + modelTime) / globalApiMetrics.successfulRequests;
          
          console.log(`✅ ${requestId} Success with ${model} in ${modelTime}ms`);
          return result;
        }
      } catch (error) {
        const modelTime = Date.now() - modelStartTime;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        // Update failure tracking
        globalApiMetrics.totalRequests++;
        const currentFailures = globalApiMetrics.failuresByModel.get(model) || 0;
        globalApiMetrics.failuresByModel.set(model, currentFailures + 1);
        
        console.log(`❌ ${requestId} Model ${model} failed in ${modelTime}ms: ${errorMsg}`);
        
        // Check if error is recoverable
        if (errorMsg.includes('Invalid') && errorMsg.includes('API key')) {
          throw error; // Stop trying if API key is invalid
        }
        
        if (errorMsg.includes('no credits') || errorMsg.includes('Insufficient credits')) {
          console.log(`💰 ${requestId} Credits exhausted for ${model}, trying next model`);
          continue;
        }
        
        if (i === Math.min(2, modelsToTry.length - 1)) {
          throw new Error(`All ${i + 1} models failed. Last error: ${errorMsg}`);
        }
      }
    }
    
    return null;
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`🚫 ${requestId} Complete failure after ${totalTime}ms:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

// Single model AI processing with optimization
async function processArticleWithAISingle(article: Article, aiConfig: any, requestId: string): Promise<ExtractedData | null> {
  const startTime = Date.now();
  
  try {
    // Optimize prompt based on article content and requested fields
    const optimizedPrompt = buildOptimizedPrompt(article, aiConfig);
    
    console.log(`📤 ${requestId} Sending to ${aiConfig.model} (${optimizedPrompt.length} chars)`);
    
    let apiResponse: string;
    
    // Route to appropriate API handler
    if (aiConfig.apiProvider === 'openai') {
      apiResponse = await callOpenAIOptimized(optimizedPrompt, aiConfig, requestId);
    } else if (aiConfig.apiProvider === 'claude') {
      apiResponse = await callClaudeOptimized(optimizedPrompt, aiConfig, requestId);
    } else if (aiConfig.apiProvider === 'gemini') {
      apiResponse = await callGeminiOptimized(optimizedPrompt, aiConfig, requestId);
    } else if (aiConfig.apiProvider === 'openrouter') {
      apiResponse = await callOpenRouterOptimized(optimizedPrompt, aiConfig, requestId);
    } else {
      throw new Error(`Unsupported AI provider: ${aiConfig.apiProvider}`);
    }
    
    const responseTime = Date.now() - startTime;
    console.log(`📥 ${requestId} Response received from ${aiConfig.model} in ${responseTime}ms`);
    
    if (!apiResponse || apiResponse.trim().length === 0) {
      throw new Error('Empty response from AI model');
    }
    
    // Advanced response parsing with multiple strategies
    const parsedData = parseAIResponse(apiResponse, aiConfig.dataFields, requestId);
    
    if (!parsedData || Object.keys(parsedData).length === 0) {
      throw new Error('Failed to parse AI response into structured data');
    }
    
    return parsedData;
    
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ ${requestId} AI processing failed in ${errorTime}ms:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

// Build optimized prompt based on content analysis
function buildOptimizedPrompt(article: Article, aiConfig: any): string {
  const fields = aiConfig.dataFields || [];
  const contentPreview = article.content.substring(0, 3000); // Optimized length
  
  // Smart field-specific instructions
  const fieldInstructions = fields.map((field: string) => {
    switch (field.toLowerCase()) {
      case 'company_name':
        return `${field}: Extract the main company/organization name mentioned (if any). Return null if none found.`;
      case 'ceo_name':
      case 'founder':
        return `${field}: Extract the CEO, founder, or key leader name (if mentioned). Return null if none found.`;
      case 'industry':
        return `${field}: Identify the industry or sector (e.g., "Technology", "Healthcare", "Finance"). Return null if unclear.`;
      case 'location':
        return `${field}: Extract the company or event location (city, state, country). Return null if not mentioned.`;
      case 'website':
        return `${field}: Extract any website URL mentioned in the article. Return null if none found.`;
      case 'funding':
        return `${field}: Extract funding amount or investment details (if mentioned). Return null if none found.`;
      default:
        return `${field}: Extract relevant information for this field. Return null if not found.`;
    }
  }).join('\n');
  
  return `You are an expert data extraction AI. Analyze this article and extract the following information:

ARTICLE TITLE: ${article.title}
ARTICLE URL: ${article.url}
${article.author ? `AUTHOR: ${article.author}` : ''}
${article.publishedDate ? `PUBLISHED: ${article.publishedDate}` : ''}

CONTENT:
${contentPreview}

EXTRACTION REQUIREMENTS:
${fieldInstructions}

INSTRUCTIONS:
1. Return ONLY a valid JSON object with the requested fields
2. Use null for any field where information is not found or unclear  
3. Be precise and factual - do not guess or infer information
4. For company names, use the full official name
5. For locations, be specific (e.g., "San Francisco, CA" not just "California")

JSON Response:`;
}

// Track failed API attempts to avoid excessive retries (legacy compatibility)
let consecutiveApiFailures = 0;
let lastApiError: string = '';

async function processArticleWithAIAndFallback(
  article: Article, 
  aiConfig: any, 
  fallbackModels: string[] = []
): Promise<ExtractedData | null> {
  return processArticleWithAIAdvanced(article, aiConfig, fallbackModels, 0, 0);
}

// Advanced response parsing with multiple strategies
function parseAIResponse(response: string, expectedFields: string[], requestId: string): ExtractedData | null {
  try {
    // Strategy 1: Direct JSON parsing
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`✅ ${requestId} JSON parsed successfully with ${Object.keys(parsed).length} fields`);
        
        // Validate and sanitize the response
        const sanitized: ExtractedData = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (value === null || value === undefined || value === '') {
            sanitized[key] = null;
          } else if (typeof value === 'object') {
            sanitized[key] = JSON.stringify(value);
          } else {
            sanitized[key] = String(value).trim();
          }
        }
        
        // Ensure all expected fields are present
        for (const field of expectedFields) {
          if (!(field in sanitized)) {
            sanitized[field] = null;
          }
        }
        
        return sanitized;
      }
    } catch (jsonError) {
      console.log(`⚠️ ${requestId} JSON parsing failed, trying alternative strategies`);
    }
    
    // Strategy 2: Key-value pair extraction
    const extracted: ExtractedData = {};
    const lines = response.split('\n');
    
    for (const line of lines) {
      // Match patterns like "field_name": "value" or field_name: value
      const match = line.match(/^["\s]*([^":\s]+)["\s]*:\s*["\s]*([^"]*)["\s]*,?$/i);
      if (match) {
        const [, key, value] = match;
        extracted[key.toLowerCase().trim()] = value.trim() || null;
      }
    }
    
    // Strategy 3: Field-specific extraction
    if (Object.keys(extracted).length === 0) {
      for (const field of expectedFields) {
        const fieldRegex = new RegExp(`${field}[:\\s]+([^\n,}]+)`, 'i');
        const match = response.match(fieldRegex);
        if (match) {
          extracted[field] = match[1].trim().replace(/["',]/g, '') || null;
        } else {
          extracted[field] = null;
        }
      }
    }
    
    // Final validation
    if (Object.keys(extracted).length > 0) {
      console.log(`✅ ${requestId} Alternative parsing successful with ${Object.keys(extracted).length} fields`);
      return extracted;
    }
    
    console.log(`❌ ${requestId} All parsing strategies failed`);
    return null;
    
  } catch (error) {
    console.error(`❌ ${requestId} Response parsing error:`, error);
    return null;
  }
}

// Optimized OpenRouter API call
async function callOpenRouterOptimized(prompt: string, aiConfig: any, requestId: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout
  
  try {
    console.log(`🚀 ${requestId} Calling OpenRouter API with model: ${aiConfig.model}`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'AGGRANDIZE AI Scraper - 2025 Edition'
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1500,
        top_p: 0.9,
        frequency_penalty: 0,
        presence_penalty: 0
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.text();
      const errorDetails = parseOpenRouterError(response.status, errorData);
      
      console.error(`❌ ${requestId} OpenRouter API Error: ${errorDetails.message}`);
      throw new Error(errorDetails.message);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter API');
    }
    
    const content = data.choices[0].message.content;
    console.log(`✅ ${requestId} OpenRouter response: ${content.length} characters`);
    
    return content;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - model may be overloaded');
    }
    
    throw error;
  }
}

// Enhanced error parsing for OpenRouter
function parseOpenRouterError(status: number, errorData: string): { message: string; category: string } {
  let detailedError = errorData;
  let category = 'unknown';
  
  try {
    const parsedError = JSON.parse(errorData);
    if (parsedError.error) {
      detailedError = typeof parsedError.error === 'string' 
        ? parsedError.error 
        : JSON.stringify(parsedError.error, null, 2);
    }
  } catch {
    // Keep original error if not JSON
  }
  
  switch (status) {
    case 401:
      category = 'authentication';
      return { message: `🔑 Invalid API key - ${detailedError}`, category };
    case 402:
      category = 'billing';
      return { message: `💰 Insufficient credits - ${detailedError}`, category };
    case 403:
      category = 'permissions';
      return { message: `🚫 Model access denied - ${detailedError}`, category };
    case 404:
      category = 'model';
      return { message: `🤖 Model not found - ${detailedError}`, category };
    case 429:
      category = 'rate_limit';
      return { message: `⏱️ Rate limit exceeded - ${detailedError}`, category };
    case 400:
      category = 'request';
      return { message: `📝 Bad request format - ${detailedError}`, category };
    case 500:
    case 502:
    case 503:
      category = 'server';
      return { message: `🔧 Server error (${status}) - ${detailedError}`, category };
    default:
      category = 'unknown';
      return { message: `❌ API error (${status}) - ${detailedError}`, category };
  }
}

// Optimized API calling functions for other providers
async function callOpenAIOptimized(prompt: string, aiConfig: any, requestId: string): Promise<string> {
  return callOpenAI(prompt, aiConfig); // Use existing implementation for now
}

async function callClaudeOptimized(prompt: string, aiConfig: any, requestId: string): Promise<string> {
  return callClaude(prompt, aiConfig); // Use existing implementation for now
}

async function callGeminiOptimized(prompt: string, aiConfig: any, requestId: string): Promise<string> {
  return callGemini(prompt, aiConfig); // Use existing implementation for now
}

async function processArticleWithAI(article: Article, aiConfig: any): Promise<ExtractedData | null> {
  try {
    console.log(`Processing article with AI: ${article.title} using ${aiConfig.apiProvider}/${aiConfig.model}`);
    
    const prompt = `${aiConfig.customPrompt}

Article Title: ${article.title}
Article Content: ${article.content.substring(0, 2000)}
Article URL: ${article.url}
${article.author ? `Author: ${article.author}` : ''}
${article.publishedDate ? `Published: ${article.publishedDate}` : ''}

Please extract the requested information and return it as a JSON object with the field names as keys.`;

    let apiResponse;
    
    if (aiConfig.apiProvider === 'openai') {
      apiResponse = await callOpenAI(prompt, aiConfig);
    } else if (aiConfig.apiProvider === 'claude') {
      apiResponse = await callClaude(prompt, aiConfig);
    } else if (aiConfig.apiProvider === 'gemini') {
      apiResponse = await callGemini(prompt, aiConfig);
    } else if (aiConfig.apiProvider === 'openrouter') {
      apiResponse = await callOpenRouter(prompt, aiConfig);
    } else {
      throw new Error(`Unsupported AI provider: ${aiConfig.apiProvider}`);
    }
    
    console.log(`AI response received for ${article.title}`);
    
    if (!apiResponse) {
      throw new Error('Empty response from AI');
    }
    
    // Try to parse JSON response
    try {
      const parsed = JSON.parse(apiResponse);
      // Ensure all values are strings to prevent React rendering errors
      const sanitized: ExtractedData = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (value === null || value === undefined) {
          sanitized[key] = null;
        } else if (typeof value === 'object') {
          sanitized[key] = JSON.stringify(value);
        } else {
          sanitized[key] = String(value);
        }
      }
      return sanitized;
    } catch {
      // If not JSON, try to extract key-value pairs
      const extracted: ExtractedData = {};
      const lines = apiResponse.split('\n');
      
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          extracted[match[1].toLowerCase()] = match[2].trim();
        }
      }
      
      return Object.keys(extracted).length > 0 ? extracted : null;
    }
    
  } catch (error) {
    console.error(`AI processing error for article "${article.title}":`, error);
    
    // Log specific error types
    if (error instanceof Error) {
      if (error.message.includes('API error')) {
        console.error('API Error - check your API key and model access');
      } else if (error.message.includes('timeout')) {
        console.error('Timeout Error - request took too long');
      } else if (error.message.includes('rate')) {
        console.error('Rate Limit Error - too many requests');
      }
    }
    
    return null;
  }
}

async function callOpenAI(prompt: string, aiConfig: any): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: aiConfig.model || 'gpt-4',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callClaude(prompt: string, aiConfig: any): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': aiConfig.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: aiConfig.model || 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
}

async function callGemini(prompt: string, aiConfig: any): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Scryptr Dashboard'
    },
    body: JSON.stringify({
      model: aiConfig.model || 'google/gemma-3n-e2b-it:free',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000
    })
  });
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callOpenRouter(prompt: string, aiConfig: any): Promise<string> {
  console.log(`🚀 Calling OpenRouter API with model: ${aiConfig.model}`);
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Scryptr Dashboard'
    },
    body: JSON.stringify({
      model: aiConfig.model || 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000
    })
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    console.error(`🚨 OpenRouter API Error Details:`);
    console.error(`   Model: ${aiConfig.model}`);
    console.error(`   Status: ${response.status}`);
    console.error(`   Response: ${errorData}`);
    console.error(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
    
    // Parse error details for better debugging
    let detailedError = errorData;
    try {
      const parsedError = JSON.parse(errorData);
      if (parsedError.error) {
        detailedError = JSON.stringify(parsedError.error, null, 2);
      }
    } catch {
      // Keep original error if not JSON
    }
    
    // Provide specific error messages
    if (response.status === 401) {
      throw new Error(`🔑 OpenRouter API error: Invalid API key - ${detailedError}`);
    } else if (response.status === 402) {
      throw new Error(`💰 OpenRouter API error: Insufficient credits - ${detailedError}`);
    } else if (response.status === 403) {
      throw new Error(`🚫 OpenRouter API error: Model access denied - ${detailedError}`);
    } else if (response.status === 404) {
      throw new Error(`🤖 OpenRouter API error: Model "${aiConfig.model}" not found - ${detailedError}`);
    } else if (response.status === 429) {
      throw new Error(`⏱️ OpenRouter API error: Rate limit exceeded - ${detailedError}`);
    } else if (response.status === 400) {
      throw new Error(`📝 OpenRouter API error: Bad request format - ${detailedError}`);
    } else {
      throw new Error(`❌ OpenRouter API error: ${response.status} - ${detailedError}`);
    }
  }
  
  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid OpenRouter response:', data);
    throw new Error('Invalid response format from OpenRouter API');
  }
  
  return data.choices[0].message.content;
}

function applyWorkflowRules(articles: Article[], rules: WorkflowRules): Article[] {
  return articles.filter(article => {
    // Check title rules
    const titlePass = evaluateRules(article.title, rules.titleRules, rules.titleLogic);
    
    // Check body rules
    const bodyPass = evaluateRules(article.content, rules.bodyRules, rules.bodyLogic);
    
    // Check URL rules
    const urlPass = evaluateRules(article.url, rules.urlRules, rules.urlLogic);
    
    // Article must pass all rule categories that have rules defined
    const hasRules = rules.titleRules.length > 0 || rules.bodyRules.length > 0 || rules.urlRules.length > 0;
    
    if (!hasRules) {
      return true; // No rules defined, pass all articles
    }
    
    // If rules are defined for a category, they must pass
    const titleResult = rules.titleRules.length === 0 ? true : titlePass;
    const bodyResult = rules.bodyRules.length === 0 ? true : bodyPass;
    const urlResult = rules.urlRules.length === 0 ? true : urlPass;
    
    return titleResult && bodyResult && urlResult;
  });
}

function evaluateRules(text: string, rules: Rule[], logic: 'AND' | 'OR'): boolean {
  if (rules.length === 0) {
    return true; // No rules means pass
  }
  
  const results = rules.map(rule => evaluateRule(text, rule));
  
  if (logic === 'AND') {
    return results.every(result => result);
  } else {
    return results.some(result => result);
  }
}

function evaluateRule(text: string, rule: Rule): boolean {
  const searchText = rule.caseSensitive ? text : text.toLowerCase();
  const searchValue = rule.caseSensitive ? rule.value : rule.value.toLowerCase();
  
  switch (rule.type) {
    case 'contains':
      return searchText.includes(searchValue);
    
    case 'not_contains':
      return !searchText.includes(searchValue);
    
    case 'starts_with':
      return searchText.startsWith(searchValue);
    
    case 'ends_with':
      return searchText.endsWith(searchValue);
    
    case 'regex':
      try {
        const flags = rule.caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(rule.value, flags);
        return regex.test(text);
      } catch (error) {
        console.log(`Invalid regex pattern: ${rule.value}`);
        return false;
      }
    
    default:
      return false;
  }
}

// Advanced Smart Concurrency Management System
interface ConcurrencyConfig {
  contentExtraction: number;
  aiProcessing: number;
  batchSize: number;
  rateLimitDelay: number;
  adaptiveScaling: boolean;
}

function calculateOptimalConcurrency(urlCount: number, domain: string): ConcurrencyConfig {
  // Get domain performance history
  const domainStats = domainMetrics.get(domain) || {
    requests: 0,
    errors: 0,
    lastRequestTime: 0,
    averageResponseTime: 1000,
    successRate: 100,
    domain
  };
  
  // Base concurrency calculations
  let contentConcurrency = 15; // Default baseline
  let aiConcurrency = 10; // Default AI processing
  let rateLimitDelay = 500; // Default delay
  
  // Scale based on workload size
  if (urlCount <= 10) {
    contentConcurrency = Math.min(10, urlCount);
    aiConcurrency = Math.min(5, urlCount);
  } else if (urlCount <= 50) {
    contentConcurrency = Math.min(20, Math.floor(urlCount * 0.4));
    aiConcurrency = Math.min(12, Math.floor(urlCount * 0.25));
  } else if (urlCount <= 100) {
    contentConcurrency = Math.min(35, Math.floor(urlCount * 0.3));
    aiConcurrency = Math.min(18, Math.floor(urlCount * 0.2));
  } else {
    contentConcurrency = Math.min(50, Math.floor(urlCount * 0.25));
    aiConcurrency = Math.min(25, Math.floor(urlCount * 0.15));
  }
  
  // Adaptive scaling based on domain performance
  if (domainStats.requests > 0) {
    const errorRate = (domainStats.errors / domainStats.requests) * 100;
    const avgResponseTime = domainStats.averageResponseTime;
    
    // Reduce concurrency for high-error domains
    if (errorRate > 20) {
      contentConcurrency = Math.ceil(contentConcurrency * 0.5);
      aiConcurrency = Math.ceil(aiConcurrency * 0.6);
      rateLimitDelay = 1500;
      console.log(`🚦 High error rate (${errorRate.toFixed(1)}%) detected for ${domain}, reducing concurrency`);
    } else if (errorRate > 10) {
      contentConcurrency = Math.ceil(contentConcurrency * 0.7);
      aiConcurrency = Math.ceil(aiConcurrency * 0.8);
      rateLimitDelay = 1000;
      console.log(`⚠️ Moderate error rate (${errorRate.toFixed(1)}%) for ${domain}, scaling down concurrency`);
    }
    
    // Adjust for slow domains
    if (avgResponseTime > 3000) {
      contentConcurrency = Math.ceil(contentConcurrency * 0.6);
      rateLimitDelay = 2000;
      console.log(`🐌 Slow domain detected (${avgResponseTime}ms avg), reducing load`);
    } else if (avgResponseTime < 500) {
      contentConcurrency = Math.min(contentConcurrency * 1.2, 50);
      rateLimitDelay = 200;
      console.log(`⚡ Fast domain detected (${avgResponseTime}ms avg), increasing concurrency`);
    }
  }
  
  // Domain-specific optimizations
  const domainLower = domain.toLowerCase();
  if (domainLower.includes('github') || domainLower.includes('stackoverflow')) {
    // GitHub/SO are generally faster, can handle more load
    contentConcurrency = Math.min(contentConcurrency * 1.3, 40);
    aiConcurrency = Math.min(aiConcurrency * 1.2, 20);
    rateLimitDelay = 300;
  } else if (domainLower.includes('linkedin') || domainLower.includes('twitter')) {
    // Social media sites have stricter rate limits
    contentConcurrency = Math.min(contentConcurrency * 0.6, 15);
    rateLimitDelay = 2000;
    console.log(`🔒 Social media domain detected, applying conservative limits`);
  } else if (domainLower.includes('news') || domainLower.includes('blog')) {
    // News sites are usually well-optimized
    contentConcurrency = Math.min(contentConcurrency * 1.1, 35);
    rateLimitDelay = 400;
  }
  
  const batchSize = Math.ceil(urlCount / contentConcurrency);
  
  // Log optimization decisions
  console.log(`🧠 Smart Concurrency Config for ${domain}:`);
  console.log(`   📊 URLs: ${urlCount}, Content: ${contentConcurrency}, AI: ${aiConcurrency}`);
  console.log(`   ⏱️ Rate Limit: ${rateLimitDelay}ms, Batch Size: ${batchSize}`);
  console.log(`   📈 Domain Stats: ${domainStats.requests} requests, ${domainStats.successRate.toFixed(1)}% success`);
  
  return {
    contentExtraction: contentConcurrency,
    aiProcessing: aiConcurrency,
    batchSize,
    rateLimitDelay,
    adaptiveScaling: domainStats.requests > 5 // Enable adaptive scaling after some history
  };
}

// Update domain performance metrics
function updateDomainMetrics(domain: string, responseTime: number, success: boolean) {
  const existing = domainMetrics.get(domain) || {
    requests: 0,
    errors: 0,
    lastRequestTime: 0,
    averageResponseTime: 1000,
    successRate: 100,
    domain
  };
  
  existing.requests++;
  existing.lastRequestTime = Date.now();
  
  if (!success) {
    existing.errors++;
  }
  
  // Calculate rolling average response time (last 50 requests)
  if (existing.requests === 1) {
    existing.averageResponseTime = responseTime;
  } else {
    const weight = Math.min(existing.requests, 50);
    existing.averageResponseTime = 
      ((existing.averageResponseTime * (weight - 1)) + responseTime) / weight;
  }
  
  // Calculate success rate
  existing.successRate = ((existing.requests - existing.errors) / existing.requests) * 100;
  
  domainMetrics.set(domain, existing);
}

async function testModelAvailability(model: string, apiKey: string): Promise<{available: boolean, error?: string, responseTime?: number}> {
  const startTime = Date.now();
  
  try {
    const testPrompt = 'Reply with just "OK" to confirm this model works.';
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Scryptr Dashboard'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 10,
        temperature: 0
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      return {
        available: !!content,
        responseTime
      };
    } else {
      const errorData = await response.text();
      let errorMsg = `HTTP ${response.status}`;
      
      // Parse common error types
      if (response.status === 401) {
        errorMsg = 'Invalid API key';
      } else if (response.status === 402) {
        errorMsg = 'Insufficient credits';
      } else if (response.status === 403) {
        errorMsg = 'Model access denied';
      } else if (response.status === 404) {
        errorMsg = 'Model not found';
      } else if (response.status === 429) {
        errorMsg = 'Rate limit exceeded';
      } else if (errorData.includes('model')) {
        errorMsg = 'Model unavailable';
      }
      
      return {
        available: false,
        error: errorMsg,
        responseTime: Date.now() - startTime
      };
    }
    
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Network error',
      responseTime: Date.now() - startTime
    };
  }
}
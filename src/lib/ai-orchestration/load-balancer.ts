/**
 * AI Load Balancer - Intelligent Request Distribution System
 * Distributes AI requests across multiple models for optimal performance
 */

import { aiModelManager, ModelPerformanceMetrics } from './model-manager';

interface LoadBalancingRequest {
  id: string;
  content: string;
  prompt: string;
  priority: 'low' | 'normal' | 'high';
  maxResponseTime: number;
  maxCost: number;
  retryCount: number;
  createdAt: number;
}

interface LoadBalancingResponse {
  success: boolean;
  data?: any;
  model: string;
  responseTime: number;
  cost: number;
  fromCache: boolean;
  retryCount: number;
  error?: string;
}

interface DistributionStrategy {
  name: string;
  description: string;
  execute: (requests: LoadBalancingRequest[]) => Promise<LoadBalancingResponse[]>;
}

class AILoadBalancer {
  private requestQueue = new Map<string, LoadBalancingRequest[]>();
  private activeRequests = new Map<string, number>();
  private distributionStrategies = new Map<string, DistributionStrategy>();
  
  constructor() {
    this.initializeDistributionStrategies();
    this.startQueueProcessor();
  }

  // Initialize different distribution strategies
  private initializeDistributionStrategies(): void {
    // Strategy 1: Multi-Model Parallel Processing
    this.distributionStrategies.set('parallel_multi_model', {
      name: 'Parallel Multi-Model',
      description: 'Send requests to multiple models simultaneously, return fastest response',
      execute: async (requests: LoadBalancingRequest[]) => {
        return await this.executeParallelMultiModel(requests);
      }
    });

    // Strategy 2: Intelligent Queue Distribution
    this.distributionStrategies.set('intelligent_queue', {
      name: 'Intelligent Queue',
      description: 'Distribute based on model availability and queue length',
      execute: async (requests: LoadBalancingRequest[]) => {
        return await this.executeIntelligentQueue(requests);
      }
    });

    // Strategy 3: Cost-Optimized Distribution
    this.distributionStrategies.set('cost_optimized', {
      name: 'Cost Optimized',
      description: 'Prioritize free models, fallback to paid when necessary',
      execute: async (requests: LoadBalancingRequest[]) => {
        return await this.executeCostOptimized(requests);
      }
    });

    // Strategy 4: Performance-First Distribution
    this.distributionStrategies.set('performance_first', {
      name: 'Performance First',
      description: 'Route to fastest, most reliable models regardless of cost',
      execute: async (requests: LoadBalancingRequest[]) => {
        return await this.executePerformanceFirst(requests);
      }
    });
  }

  // Main entry point for processing batch requests
  async processBatch(
    requests: Array<{
      content: string;
      prompt: string;
      priority?: 'low' | 'normal' | 'high';
      maxResponseTime?: number;
      maxCost?: number;
    }>,
    strategy: string = 'intelligent_queue'
  ): Promise<LoadBalancingResponse[]> {
    
    // Convert to internal request format
    const loadBalancingRequests: LoadBalancingRequest[] = requests.map((req, index) => ({
      id: `req_${Date.now()}_${index}`,
      content: req.content,
      prompt: req.prompt,
      priority: req.priority || 'normal',
      maxResponseTime: req.maxResponseTime || 10000,
      maxCost: req.maxCost || Infinity,
      retryCount: 0,
      createdAt: Date.now()
    }));

    console.log(`🚀 Load balancer processing ${requests.length} requests with strategy: ${strategy}`);

    const distributionStrategy = this.distributionStrategies.get(strategy);
    if (!distributionStrategy) {
      throw new Error(`Unknown distribution strategy: ${strategy}`);
    }

    const startTime = Date.now();
    const results = await distributionStrategy.execute(loadBalancingRequests);
    const totalTime = Date.now() - startTime;

    // Log performance metrics
    const successCount = results.filter(r => r.success).length;
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    
    console.log(`📊 Batch complete: ${successCount}/${results.length} success (${(successCount/results.length*100).toFixed(1)}%)`);
    console.log(`⚡ Performance: ${totalTime}ms total, ${averageResponseTime.toFixed(0)}ms avg response`);

    return results;
  }

  // Strategy 1: Parallel Multi-Model Processing
  private async executeParallelMultiModel(requests: LoadBalancingRequest[]): Promise<LoadBalancingResponse[]> {
    console.log(`🔄 Executing parallel multi-model strategy for ${requests.length} requests`);

    const results: LoadBalancingResponse[] = [];

    // Process requests in parallel batches
    const batchSize = 5; // Process 5 requests simultaneously
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (request) => {
        return await this.processWithMultipleModels(request);
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            model: 'unknown',
            responseTime: 10000,
            cost: 0,
            fromCache: false,
            retryCount: batch[index].retryCount,
            error: 'Batch processing failed'
          });
        }
      });
    }

    return results;
  }

  // Strategy 2: Intelligent Queue Distribution
  private async executeIntelligentQueue(requests: LoadBalancingRequest[]): Promise<LoadBalancingResponse[]> {
    console.log(`🧠 Executing intelligent queue strategy for ${requests.length} requests`);

    // Sort requests by priority and age
    const sortedRequests = requests.sort((a, b) => {
      const priorityScore = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityScore[a.priority];
      const bPriority = priorityScore[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return a.createdAt - b.createdAt; // Older requests first
    });

    const results: LoadBalancingResponse[] = [];

    // Distribute across available models based on queue length and performance
    for (const request of sortedRequests) {
      try {
        const result = await this.processWithOptimalModel(request);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          model: 'unknown',
          responseTime: 10000,
          cost: 0,
          fromCache: false,
          retryCount: request.retryCount,
          error: error instanceof Error ? error.message : 'Processing failed'
        });
      }
    }

    return results;
  }

  // Strategy 3: Cost-Optimized Distribution
  private async executeCostOptimized(requests: LoadBalancingRequest[]): Promise<LoadBalancingResponse[]> {
    console.log(`💰 Executing cost-optimized strategy for ${requests.length} requests`);

    const results: LoadBalancingResponse[] = [];

    // Categorize content by complexity for optimal cost routing
    const categorizedRequests = requests.map(req => ({
      ...req,
      complexity: this.analyzeContentComplexity(req.content, req.prompt)
    }));

    for (const request of categorizedRequests) {
      try {
        // Route simple content to free models, complex to premium
        const maxCost = request.complexity === 'simple' ? 0 : request.maxCost;
        const result = await this.processWithCostConstraint(request, maxCost);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          model: 'unknown',
          responseTime: 10000,
          cost: 0,
          fromCache: false,
          retryCount: request.retryCount,
          error: error instanceof Error ? error.message : 'Cost-optimized processing failed'
        });
      }
    }

    return results;
  }

  // Strategy 4: Performance-First Distribution
  private async executePerformanceFirst(requests: LoadBalancingRequest[]): Promise<LoadBalancingResponse[]> {
    console.log(`🏃 Executing performance-first strategy for ${requests.length} requests`);

    const results: LoadBalancingResponse[] = [];

    // Get top performing models
    const analytics = aiModelManager.getPerformanceAnalytics();
    const topModels = analytics.modelPerformance
      .filter(m => m.reliability === 'excellent' || m.reliability === 'good')
      .slice(0, 3)
      .map(m => m.model);

    for (const request of requests) {
      try {
        const result = await this.processWithPreferredModels(request, topModels);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          model: 'unknown',
          responseTime: 10000,
          cost: 0,
          fromCache: false,
          retryCount: request.retryCount,
          error: error instanceof Error ? error.message : 'Performance-first processing failed'
        });
      }
    }

    return results;
  }

  // Process request with multiple models simultaneously
  private async processWithMultipleModels(request: LoadBalancingRequest): Promise<LoadBalancingResponse> {
    const startTime = Date.now();
    
    // Select top 3 models for parallel processing
    const analytics = aiModelManager.getPerformanceAnalytics();
    const topModels = analytics.modelPerformance
      .filter(m => m.isActive)
      .slice(0, 3)
      .map(m => m.model);

    if (topModels.length === 0) {
      throw new Error('No active models available');
    }

    console.log(`🔄 Racing ${topModels.length} models for request ${request.id}`);

    // Race multiple models - return first successful response
    const modelPromises = topModels.map(async (model, index) => {
      try {
        // Simulate API call processing time
        const processingTime = 1000 + Math.random() * 2000; // 1-3 seconds
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        // Simulate success/failure based on model metrics
        const metrics = analytics.modelPerformance.find(m => m.model === model);
        const successProbability = metrics ? metrics.successRate / 100 : 0.8;
        
        if (Math.random() > successProbability) {
          throw new Error(`Model ${model} request failed`);
        }

        const responseTime = Date.now() - startTime;
        
        // Update model performance
        aiModelManager.updateModelPerformance(model, true, responseTime, undefined, 100);
        
        return {
          success: true,
          data: { extracted: 'sample extracted data', model_used: model },
          model,
          responseTime,
          cost: metrics?.averageCostPerRequest || 0,
          fromCache: false,
          retryCount: request.retryCount
        };
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        aiModelManager.updateModelPerformance(model, false, responseTime, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    });

    try {
      // Return the first successful response
      const result = await Promise.any(modelPromises);
      console.log(`✅ Request ${request.id} completed by ${result.model} in ${result.responseTime}ms`);
      return result;
    } catch (error) {
      console.log(`❌ All models failed for request ${request.id}`);
      return {
        success: false,
        model: 'all_failed',
        responseTime: Date.now() - startTime,
        cost: 0,
        fromCache: false,
        retryCount: request.retryCount,
        error: 'All models failed'
      };
    }
  }

  // Process with optimal single model selection
  private async processWithOptimalModel(request: LoadBalancingRequest): Promise<LoadBalancingResponse> {
    const complexity = this.analyzeContentComplexity(request.content, request.prompt);
    const selection = await aiModelManager.selectOptimalModel(complexity, true, request.maxCost);
    
    return await this.processWithSpecificModel(request, selection.model);
  }

  // Process with cost constraint
  private async processWithCostConstraint(request: LoadBalancingRequest, maxCost: number): Promise<LoadBalancingResponse> {
    const complexity = this.analyzeContentComplexity(request.content, request.prompt);
    const selection = await aiModelManager.selectOptimalModel(complexity, false, maxCost);
    
    return await this.processWithSpecificModel(request, selection.model);
  }

  // Process with preferred models list
  private async processWithPreferredModels(request: LoadBalancingRequest, preferredModels: string[]): Promise<LoadBalancingResponse> {
    for (const model of preferredModels) {
      try {
        return await this.processWithSpecificModel(request, model);
      } catch (error) {
        console.log(`❌ Preferred model ${model} failed, trying next...`);
        continue;
      }
    }
    
    throw new Error('All preferred models failed');
  }

  // Process with specific model
  private async processWithSpecificModel(request: LoadBalancingRequest, model: string): Promise<LoadBalancingResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🎯 Processing request ${request.id} with ${model}`);
      
      // Simulate API processing
      const processingTime = 1500 + Math.random() * 3000; // 1.5-4.5 seconds
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Simulate API response based on model reliability
      const analytics = aiModelManager.getPerformanceAnalytics();
      const metrics = analytics.modelPerformance.find(m => m.model === model);
      const successProbability = metrics ? metrics.successRate / 100 : 0.8;
      
      // Simulate different types of failures
      const randomFailure = Math.random();
      if (randomFailure > successProbability) {
        const failureType = Math.random();
        if (failureType < 0.3) {
          throw new Error(`Invalid API key for model ${model}`);
        } else if (failureType < 0.5) {
          throw new Error(`Model ${model} access denied or not available`);
        } else if (failureType < 0.7) {
          throw new Error(`Rate limit exceeded for model ${model}`);
        } else {
          throw new Error(`Model ${model} processing failed - server error`);
        }
      }

      const responseTime = Date.now() - startTime;
      
      // Update model performance
      aiModelManager.updateModelPerformance(model, true, responseTime, undefined, 150);
      
      return {
        success: true,
        data: { 
          extracted: 'sample extracted data',
          model_used: model,
          processing_strategy: 'single_model_optimal'
        },
        model,
        responseTime,
        cost: metrics?.averageCostPerRequest || 0,
        fromCache: false,
        retryCount: request.retryCount
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      aiModelManager.updateModelPerformance(model, false, responseTime, error instanceof Error ? error.message : 'Processing failed');
      
      return {
        success: false,
        model,
        responseTime,
        cost: 0,
        fromCache: false,
        retryCount: request.retryCount,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      };
    }
  }

  // Analyze content complexity for routing decisions
  private analyzeContentComplexity(content: string, prompt: string): 'simple' | 'complex' {
    // Simple heuristics for content complexity
    const contentLength = content.length;
    const promptComplexity = prompt.split('extract').length > 1 ? 1 : 0;
    const hasStructuredData = /json|xml|table|list/i.test(prompt);
    const hasAdvancedFields = /sentiment|summary|analysis|classification/i.test(prompt);
    
    let complexityScore = 0;
    
    // Length-based complexity
    if (contentLength > 3000) complexityScore += 2;
    else if (contentLength > 1500) complexityScore += 1;
    
    // Prompt complexity
    complexityScore += promptComplexity;
    if (hasStructuredData) complexityScore += 1;
    if (hasAdvancedFields) complexityScore += 2;
    
    return complexityScore >= 3 ? 'complex' : 'simple';
  }

  // Start background queue processor
  private startQueueProcessor(): void {
    setInterval(() => {
      // Clean up old requests and update metrics
      this.cleanupQueues();
    }, 30000); // Every 30 seconds
  }

  // Clean up old requests and stale data
  private cleanupQueues(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    this.requestQueue.forEach((queue, key) => {
      const filtered = queue.filter(req => now - req.createdAt < maxAge);
      if (filtered.length !== queue.length) {
        this.requestQueue.set(key, filtered);
        console.log(`🧹 Cleaned up ${queue.length - filtered.length} stale requests from queue ${key}`);
      }
    });
  }

  // Get load balancer performance analytics
  getAnalytics(): {
    activeRequests: number;
    queuedRequests: number;
    strategyPerformance: any[];
    systemLoad: any;
  } {
    const totalActiveRequests = Array.from(this.activeRequests.values())
      .reduce((sum, count) => sum + count, 0);
    
    const totalQueuedRequests = Array.from(this.requestQueue.values())
      .reduce((sum, queue) => sum + queue.length, 0);

    const strategyPerformance = Array.from(this.distributionStrategies.entries())
      .map(([name, strategy]) => ({
        name,
        description: strategy.description,
        enabled: true
      }));

    return {
      activeRequests: totalActiveRequests,
      queuedRequests: totalQueuedRequests,
      strategyPerformance,
      systemLoad: {
        status: totalActiveRequests > 50 ? 'high' : totalActiveRequests > 20 ? 'medium' : 'low',
        utilizationPercent: Math.min((totalActiveRequests / 100) * 100, 100)
      }
    };
  }
}

// Export singleton instance
export const aiLoadBalancer = new AILoadBalancer();
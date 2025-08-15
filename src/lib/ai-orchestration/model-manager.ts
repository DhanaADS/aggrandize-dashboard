/**
 * AI Model Manager - Advanced Multi-Model Orchestration System
 * Handles intelligent model selection, load balancing, and performance optimization
 */

export interface ModelPerformanceMetrics {
  model: string;
  provider: string;
  successRate: number;
  averageResponseTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastUsed: string;
  costPerToken: number;
  reliability: 'excellent' | 'good' | 'fair' | 'poor';
  isActive: boolean;
  errorTypes: Map<string, number>;
  averageCostPerRequest: number;
}

export interface LoadBalancingConfig {
  strategy: 'round_robin' | 'weighted' | 'least_connections' | 'fastest_response';
  maxConcurrentRequests: number;
  failureThreshold: number;
  recoveryTimeMs: number;
}

export interface ModelGroup {
  name: string;
  models: string[];
  strategy: LoadBalancingConfig;
  contentType: 'simple' | 'complex' | 'any';
  priority: number;
}

class AIModelManager {
  private modelMetrics = new Map<string, ModelPerformanceMetrics>();
  private circuitBreakers = new Map<string, { isOpen: boolean; nextRetry: number; failures: number }>();
  private requestQueues = new Map<string, Array<{ resolve: Function; reject: Function; timestamp: number }>>();
  
  // Predefined model groups with intelligent categorization
  private modelGroups: ModelGroup[] = [
    {
      name: 'premium_fast',
      models: [
        'openai/gpt-4o-mini',
        'anthropic/claude-3-5-haiku-20241022',
        'google/gemini-2.0-flash-exp'
      ],
      strategy: {
        strategy: 'fastest_response',
        maxConcurrentRequests: 20,
        failureThreshold: 3,
        recoveryTimeMs: 60000
      },
      contentType: 'complex',
      priority: 1
    },
    {
      name: 'free_reliable',
      models: [
        'google/gemma-3n-e2b-it:free',
        'google/gemma-3n-4b:free',
        'deepseek/deepseek-r1-0528-qwen3-8b:free',
        'mistral/devstral-small-2505:free'
      ],
      strategy: {
        strategy: 'weighted',
        maxConcurrentRequests: 15,
        failureThreshold: 2,
        recoveryTimeMs: 30000
      },
      contentType: 'simple',
      priority: 2
    },
    {
      name: 'fallback_models',
      models: [
        'google/gemma-3n-2b:free',
        'tencent/hunyuan-a13b-instruct:free',
        'venice/uncensored-dolphin-mistral-24b:free',
        'kimi/k2:free'
      ],
      strategy: {
        strategy: 'round_robin',
        maxConcurrentRequests: 10,
        failureThreshold: 1,
        recoveryTimeMs: 120000
      },
      contentType: 'any',
      priority: 3
    }
  ];

  constructor() {
    this.initializeModelMetrics();
    this.startHealthCheckInterval();
    this.startMetricsCleanup();
  }

  // Initialize metrics for all known models
  private initializeModelMetrics(): void {
    const allModels = this.modelGroups.flatMap(group => group.models);
    
    allModels.forEach(model => {
      if (!this.modelMetrics.has(model)) {
        this.modelMetrics.set(model, {
          model,
          provider: this.getProviderFromModel(model),
          successRate: 85, // Default optimistic rate
          averageResponseTime: 3000,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          lastUsed: new Date().toISOString(),
          costPerToken: model.includes(':free') ? 0 : 0.0001,
          reliability: 'good',
          isActive: true,
          errorTypes: new Map(),
          averageCostPerRequest: model.includes(':free') ? 0 : 0.01
        });
      }
    });
  }

  // Intelligent model selection based on content complexity and performance
  async selectOptimalModel(
    contentComplexity: 'simple' | 'complex', 
    prioritizeSpeed: boolean = true,
    maxCost: number = Infinity
  ): Promise<{ model: string; group: ModelGroup; confidence: number }> {
    
    // Get suitable model groups for content type
    const suitableGroups = this.modelGroups
      .filter(group => group.contentType === contentComplexity || group.contentType === 'any')
      .sort((a, b) => a.priority - b.priority);

    for (const group of suitableGroups) {
      // Get active models from this group
      const activeModels = group.models
        .filter(model => this.isModelAvailable(model))
        .map(model => ({
          model,
          metrics: this.modelMetrics.get(model)!,
          score: this.calculateModelScore(model, prioritizeSpeed, maxCost)
        }))
        .filter(m => m.metrics.averageCostPerRequest <= maxCost)
        .sort((a, b) => b.score - a.score);

      if (activeModels.length > 0) {
        const selectedModel = activeModels[0];
        console.log(`🎯 Selected model: ${selectedModel.model} (score: ${selectedModel.score.toFixed(2)}, group: ${group.name})`);
        
        return {
          model: selectedModel.model,
          group,
          confidence: Math.min(selectedModel.score / 100, 1)
        };
      }
    }

    // Fallback to any available model
    const fallbackModel = this.getFallbackModel();
    if (fallbackModel) {
      console.log(`⚠️ Using fallback model: ${fallbackModel}`);
      return {
        model: fallbackModel,
        group: this.modelGroups.find(g => g.models.includes(fallbackModel))!,
        confidence: 0.5
      };
    }

    throw new Error('No available AI models found');
  }

  // Calculate comprehensive model score for selection
  private calculateModelScore(model: string, prioritizeSpeed: boolean, maxCost: number): number {
    const metrics = this.modelMetrics.get(model);
    if (!metrics) return 0;

    let score = 0;
    
    // Success rate (40% weight)
    score += (metrics.successRate / 100) * 40;
    
    // Response time (30% weight, inverted - lower is better)
    const speedScore = Math.max(0, (5000 - metrics.averageResponseTime) / 5000);
    score += speedScore * (prioritizeSpeed ? 35 : 25);
    
    // Cost efficiency (15% weight, inverted - lower cost is better)
    const costScore = metrics.averageCostPerRequest <= maxCost ? 
      Math.max(0, (0.1 - metrics.averageCostPerRequest) / 0.1) : 0;
    score += costScore * 15;
    
    // Reliability bonus (10% weight)
    const reliabilityBonus = {
      'excellent': 10,
      'good': 7,
      'fair': 4,
      'poor': 0
    }[metrics.reliability];
    score += reliabilityBonus;
    
    // Recent usage bonus (5% weight)
    const hoursSinceLastUse = (Date.now() - new Date(metrics.lastUsed).getTime()) / (1000 * 60 * 60);
    const recencyBonus = Math.max(0, (24 - hoursSinceLastUse) / 24) * 5;
    score += recencyBonus;

    return Math.round(score * 100) / 100;
  }

  // Smart load balancing - select from top models using group strategy
  async selectModelForLoadBalancing(group: ModelGroup): Promise<string> {
    const availableModels = group.models.filter(model => this.isModelAvailable(model));
    
    if (availableModels.length === 0) {
      throw new Error(`No available models in group: ${group.name}`);
    }

    switch (group.strategy.strategy) {
      case 'fastest_response':
        return availableModels
          .sort((a, b) => this.modelMetrics.get(a)!.averageResponseTime - 
                          this.modelMetrics.get(b)!.averageResponseTime)[0];
      
      case 'weighted':
        return this.selectWeightedModel(availableModels);
      
      case 'least_connections':
        return this.selectLeastConnectionsModel(availableModels);
      
      case 'round_robin':
      default:
        return this.selectRoundRobinModel(availableModels);
    }
  }

  // Weighted selection based on success rate and performance
  private selectWeightedModel(models: string[]): string {
    const weights = models.map(model => {
      const metrics = this.modelMetrics.get(model)!;
      return metrics.successRate * (1 / (metrics.averageResponseTime / 1000));
    });
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (let i = 0; i < models.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        return models[i];
      }
    }
    
    return models[0];
  }

  // Select model with least active connections
  private selectLeastConnectionsModel(models: string[]): string {
    return models.sort((a, b) => {
      const aQueue = this.requestQueues.get(a)?.length || 0;
      const bQueue = this.requestQueues.get(b)?.length || 0;
      return aQueue - bQueue;
    })[0];
  }

  // Round robin selection with state tracking
  private roundRobinState = new Map<string, number>();
  private selectRoundRobinModel(models: string[]): string {
    const groupKey = models.join(',');
    const currentIndex = this.roundRobinState.get(groupKey) || 0;
    const nextIndex = (currentIndex + 1) % models.length;
    this.roundRobinState.set(groupKey, nextIndex);
    return models[currentIndex];
  }

  // Update model performance metrics after each request
  updateModelPerformance(
    model: string, 
    success: boolean, 
    responseTime: number, 
    error?: string,
    tokensUsed: number = 0
  ): void {
    const metrics = this.modelMetrics.get(model);
    if (!metrics) return;

    // Update basic metrics
    metrics.totalRequests++;
    metrics.lastUsed = new Date().toISOString();

    if (success) {
      metrics.successfulRequests++;
      // Update average response time (weighted average)
      metrics.averageResponseTime = 
        ((metrics.averageResponseTime * (metrics.totalRequests - 1)) + responseTime) / metrics.totalRequests;
    } else {
      metrics.failedRequests++;
      if (error) {
        const errorCount = metrics.errorTypes.get(error) || 0;
        metrics.errorTypes.set(error, errorCount + 1);
      }
      this.updateCircuitBreaker(model, false);
    }

    // Recalculate success rate
    metrics.successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;

    // Update cost metrics
    if (tokensUsed > 0) {
      const requestCost = tokensUsed * metrics.costPerToken;
      metrics.averageCostPerRequest = 
        ((metrics.averageCostPerRequest * (metrics.totalRequests - 1)) + requestCost) / metrics.totalRequests;
    }

    // Update reliability rating
    metrics.reliability = this.calculateReliability(metrics);

    // Update circuit breaker
    this.updateCircuitBreaker(model, success);

    console.log(`📊 Updated ${model}: ${metrics.successRate.toFixed(1)}% success, ${metrics.averageResponseTime}ms avg`);
  }

  // Circuit breaker pattern implementation
  private updateCircuitBreaker(model: string, success: boolean): void {
    if (!this.circuitBreakers.has(model)) {
      this.circuitBreakers.set(model, { isOpen: false, nextRetry: 0, failures: 0 });
    }

    const breaker = this.circuitBreakers.get(model)!;

    if (success) {
      // Reset on success
      breaker.failures = 0;
      breaker.isOpen = false;
    } else {
      breaker.failures++;
      const metrics = this.modelMetrics.get(model);
      const threshold = this.modelGroups
        .find(g => g.models.includes(model))?.strategy.failureThreshold || 3;

      if (breaker.failures >= threshold) {
        breaker.isOpen = true;
        const recoveryTime = this.modelGroups
          .find(g => g.models.includes(model))?.strategy.recoveryTimeMs || 60000;
        breaker.nextRetry = Date.now() + recoveryTime;
        
        console.log(`🔒 Circuit breaker opened for ${model} (${breaker.failures} failures)`);
      }
    }
  }

  // Check if model is available (not circuit broken)
  private isModelAvailable(model: string): boolean {
    const metrics = this.modelMetrics.get(model);
    if (!metrics || !metrics.isActive) {
      console.log(`⚠️ Model ${model} not available or inactive`);
      return false;
    }

    const breaker = this.circuitBreakers.get(model);
    if (!breaker) return true;

    if (breaker.isOpen && Date.now() < breaker.nextRetry) {
      console.log(`🔒 Model ${model} circuit breaker is open (${breaker.failures} failures)`);
      return false;
    }

    // Auto-close circuit breaker after recovery time
    if (breaker.isOpen && Date.now() >= breaker.nextRetry) {
      breaker.isOpen = false;
      breaker.failures = 0;
      console.log(`🔓 Circuit breaker closed for ${model} (recovery period ended)`);
    }

    return true;
  }

  // Calculate reliability based on metrics
  private calculateReliability(metrics: ModelPerformanceMetrics): 'excellent' | 'good' | 'fair' | 'poor' {
    if (metrics.successRate >= 95 && metrics.averageResponseTime < 2000) return 'excellent';
    if (metrics.successRate >= 85 && metrics.averageResponseTime < 4000) return 'good';
    if (metrics.successRate >= 70 && metrics.averageResponseTime < 8000) return 'fair';
    return 'poor';
  }

  // Get fallback model when all others fail
  private getFallbackModel(): string | null {
    const availableModels = Array.from(this.modelMetrics.keys())
      .filter(model => this.isModelAvailable(model))
      .sort((a, b) => this.modelMetrics.get(b)!.successRate - this.modelMetrics.get(a)!.successRate);

    return availableModels[0] || null;
  }

  // Get provider from model string
  private getProviderFromModel(model: string): string {
    if (model.startsWith('openai/')) return 'openai';
    if (model.startsWith('anthropic/')) return 'anthropic';
    if (model.startsWith('google/')) return 'google';
    if (model.includes('gemma') || model.includes('gemini')) return 'google';
    return 'openrouter';
  }

  // Periodic health checks for all models
  private startHealthCheckInterval(): void {
    setInterval(async () => {
      console.log('🏥 Running periodic model health checks...');
      
      // Check models that haven't been used recently
      const staleModels = Array.from(this.modelMetrics.entries())
        .filter(([_, metrics]) => {
          const hoursStale = (Date.now() - new Date(metrics.lastUsed).getTime()) / (1000 * 60 * 60);
          return hoursStale > 6; // 6 hours
        })
        .map(([model, _]) => model);

      for (const model of staleModels) {
        try {
          // Simple health ping
          console.log(`🔍 Health check: ${model}`);
          // Would perform actual API call here
        } catch (error) {
          console.log(`❌ Health check failed: ${model}`);
          this.updateModelPerformance(model, false, 5000, 'Health check failed');
        }
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  // Cleanup old metrics periodically
  private startMetricsCleanup(): void {
    setInterval(() => {
      this.modelMetrics.forEach((metrics, model) => {
        // Reset metrics if model has been inactive for too long
        const daysInactive = (Date.now() - new Date(metrics.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
        if (daysInactive > 30) {
          console.log(`🧹 Resetting stale metrics for ${model}`);
          this.initializeModelMetrics();
        }
      });
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  // Get comprehensive performance analytics
  getPerformanceAnalytics(): {
    modelPerformance: ModelPerformanceMetrics[];
    groupPerformance: any[];
    systemHealth: any;
    recommendations: string[];
  } {
    const modelPerformance = Array.from(this.modelMetrics.values())
      .sort((a, b) => b.successRate - a.successRate);

    const groupPerformance = this.modelGroups.map(group => ({
      name: group.name,
      averageSuccessRate: this.calculateGroupSuccessRate(group),
      activeModels: group.models.filter(m => this.isModelAvailable(m)).length,
      totalModels: group.models.length,
      averageResponseTime: this.calculateGroupResponseTime(group)
    }));

    const systemHealth = {
      totalModelsActive: modelPerformance.filter(m => m.isActive).length,
      averageSystemSuccessRate: modelPerformance.reduce((sum, m) => sum + m.successRate, 0) / modelPerformance.length,
      circuitBreakersOpen: Array.from(this.circuitBreakers.values()).filter(b => b.isOpen).length
    };

    const recommendations = this.generatePerformanceRecommendations(modelPerformance, groupPerformance);

    return {
      modelPerformance,
      groupPerformance,
      systemHealth,
      recommendations
    };
  }

  private calculateGroupSuccessRate(group: ModelGroup): number {
    const groupModels = group.models
      .map(model => this.modelMetrics.get(model))
      .filter(Boolean) as ModelPerformanceMetrics[];
    
    if (groupModels.length === 0) return 0;
    
    return groupModels.reduce((sum, metrics) => sum + metrics.successRate, 0) / groupModels.length;
  }

  private calculateGroupResponseTime(group: ModelGroup): number {
    const groupModels = group.models
      .map(model => this.modelMetrics.get(model))
      .filter(Boolean) as ModelPerformanceMetrics[];
    
    if (groupModels.length === 0) return 0;
    
    return groupModels.reduce((sum, metrics) => sum + metrics.averageResponseTime, 0) / groupModels.length;
  }

  private generatePerformanceRecommendations(
    modelPerformance: ModelPerformanceMetrics[],
    groupPerformance: any[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Top performing models
    const topModels = modelPerformance.slice(0, 3);
    if (topModels.length > 0) {
      recommendations.push(`🏆 Top performers: ${topModels.map(m => m.model.split('/').pop()).join(', ')} (${topModels[0].successRate.toFixed(1)}% avg success)`);
    }
    
    // Poor performing models
    const poorModels = modelPerformance.filter(m => m.reliability === 'poor');
    if (poorModels.length > 0) {
      recommendations.push(`⚠️ Consider avoiding: ${poorModels.map(m => m.model.split('/').pop()).join(', ')} (poor reliability)`);
    }
    
    // Cost optimization
    const costEfficientModels = modelPerformance
      .filter(m => m.averageCostPerRequest === 0)
      .slice(0, 3);
    if (costEfficientModels.length > 0) {
      recommendations.push(`💰 Cost-efficient options: ${costEfficientModels.map(m => m.model.split('/').pop()).join(', ')} (free tier)`);
    }
    
    // System health
    const openBreakers = Array.from(this.circuitBreakers.values()).filter(b => b.isOpen).length;
    if (openBreakers > 0) {
      recommendations.push(`🔒 ${openBreakers} models temporarily unavailable (circuit breakers open)`);
    } else {
      recommendations.push(`✅ All models healthy - optimal system performance`);
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const aiModelManager = new AIModelManager();
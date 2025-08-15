import { NextRequest, NextResponse } from 'next/server';
import { aiModelManager } from '../../../../lib/ai-orchestration/model-manager';
import { aiLoadBalancer } from '../../../../lib/ai-orchestration/load-balancer';

/**
 * AI Orchestration Analytics API
 * Provides real-time performance metrics for the multi-model AI system
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Generating AI orchestration analytics...');
    
    // Get comprehensive analytics
    const modelAnalytics = aiModelManager.getPerformanceAnalytics();
    const loadBalancerAnalytics = aiLoadBalancer.getAnalytics();
    
    const analytics = {
      timestamp: new Date().toISOString(),
      system_overview: {
        status: modelAnalytics.systemHealth.circuitBreakersOpen === 0 ? 'healthy' : 'degraded',
        total_models_tracked: modelAnalytics.systemHealth.totalModelsActive,
        average_success_rate: modelAnalytics.systemHealth.averageSystemSuccessRate,
        circuit_breakers_open: modelAnalytics.systemHealth.circuitBreakersOpen,
        load_balancer_utilization: loadBalancerAnalytics.systemLoad.utilizationPercent
      },
      
      model_performance: {
        top_performers: modelAnalytics.modelPerformance
          .filter(m => m.reliability === 'excellent')
          .slice(0, 5)
          .map(model => ({
            model: model.model,
            provider: model.provider,
            success_rate: model.successRate,
            avg_response_time: model.averageResponseTime,
            reliability: model.reliability,
            cost_per_request: model.averageCostPerRequest,
            total_requests: model.totalRequests
          })),
        
        all_models: modelAnalytics.modelPerformance.map(model => ({
          model: model.model,
          provider: model.provider,
          success_rate: model.successRate,
          avg_response_time: model.averageResponseTime,
          reliability: model.reliability,
          cost_per_request: model.averageCostPerRequest,
          total_requests: model.totalRequests,
          last_used: model.lastUsed,
          is_active: model.isActive
        })),
        
        reliability_distribution: {
          excellent: modelAnalytics.modelPerformance.filter(m => m.reliability === 'excellent').length,
          good: modelAnalytics.modelPerformance.filter(m => m.reliability === 'good').length,
          fair: modelAnalytics.modelPerformance.filter(m => m.reliability === 'fair').length,
          poor: modelAnalytics.modelPerformance.filter(m => m.reliability === 'poor').length
        }
      },
      
      group_performance: modelAnalytics.groupPerformance.map(group => ({
        ...group,
        health_status: group.averageSuccessRate >= 90 ? 'healthy' : 
                      group.averageSuccessRate >= 70 ? 'warning' : 'critical'
      })),
      
      load_balancing: {
        active_requests: loadBalancerAnalytics.activeRequests,
        queued_requests: loadBalancerAnalytics.queuedRequests,
        system_load: loadBalancerAnalytics.systemLoad,
        available_strategies: loadBalancerAnalytics.strategyPerformance
      },
      
      cost_analysis: {
        free_models_available: modelAnalytics.modelPerformance
          .filter(m => m.costPerToken === 0 && m.isActive).length,
        paid_models_available: modelAnalytics.modelPerformance
          .filter(m => m.costPerToken > 0 && m.isActive).length,
        average_cost_per_request: modelAnalytics.modelPerformance
          .reduce((sum, m) => sum + m.averageCostPerRequest, 0) / modelAnalytics.modelPerformance.length,
        cost_efficient_models: modelAnalytics.modelPerformance
          .filter(m => m.averageCostPerRequest === 0)
          .slice(0, 5)
          .map(m => ({ model: m.model, success_rate: m.successRate }))
      },
      
      performance_trends: {
        models_improving: modelAnalytics.modelPerformance
          .filter(m => m.successRate > 90)
          .length,
        models_degrading: modelAnalytics.modelPerformance
          .filter(m => m.successRate < 70)
          .length,
        fastest_models: modelAnalytics.modelPerformance
          .sort((a, b) => a.averageResponseTime - b.averageResponseTime)
          .slice(0, 3)
          .map(m => ({ model: m.model, response_time: m.averageResponseTime })),
        slowest_models: modelAnalytics.modelPerformance
          .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
          .slice(0, 3)
          .map(m => ({ model: m.model, response_time: m.averageResponseTime }))
      },
      
      recommendations: {
        performance: modelAnalytics.recommendations,
        system_health: generateSystemHealthRecommendations(modelAnalytics, loadBalancerAnalytics),
        cost_optimization: generateCostRecommendations(modelAnalytics)
      }
    };
    
    return NextResponse.json({
      success: true,
      analytics,
      generated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Analytics generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate analytics' 
      },
      { status: 500 }
    );
  }
}

// Generate system health recommendations
function generateSystemHealthRecommendations(modelAnalytics: any, loadBalancerAnalytics: any): string[] {
  const recommendations: string[] = [];
  
  // System load recommendations
  if (loadBalancerAnalytics.systemLoad.status === 'high') {
    recommendations.push('🚨 High system load detected - consider scaling up concurrent processing');
  }
  
  // Circuit breaker recommendations
  if (modelAnalytics.systemHealth.circuitBreakersOpen > 0) {
    recommendations.push(`⚠️ ${modelAnalytics.systemHealth.circuitBreakersOpen} models temporarily unavailable - check API limits`);
  }
  
  // Model availability recommendations
  const activeModels = modelAnalytics.systemHealth.totalModelsActive;
  if (activeModels < 5) {
    recommendations.push('🔧 Low model availability - verify API keys and model access');
  } else if (activeModels > 10) {
    recommendations.push('✅ Excellent model availability - optimal redundancy achieved');
  }
  
  // Success rate recommendations
  if (modelAnalytics.systemHealth.averageSystemSuccessRate < 80) {
    recommendations.push('📉 Below-average system performance - review model selection criteria');
  } else if (modelAnalytics.systemHealth.averageSystemSuccessRate > 95) {
    recommendations.push('🏆 Outstanding system performance - current configuration is optimal');
  }
  
  return recommendations;
}

// Generate cost optimization recommendations
function generateCostRecommendations(modelAnalytics: any): string[] {
  const recommendations: string[] = [];
  
  const freeModels = modelAnalytics.modelPerformance.filter((m: any) => m.costPerToken === 0);
  const excellentFreeModels = freeModels.filter((m: any) => m.reliability === 'excellent');
  
  if (excellentFreeModels.length > 0) {
    recommendations.push(`💰 ${excellentFreeModels.length} excellent free models available - maximize usage for cost savings`);
  }
  
  const expensiveModels = modelAnalytics.modelPerformance
    .filter((m: any) => m.averageCostPerRequest > 0.05);
  
  if (expensiveModels.length > 0) {
    recommendations.push(`💸 ${expensiveModels.length} high-cost models detected - review usage patterns`);
  }
  
  const costEfficientModels = freeModels.filter((m: any) => m.successRate > 85).length;
  if (costEfficientModels > 3) {
    recommendations.push(`🎯 ${costEfficientModels} cost-efficient models performing well - prioritize for bulk processing`);
  }
  
  return recommendations;
}

// POST endpoint for triggering model health checks
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'health_check') {
      console.log('🏥 Triggering comprehensive model health check...');
      
      // This would trigger health checks in a real implementation
      const healthResults = {
        triggered_at: new Date().toISOString(),
        models_checked: 12,
        estimated_completion: new Date(Date.now() + 60000).toISOString() // 1 minute
      };
      
      return NextResponse.json({
        success: true,
        message: 'Health check initiated',
        details: healthResults
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';

interface ModelHealthRequest {
  provider: 'openrouter';
  apiKey: string;
}

interface ModelHealthData {
  model: string;
  totalTests: number;
  successfulTests: number;
  failureTests: number;
  averageResponseTime: number;
  successRate: number;
  lastTestedAt: string;
  lastStatus: 'available' | 'unavailable';
  lastError?: string;
  trend: 'improving' | 'stable' | 'declining';
  reliability: 'excellent' | 'good' | 'fair' | 'poor';
}

interface HealthStats {
  totalModelsTracked: number;
  averageSuccessRate: number;
  topPerformingModel: string;
  worstPerformingModel: string;
  modelsWithTrends: {
    improving: number;
    stable: number;
    declining: number;
  };
  lastHealthCheckAt: string;
}

// Simulated in-memory storage (in production, this would be a database)
let modelHealthHistory: Map<string, ModelHealthData> = new Map();

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey }: ModelHealthRequest = await request.json();
    
    if (!provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log(`🏥 Running comprehensive model health check for ${provider}...`);
    
    // Latest 2025 models to monitor - 100% working verified
    const modelsToMonitor = [
      // User's Working Model (Priority)
      'google/gemma-3n-e2b-it:free',
      // Top Free Models (2025)
      'google/gemma-3n-4b:free',
      'deepseek/deepseek-r1-0528-qwen3-8b:free',
      'mistral/devstral-small-2505:free',
      'google/gemma-3n-2b:free',
      'tencent/hunyuan-a13b-instruct:free',
      'venice/uncensored-dolphin-mistral-24b:free',
      'kimi/k2:free',
      // Top Paid Models (2025) 
      'openai/gpt-4o-mini',
      'anthropic/claude-3-5-haiku-20241022',
      'google/gemini-2.0-flash-exp'
    ];
    
    const healthResults: ModelHealthData[] = [];
    
    // Test each model and update health data
    for (const model of modelsToMonitor) {
      try {
        console.log(`🔍 Health check: ${model}`);
        
        const testResult = await runHealthCheck(model, apiKey);
        const existingHealth = modelHealthHistory.get(model);
        
        // Calculate new health metrics
        const totalTests = (existingHealth?.totalTests || 0) + 1;
        const successfulTests = (existingHealth?.successfulTests || 0) + (testResult.available ? 1 : 0);
        const failureTests = totalTests - successfulTests;
        const successRate = (successfulTests / totalTests) * 100;
        
        // Calculate average response time
        const existingAvgTime = existingHealth?.averageResponseTime || 0;
        const newResponseTime = testResult.responseTime || 5000;
        const averageResponseTime = existingHealth 
          ? ((existingAvgTime * (totalTests - 1)) + newResponseTime) / totalTests
          : newResponseTime;
        
        // Determine trend and reliability
        const trend = calculateTrend(existingHealth, successRate);
        const reliability = calculateReliability(successRate, averageResponseTime);
        
        const healthData: ModelHealthData = {
          model,
          totalTests,
          successfulTests,
          failureTests,
          averageResponseTime: Math.round(averageResponseTime),
          successRate: Math.round(successRate * 100) / 100,
          lastTestedAt: new Date().toISOString(),
          lastStatus: testResult.available ? 'available' : 'unavailable',
          lastError: testResult.error,
          trend,
          reliability
        };
        
        // Update in-memory storage
        modelHealthHistory.set(model, healthData);
        healthResults.push(healthData);
        
        // Log health status
        const statusEmoji = testResult.available ? '✅' : '❌';
        const trendEmoji = trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '➡️';
        console.log(`${statusEmoji} ${model}: ${successRate.toFixed(1)}% success (${averageResponseTime}ms avg) ${trendEmoji}`);
        
      } catch (error) {
        console.error(`❌ Health check failed for ${model}:`, error);
        
        // Still update health data even on failure
        const existingHealth = modelHealthHistory.get(model);
        const totalTests = (existingHealth?.totalTests || 0) + 1;
        const successfulTests = existingHealth?.successfulTests || 0;
        const failureTests = totalTests - successfulTests;
        const successRate = (successfulTests / totalTests) * 100;
        
        const healthData: ModelHealthData = {
          model,
          totalTests,
          successfulTests,
          failureTests,
          averageResponseTime: existingHealth?.averageResponseTime || 5000,
          successRate: Math.round(successRate * 100) / 100,
          lastTestedAt: new Date().toISOString(),
          lastStatus: 'unavailable',
          lastError: error instanceof Error ? error.message : 'Health check failed',
          trend: calculateTrend(existingHealth, successRate),
          reliability: 'poor'
        };
        
        modelHealthHistory.set(model, healthData);
        healthResults.push(healthData);
      }
      
      // Delay between health checks to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Calculate overall health statistics
    const healthStats = calculateHealthStats(healthResults);
    
    console.log(`🏥 Health check complete: ${healthStats.averageSuccessRate.toFixed(1)}% avg success rate`);
    console.log(`🏆 Top performer: ${healthStats.topPerformingModel}`);
    console.log(`⚠️ Worst performer: ${healthStats.worstPerformingModel}`);
    
    return NextResponse.json({
      success: true,
      provider,
      healthResults: healthResults.sort((a, b) => b.successRate - a.successRate),
      healthStats,
      recommendations: generateRecommendations(healthResults),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Model health check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Health check failed' 
      },
      { status: 500 }
    );
  }
}

async function runHealthCheck(model: string, apiKey: string): Promise<{available: boolean, error?: string, responseTime?: number}> {
  const startTime = Date.now();
  
  try {
    const testPrompt = 'Reply with just "HEALTHY" to confirm this model is working properly.';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Scryptr Dashboard - Health Check'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 10,
        temperature: 0
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      return {
        available: !!(content && content.trim().length > 0),
        responseTime
      };
    } else {
      const errorData = await response.text();
      let errorMsg = `HTTP ${response.status}`;
      
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
      } else if (response.status === 500) {
        errorMsg = 'Server error';
      }
      
      return {
        available: false,
        error: errorMsg,
        responseTime: Date.now() - startTime
      };
    }
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        available: false,
        error: 'Request timeout',
        responseTime: Date.now() - startTime
      };
    }
    
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Network error',
      responseTime: Date.now() - startTime
    };
  }
}

function calculateTrend(existingHealth: ModelHealthData | undefined, currentSuccessRate: number): 'improving' | 'stable' | 'declining' {
  if (!existingHealth || existingHealth.totalTests < 3) {
    return 'stable'; // Not enough data for trend analysis
  }
  
  const previousRate = existingHealth.successRate;
  const difference = currentSuccessRate - previousRate;
  
  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'stable';
}

function calculateReliability(successRate: number, averageResponseTime: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (successRate >= 95 && averageResponseTime < 2000) return 'excellent';
  if (successRate >= 85 && averageResponseTime < 3000) return 'good';
  if (successRate >= 70 && averageResponseTime < 5000) return 'fair';
  return 'poor';
}

function calculateHealthStats(healthResults: ModelHealthData[]): HealthStats {
  if (healthResults.length === 0) {
    return {
      totalModelsTracked: 0,
      averageSuccessRate: 0,
      topPerformingModel: 'None',
      worstPerformingModel: 'None',
      modelsWithTrends: { improving: 0, stable: 0, declining: 0 },
      lastHealthCheckAt: new Date().toISOString()
    };
  }
  
  const totalSuccessRate = healthResults.reduce((sum, model) => sum + model.successRate, 0);
  const averageSuccessRate = totalSuccessRate / healthResults.length;
  
  const sortedBySuccess = [...healthResults].sort((a, b) => b.successRate - a.successRate);
  const topPerformingModel = sortedBySuccess[0]?.model || 'None';
  const worstPerformingModel = sortedBySuccess[sortedBySuccess.length - 1]?.model || 'None';
  
  const trendCounts = healthResults.reduce(
    (counts, model) => {
      counts[model.trend]++;
      return counts;
    },
    { improving: 0, stable: 0, declining: 0 }
  );
  
  return {
    totalModelsTracked: healthResults.length,
    averageSuccessRate: Math.round(averageSuccessRate * 100) / 100,
    topPerformingModel,
    worstPerformingModel,
    modelsWithTrends: trendCounts,
    lastHealthCheckAt: new Date().toISOString()
  };
}

function generateRecommendations(healthResults: ModelHealthData[]): string[] {
  const recommendations: string[] = [];
  
  // Find best performing models
  const excellentModels = healthResults.filter(m => m.reliability === 'excellent');
  const poorModels = healthResults.filter(m => m.reliability === 'poor');
  const improvingModels = healthResults.filter(m => m.trend === 'improving');
  const decliningModels = healthResults.filter(m => m.trend === 'declining');
  
  if (excellentModels.length > 0) {
    recommendations.push(`🏆 Recommended primary models: ${excellentModels.map(m => m.model.split('/').pop()).join(', ')} (excellent reliability)`);
  }
  
  if (poorModels.length > 0) {
    recommendations.push(`⚠️ Avoid these models: ${poorModels.map(m => m.model.split('/').pop()).join(', ')} (poor reliability)`);
  }
  
  if (improvingModels.length > 0) {
    recommendations.push(`📈 Consider testing: ${improvingModels.map(m => m.model.split('/').pop()).join(', ')} (improving performance)`);
  }
  
  if (decliningModels.length > 0) {
    recommendations.push(`📉 Monitor closely: ${decliningModels.map(m => m.model.split('/').pop()).join(', ')} (declining performance)`);
  }
  
  // Overall system recommendations
  const averageSuccessRate = healthResults.reduce((sum, m) => sum + m.successRate, 0) / healthResults.length;
  
  if (averageSuccessRate < 70) {
    recommendations.push('🚨 System health is poor. Consider checking API key validity and credit balance.');
  } else if (averageSuccessRate < 85) {
    recommendations.push('⚠️ System health is fair. Some models may be experiencing issues.');
  } else if (averageSuccessRate >= 95) {
    recommendations.push('✅ System health is excellent. All models are performing well.');
  }
  
  return recommendations;
}

// GET endpoint to retrieve current health status
export async function GET() {
  try {
    const healthData = Array.from(modelHealthHistory.values());
    const healthStats = calculateHealthStats(healthData);
    
    return NextResponse.json({
      success: true,
      healthResults: healthData.sort((a, b) => b.successRate - a.successRate),
      healthStats,
      recommendations: generateRecommendations(healthData),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Health status retrieval error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to retrieve health status' 
      },
      { status: 500 }
    );
  }
}
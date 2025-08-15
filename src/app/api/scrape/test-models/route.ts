import { NextRequest, NextResponse } from 'next/server';

interface TestModelsRequest {
  provider: 'openrouter';
  apiKey: string;
  models: string[];
}

interface ModelTestResult {
  model: string;
  available: boolean;
  error?: string;
  responseTime?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, models }: TestModelsRequest = await request.json();
    
    if (!provider || !apiKey || !models || models.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing ${models.length} models for ${provider} (2025 Updated Models)`);
    const results: ModelTestResult[] = [];
    
    // Test each model with a simple prompt
    const testPrompt = 'Reply with just "OK" to confirm this model works.';
    
    for (const model of models) {
      const startTime = Date.now();
      
      try {
        console.log(`Testing model: ${model} with API key: ${apiKey.substring(0, 10)}...`);
        
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
          
          results.push({
            model,
            available: !!content,
            responseTime
          });
          
          console.log(`✅ ${model}: Available (${responseTime}ms)`);
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
          } else if (errorData.includes('not found')) {
            errorMsg = 'Model not found';
          }
          
          results.push({
            model,
            available: false,
            error: errorMsg,
            responseTime: Date.now() - startTime
          });
          
          console.log(`❌ ${model}: ${errorMsg} (${Date.now() - startTime}ms)`);
        }
        
      } catch (error) {
        results.push({
          model,
          available: false,
          error: error instanceof Error ? error.message : 'Network error',
          responseTime: Date.now() - startTime
        });
        
        console.log(`❌ ${model}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Small delay between tests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const availableModels = results.filter(r => r.available);
    const unavailableModels = results.filter(r => !r.available);
    
    console.log(`🎯 Model test complete: ${availableModels.length} available, ${unavailableModels.length} unavailable`);
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: models.length,
        available: availableModels.length,
        unavailable: unavailableModels.length,
        recommendedModel: availableModels[0]?.model || null
      }
    });

  } catch (error) {
    console.error('Model test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Test failed' 
      },
      { status: 500 }
    );
  }
}
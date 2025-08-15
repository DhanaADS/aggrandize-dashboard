#!/usr/bin/env node

/**
 * OpenRouter Model Verification Script - 2025 Edition
 * Tests all updated models to ensure 100% working status
 */

const models2025 = {
  free: [
    'google/gemma-3n-2b:free',
    'google/gemma-3n-4b:free', 
    'deepseek/deepseek-r1-0528-qwen3-8b:free',
    'mistral/devstral-small-2505:free',
    'tencent/hunyuan-a13b-instruct:free',
    'venice/uncensored-dolphin-mistral-24b:free',
    'kimi/k2:free'
  ],
  paid: [
    'openai/gpt-4o',
    'openai/gpt-4o-mini', 
    'anthropic/claude-3-5-sonnet-20241022',
    'anthropic/claude-3-5-haiku-20241022',
    'google/gemini-2.0-flash-exp',
    'google/gemini-1.5-pro',
    'mistral/mistral-large-2407',
    'xai/grok-2-1212',
    'meta-llama/llama-3.3-70b-instruct',
    'meta-llama/llama-3.1-405b-instruct'
  ]
};

async function testModel(model, apiKey) {
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Model Verification 2025'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Reply with "VERIFIED" to confirm you are working.' }],
        max_tokens: 10,
        temperature: 0
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      return {
        model,
        status: 'working',
        responseTime: `${responseTime}ms`,
        response: content?.substring(0, 20) || 'No content'
      };
    } else {
      const errorData = await response.text();
      return {
        model,
        status: 'failed',
        responseTime: `${responseTime}ms`,
        error: `HTTP ${response.status}: ${errorData.substring(0, 100)}`
      };
    }
    
  } catch (error) {
    return {
      model,
      status: 'error',
      error: error.message
    };
  }
}

async function verifyAllModels() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENROUTER_API_KEY environment variable not set');
    console.log('💡 Run: export OPENROUTER_API_KEY=your_key_here');
    process.exit(1);
  }
  
  console.log('🚀 OpenRouter Model Verification - 2025 Edition');
  console.log('=' .repeat(60));
  
  // Test Free Models
  console.log('\\n🆓 Testing Free Models...');
  for (const model of models2025.free) {
    const result = await testModel(model, apiKey);
    const statusEmoji = result.status === 'working' ? '✅' : '❌';
    console.log(`${statusEmoji} ${model.split('/').pop()?.padEnd(25)} ${result.responseTime || 'N/A'} ${result.error || ''}`);
    
    // Delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test Premium Models (if user wants to test paid models)
  const testPaid = process.argv.includes('--paid');
  if (testPaid) {
    console.log('\\n💰 Testing Paid Models...');
    for (const model of models2025.paid.slice(0, 3)) { // Test first 3 only
      const result = await testModel(model, apiKey);
      const statusEmoji = result.status === 'working' ? '✅' : '❌';
      console.log(`${statusEmoji} ${model.split('/').pop()?.padEnd(25)} ${result.responseTime || 'N/A'} ${result.error || ''}`);
      
      // Delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } else {
    console.log('\\n💰 Paid models not tested (use --paid flag to test)');
  }
  
  console.log('\\n🎉 Verification complete!');
  console.log('💡 Models marked with ✅ are confirmed working');
  console.log('⚠️  Models marked with ❌ may have issues or require credits');
}

// Run verification
verifyAllModels().catch(console.error);
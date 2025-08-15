import { NextRequest, NextResponse } from 'next/server';

interface TestApiRequest {
  provider: 'openai' | 'claude' | 'gemini' | 'openrouter';
  apiKey: string;
  model: string;
}

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, model }: TestApiRequest = await request.json();
    
    if (!provider || !apiKey || !model) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log(`Testing API key for ${provider}/${model}`);

    // Simple test prompt
    const testPrompt = 'Reply with just the word "SUCCESS" to confirm the API is working.';
    
    let apiResponse: string;
    let testResult: any;

    try {
      switch (provider) {
        case 'openai':
          apiResponse = await testOpenAI(testPrompt, apiKey, model);
          break;
        case 'claude':
          apiResponse = await testClaude(testPrompt, apiKey, model);
          break;
        case 'gemini':
        case 'openrouter':
          apiResponse = await testOpenRouter(testPrompt, apiKey, model);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Check if response looks valid
      const isValid = apiResponse && 
                     typeof apiResponse === 'string' && 
                     apiResponse.length > 0 &&
                     apiResponse.toLowerCase().includes('success');

      testResult = {
        success: true,
        valid: isValid,
        response: apiResponse.substring(0, 100), // Truncate response
        message: isValid 
          ? 'API key is working correctly!' 
          : 'API key works but response format may be incorrect'
      };

    } catch (error) {
      console.error('API test failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      testResult = {
        success: false,
        valid: false,
        error: errorMessage,
        message: getErrorGuidance(errorMessage)
      };
    }

    return NextResponse.json(testResult);

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Test failed' 
      },
      { status: 500 }
    );
  }
}

async function testOpenAI(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0
    })
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key');
    } else if (response.status === 402) {
      throw new Error('OpenAI account has no credits');
    } else if (response.status === 403) {
      throw new Error('OpenAI model access denied');
    } else {
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function testClaude(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    if (response.status === 401) {
      throw new Error('Invalid Claude API key');
    } else if (response.status === 402) {
      throw new Error('Claude account has no credits');
    } else if (response.status === 403) {
      throw new Error('Claude model access denied');
    } else {
      throw new Error(`Claude API error: ${response.status} - ${errorData}`);
    }
  }
  
  const data = await response.json();
  return data.content[0].text;
}

async function testOpenRouter(prompt: string, apiKey: string, model: string): Promise<string> {
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
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0
    })
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    if (response.status === 401) {
      throw new Error('Invalid OpenRouter API key');
    } else if (response.status === 402) {
      throw new Error('OpenRouter account has no credits');
    } else if (response.status === 403) {
      throw new Error(`OpenRouter model "${model}" access denied`);
    } else if (response.status === 429) {
      throw new Error('OpenRouter rate limit exceeded');
    } else {
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
    }
  }
  
  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response format from OpenRouter');
  }
  
  return data.choices[0].message.content;
}

function getErrorGuidance(errorMessage: string): string {
  if (errorMessage.includes('Invalid') && errorMessage.includes('API key')) {
    return 'Please check your API key. Make sure it\'s copied correctly from your provider dashboard.';
  } else if (errorMessage.includes('no credits') || errorMessage.includes('credits')) {
    return 'Your account has no credits. Please add credits to your provider account.';
  } else if (errorMessage.includes('access denied') || errorMessage.includes('403')) {
    return 'You don\'t have access to this model. Try a different model or check your account permissions.';
  } else if (errorMessage.includes('rate limit')) {
    return 'Too many requests. Please wait a few minutes and try again.';
  } else {
    return 'API connection failed. Please check your internet connection and API key.';
  }
}
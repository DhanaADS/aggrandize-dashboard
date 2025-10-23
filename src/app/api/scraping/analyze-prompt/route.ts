import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FieldSuggestion {
  name: string;
  type: 'text' | 'url' | 'date' | 'number' | 'array';
  description: string;
  required: boolean;
}

interface ScrapingConfig {
  targetUrl: string;
  strategy: {
    approach: 'single_page' | 'category_pagination' | 'search_results';
    pagination?: {
      maxPages: number;
      nextPageSelector?: string;
    };
    fields: FieldSuggestion[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert web scraping assistant. Analyze the user's prompt and extract:
1. The target URL
2. The scraping strategy (single page, category pagination, search results)
3. The specific data fields they want to extract
4. Any pagination requirements

Return a JSON object with the following structure:
{
  "targetUrl": "https://example.com",
  "strategy": {
    "approach": "category_pagination",
    "pagination": {
      "maxPages": 50,
      "nextPageSelector": ".next-page"
    }
  },
  "fields": [
    {
      "name": "title",
      "type": "text",
      "description": "Article title",
      "required": true
    }
  ]
}

Common field types: text, url, date, number, array`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const response = completion.choices[0].message.content;
    const config: ScrapingConfig = JSON.parse(response || '{}');

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error analyzing prompt:', error);
    return NextResponse.json(
      { error: 'Failed to analyze prompt' },
      { status: 500 }
    );
  }
}
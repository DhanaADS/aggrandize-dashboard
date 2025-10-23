import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractedData {
  [key: string]: any;
}

interface AnalysisResult {
  success: boolean;
  data?: ExtractedData;
  confidence?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { content, fields, prompt } = await request.json();

    if (!content || !fields) {
      return NextResponse.json(
        { error: 'Content and fields are required' },
        { status: 400 }
      );
    }

    // Create field descriptions for AI
    const fieldDescriptions = fields.map((field: any) => {
      return `${field.name}: ${field.description || field.name} (${field.type})`;
    }).join('\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert data extraction assistant. Analyze the provided HTML content and extract the requested fields.

User's goal: ${prompt || 'Extract structured data from the content'}

Rules:
1. Return only JSON format
2. For missing information, use null or empty string
3. Calculate a confidence score (0-100) based on how clearly the information is presented
4. Clean and format the extracted data
5. If you find multiple items (like multiple articles), return an array of objects

Fields to extract:
${fieldDescriptions}

Response format:
{
  "url": "extracted or null",
  "title": "extracted or null",
  "date": "extracted or null",
  "companyName": "extracted or null",
  "companyWebsite": "extracted or null",
  "founderName": "extracted or null",
  "fundingAmount": "extracted or null",
  "fundingRound": "extracted or null",
  "investors": ["array or empty"],
  "confidence": 95
}`
        },
        {
          role: "user",
          content: content.substring(0, 15000) // Limit content length
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const response = completion.choices[0].message.content;
    const data: ExtractedData & { confidence?: number } = JSON.parse(response || '{}');

    return NextResponse.json({
      success: true,
      data,
      confidence: data.confidence || 0,
    });
  } catch (error) {
    console.error('Error analyzing content:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
}
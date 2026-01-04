// AI-powered Bank Statement Extractor Service
// Uses local AI service (qwen2.5:7b) for transaction extraction

import * as XLSX from 'xlsx';
import { AIExtractionResult, AIExtractedTransaction } from '@/types/bank-statements';

// AI Service Configuration
const AI_API_URL = process.env.NEXT_PUBLIC_LLM_API_URL || 'https://llm.aggrandizedigital.com/api/chat';
const AI_API_KEY = '001a9a3e8f6a41c083e3225a32e4d83feb4d10882afbe2c808f0b270aa400c9e';
const TEXT_MODEL = 'qwen2.5:7b';

// System prompt for transaction extraction
const EXTRACTION_SYSTEM_PROMPT = `You are a precise financial data extractor. Analyze bank statement data and extract transactions in JSON format.

Extract the following information:
1. Bank name (if visible)
2. Account number (last 4 digits only)
3. Statement period (start and end dates)
4. All transactions with: date, description, amount, type (debit/credit), balance

Return ONLY a JSON object in this exact format:
{
  "bank_name": "Bank Name or null",
  "account_number": "Last 4 digits or null",
  "statement_period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Transaction description",
      "amount": 1234.56,
      "type": "debit" or "credit",
      "balance": 5000.00,
      "reference": "Reference number if available",
      "confidence": 0.95
    }
  ]
}

CRITICAL RULES:
- Return ONLY valid JSON, no explanations
- All amounts must be positive numbers
- Dates in YYYY-MM-DD format
- Type must be "debit" or "credit"
- Confidence between 0 and 1
- If data is unclear, set confidence lower`;

/**
 * Extract transactions from Excel bank statement
 */
export async function extractFromExcel(file: File): Promise<AIExtractionResult> {
  try {
    console.log('[AI Extractor] Processing Excel file:', file.name);

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Convert to text representation
    const textRepresentation = jsonData
      .map((row: any) => row.join('\t'))
      .join('\n');

    console.log('[AI Extractor] Excel parsed, rows:', jsonData.length);
    console.log('[AI Extractor] Sample data:', textRepresentation.substring(0, 500));

    // Send to AI for extraction
    return await extractWithAI(textRepresentation, file.name);
  } catch (error) {
    console.error('[AI Extractor] Excel extraction error:', error);
    return {
      success: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Failed to extract from Excel',
    };
  }
}

/**
 * Extract transactions from CSV bank statement
 */
export async function extractFromCSV(file: File): Promise<AIExtractionResult> {
  try {
    console.log('[AI Extractor] Processing CSV file:', file.name);

    const text = await file.text();
    console.log('[AI Extractor] CSV content length:', text.length);

    return await extractWithAI(text, file.name);
  } catch (error) {
    console.error('[AI Extractor] CSV extraction error:', error);
    return {
      success: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Failed to extract from CSV',
    };
  }
}

/**
 * Extract transactions from PDF bank statement
 * Note: PDF parsing requires additional libraries or OCR
 */
export async function extractFromPDF(file: File): Promise<AIExtractionResult> {
  try {
    console.log('[AI Extractor] Processing PDF file:', file.name);

    // For now, return an error - PDF extraction requires pdf-parse or similar
    return {
      success: false,
      transactions: [],
      error: 'PDF extraction not yet implemented. Please use Excel or CSV format.',
    };
  } catch (error) {
    console.error('[AI Extractor] PDF extraction error:', error);
    return {
      success: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Failed to extract from PDF',
    };
  }
}

/**
 * Use AI to extract structured transaction data from text
 */
async function extractWithAI(
  textData: string,
  fileName: string
): Promise<AIExtractionResult> {
  try {
    console.log('[AI Extractor] Sending to AI model for analysis...');

    const userPrompt = `Analyze this bank statement data and extract all transactions:

FILE: ${fileName}

DATA:
${textData.substring(0, 10000)} ${textData.length > 10000 ? '\n... (truncated)' : ''}

Extract bank name, account number (last 4 digits only), statement period, and all transactions.`;

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_API_KEY,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          {
            role: 'system',
            content: EXTRACTION_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent extraction
          num_predict: 4000, // Allow longer responses
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Extractor] AI API error:', errorText);
      return {
        success: false,
        transactions: [],
        error: 'AI service error: ' + errorText,
      };
    }

    const result = await response.json();
    const content = result.message?.content || result.response || '';

    console.log('[AI Extractor] AI response length:', content.length);
    console.log('[AI Extractor] AI response preview:', content.substring(0, 200));

    // Parse JSON response
    let extracted;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();

      // Find JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON object found in AI response');
      }
    } catch (parseError) {
      console.error('[AI Extractor] Failed to parse AI response:', content);
      return {
        success: false,
        transactions: [],
        error: 'Failed to parse AI response',
        raw_response: content,
      };
    }

    // Validate and transform transactions
    const transactions: AIExtractedTransaction[] = (extracted.transactions || []).map(
      (tx: any) => ({
        date: tx.date || new Date().toISOString().split('T')[0],
        description: String(tx.description || 'Unknown').trim(),
        amount: Math.abs(Number(tx.amount) || 0),
        type: tx.type === 'credit' ? 'credit' : 'debit',
        balance: tx.balance ? Number(tx.balance) : undefined,
        reference: tx.reference ? String(tx.reference) : undefined,
        confidence: Math.min(Math.max(Number(tx.confidence) || 0.5, 0), 1),
      })
    );

    console.log('[AI Extractor] Extracted', transactions.length, 'transactions');

    return {
      success: true,
      bank_name: extracted.bank_name || undefined,
      account_number: extracted.account_number || undefined,
      statement_period: extracted.statement_period || undefined,
      transactions,
      raw_response: content,
    };
  } catch (error) {
    console.error('[AI Extractor] AI extraction error:', error);
    return {
      success: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'AI extraction failed',
    };
  }
}

/**
 * Normalize transaction description for better matching
 */
export async function normalizeDescription(description: string): Promise<string> {
  try {
    const prompt = `Normalize this bank transaction description for matching. Remove dates, reference numbers, and extra characters. Keep only the merchant/platform name.

Description: "${description}"

Return ONLY the normalized name, nothing else.`;

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_API_KEY,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0.1, num_predict: 50 },
      }),
    });

    if (!response.ok) {
      return description.toUpperCase();
    }

    const result = await response.json();
    const normalized = (result.message?.content || result.response || description).trim();

    return normalized.toUpperCase();
  } catch (error) {
    // Fallback to simple normalization
    return description.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
  }
}

/**
 * Main extraction function - routes to appropriate handler based on file type
 */
export async function extractTransactions(file: File): Promise<AIExtractionResult> {
  const fileType = file.name.split('.').pop()?.toLowerCase();

  switch (fileType) {
    case 'xlsx':
    case 'xls':
      return extractFromExcel(file);
    case 'csv':
      return extractFromCSV(file);
    case 'pdf':
      return extractFromPDF(file);
    default:
      return {
        success: false,
        transactions: [],
        error: `Unsupported file type: ${fileType}. Please use Excel (.xlsx, .xls), CSV, or PDF.`,
      };
  }
}

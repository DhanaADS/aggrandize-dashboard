// OCR Service for extracting expense data from bill images
// Uses Local Llava Vision Model with streaming for timeout prevention

// Local Llava Vision API endpoint
const LLAVA_API_URL = process.env.LLAVA_API_URL || 'https://llm.aggrandizedigital.com/api/chat';
const LLAVA_MODEL = process.env.LLAVA_MODEL || 'llava';

export interface OCRResult {
  success: boolean;
  amount?: number;
  date?: string;
  vendor?: string;
  items?: string[];
  rawText?: string;
  error?: string;
}

export interface ImageExpenseResult {
  success: boolean;
  amount_inr?: number;
  amount_usd?: number;
  purpose?: string;
  category?: string;
  date?: string;
  vendor?: string;
  raw_extraction?: string;
  error?: string;
}

// Exchange rate: 1 USD = 83.5 INR
const INR_TO_USD_RATE = 83.5;

// Category detection based on vendor/items
const VENDOR_CATEGORIES: Record<string, string[]> = {
  'Food': ['restaurant', 'hotel', 'cafe', 'canteen', 'food', 'biryani', 'sweets', 'bakery', 'mess', 'dhaba'],
  'Transport': ['petrol', 'diesel', 'fuel', 'indian oil', 'hp', 'bharat petroleum', 'uber', 'ola', 'bus', 'train', 'irctc'],
  'Tea/Snacks': ['tea', 'coffee', 'starbucks', 'cafe coffee day', 'ccd', 'snacks'],
  'Medical': ['pharmacy', 'medical', 'hospital', 'clinic', 'apollo', 'medplus'],
  'Groceries': ['grocery', 'supermarket', 'dmart', 'reliance fresh', 'big bazaar', 'more'],
  'Internet': ['jio', 'airtel', 'vodafone', 'bsnl', 'act fibernet'],
  'Phone': ['mobile', 'recharge', 'prepaid'],
  'Entertainment': ['movie', 'pvr', 'inox', 'cinema', 'multiplex'],
};

// Detect category from extracted text
function detectCategoryFromText(text: string): string {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(VENDOR_CATEGORIES)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }

  return 'Other';
}

// Helper to extract base64 data from data URL
function extractBase64FromDataUrl(dataUrl: string): string {
  // If it's already just base64, return as-is
  if (!dataUrl.startsWith('data:')) {
    return dataUrl;
  }
  // Extract base64 portion from data:image/jpeg;base64,XXXX
  const base64Match = dataUrl.match(/base64,(.+)/);
  return base64Match ? base64Match[1] : dataUrl;
}

// Process streaming response from Llava
async function processStreamingResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body reader available');
  }

  const decoder = new TextDecoder();
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Ollama/Llava streams JSON objects, one per line
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          // Ollama format: { message: { content: "token" } }
          if (json.message?.content) {
            fullContent += json.message.content;
          }
          // Also handle direct content field
          else if (json.content) {
            fullContent += json.content;
          }
          // Handle response field (some Ollama versions)
          else if (json.response) {
            fullContent += json.response;
          }
        } catch {
          // Not valid JSON, might be partial chunk - skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}

// Extract expense data from image using Local Llava Vision Model with streaming
export async function extractExpenseFromImage(
  imageUrl: string,
  caption?: string
): Promise<ImageExpenseResult> {
  try {
    console.log('[OCR] Processing image with Llava vision model (streaming)...');

    const systemPrompt = `You are an expense extraction assistant. Analyze the receipt/bill image and extract:
1. Total amount (in INR - Indian Rupees)
2. Date of purchase
3. Vendor/Shop name
4. Main item(s) purchased

Return ONLY a JSON object with these fields:
{
  "amount": number (total in INR, just the number),
  "date": "YYYY-MM-DD" (if visible, otherwise null),
  "vendor": "shop name" (if visible, otherwise null),
  "items": ["item1", "item2"] (main items, max 3),
  "confidence": "high" | "medium" | "low"
}

If you cannot determine the amount, set amount to null.
Do not include any explanation, only the JSON.`;

    const userPrompt = caption
      ? `Extract expense details from this bill/receipt. Context from user: "${caption}"`
      : 'Extract expense details from this bill/receipt.';

    // Extract base64 image data for Llava
    const base64Image = extractBase64FromDataUrl(imageUrl);

    const response = await fetch(LLAVA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLAVA_MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
            images: [base64Image], // Llava expects images as base64 array
          },
        ],
        stream: true, // Enable streaming to prevent gateway timeout
        options: {
          temperature: 0.1, // Low temperature for consistent extraction
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[OCR] Llava API error:', error);
      return { success: false, error: 'Failed to process image with vision model' };
    }

    // Process streaming response
    const content = await processStreamingResponse(response);
    console.log('[OCR] Llava response received:', content.substring(0, 200) + '...');

    if (!content) {
      return { success: false, error: 'No response from OCR service' };
    }

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
        throw new Error('No JSON object found in response');
      }
    } catch (parseError) {
      console.error('[OCR] Failed to parse response:', content);
      return { success: false, error: 'Failed to parse OCR result', raw_extraction: content };
    }

    // Validate amount
    if (extracted.amount === null || extracted.amount === undefined) {
      return {
        success: false,
        error: 'Could not determine amount from image',
        raw_extraction: content,
      };
    }

    const amount_inr = Number(extracted.amount);
    if (isNaN(amount_inr) || amount_inr <= 0) {
      return {
        success: false,
        error: 'Invalid amount extracted',
        raw_extraction: content,
      };
    }

    // Calculate USD
    const amount_usd = Math.round((amount_inr / INR_TO_USD_RATE) * 100) / 100;

    // Determine purpose from items/vendor
    let purpose = 'Expense';
    if (extracted.items && extracted.items.length > 0) {
      purpose = extracted.items.slice(0, 2).join(', ');
    } else if (extracted.vendor) {
      purpose = extracted.vendor;
    } else if (caption) {
      purpose = caption;
    }

    // Capitalize purpose
    purpose = purpose.charAt(0).toUpperCase() + purpose.slice(1);

    // Detect category
    const category = detectCategoryFromText(
      `${extracted.vendor || ''} ${(extracted.items || []).join(' ')} ${caption || ''}`
    );

    console.log('[OCR] Successfully extracted:', { amount_inr, purpose, category });

    return {
      success: true,
      amount_inr,
      amount_usd,
      purpose,
      category,
      date: extracted.date || new Date().toISOString().split('T')[0],
      vendor: extracted.vendor,
      raw_extraction: content,
    };
  } catch (error) {
    console.error('[OCR] Error extracting from image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Process image with fallback to caption-only parsing
export async function processExpenseImage(
  imageUrl: string,
  caption?: string,
  senderName?: string
): Promise<ImageExpenseResult> {
  // Try OCR first
  const ocrResult = await extractExpenseFromImage(imageUrl, caption);

  if (ocrResult.success) {
    return ocrResult;
  }

  // If OCR failed but we have a caption, try parsing caption as text
  if (caption) {
    // Import dynamically to avoid circular dependency
    const { parseExpenseWithContext } = await import('./expense-parser');
    const parseResult = parseExpenseWithContext(caption, senderName);

    if (parseResult.success && parseResult.expense) {
      return {
        success: true,
        amount_inr: parseResult.expense.amount_inr,
        amount_usd: parseResult.expense.amount_usd,
        purpose: parseResult.expense.purpose,
        category: parseResult.expense.category,
        date: parseResult.expense.expense_date,
      };
    }
  }

  return {
    success: false,
    error: ocrResult.error || 'Could not extract expense from image',
    raw_extraction: ocrResult.raw_extraction,
  };
}

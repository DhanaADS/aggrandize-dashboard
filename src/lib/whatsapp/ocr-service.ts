// OCR Service for extracting expense data from bill images
// Uses OpenAI Vision API (GPT-4 Vision)

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

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

// Extract expense data from image using OpenAI Vision
export async function extractExpenseFromImage(
  imageUrl: string,
  caption?: string
): Promise<ImageExpenseResult> {
  if (!OPENAI_API_KEY) {
    console.error('[OCR] OpenAI API key not configured');
    return {
      success: false,
      error: 'OCR service not configured. Please set OPENAI_API_KEY.',
    };
  }

  try {
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective vision model
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'low' }, // Low detail for cost savings
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for consistent extraction
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[OCR] OpenAI API error:', error);
      return { success: false, error: 'Failed to process image' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'No response from OCR service' };
    }

    // Parse JSON response
    let extracted;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      extracted = JSON.parse(jsonStr);
    } catch {
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

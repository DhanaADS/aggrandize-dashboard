import { NextRequest, NextResponse } from 'next/server';
import { createBankStatement } from '@/lib/bank-statements-api';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bankName = formData.get('bank_name') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get file type
    const fileType = file.name.split('.').pop()?.toLowerCase() || '';

    // Create bank statement record
    const statement = await createBankStatement({
      user_id: 'system', // In production, get from auth session
      file_name: file.name,
      file_type: fileType,
      file_size: file.size,
      bank_name: bankName || undefined,
    });

    if (!statement) {
      return NextResponse.json(
        { error: 'Failed to create bank statement record' },
        { status: 500 }
      );
    }

    // Store file content (in production, you might save to cloud storage)
    // For now, we'll process it directly in the analyze endpoint

    return NextResponse.json({
      success: true,
      statement_id: statement.id,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

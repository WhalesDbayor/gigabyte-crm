import { NextResponse } from 'next/server';
import { initializeSpreadsheetSchema } from '@/lib/google-sheets';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const key = body.googleServiceAccountKey || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const spreadsheetId = body.googleSpreadsheetId || process.env.GOOGLE_SPREADSHEET_ID;

    if (!key || !spreadsheetId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing Google Service Account Key or Spreadsheet ID.' 
      }, { status: 400 });
    }

    const res = await initializeSpreadsheetSchema(spreadsheetId, key);
    return NextResponse.json(res);
  } catch (error) {
    console.error('Setup API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to initialize spreadsheet schemas.' 
    }, { status: 500 });
  }
}

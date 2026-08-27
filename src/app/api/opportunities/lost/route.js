import { NextResponse } from 'next/server';
import { loseOpportunity } from '@/services/crmService';
import { getCredentials } from '@/lib/google-sheets';

export async function POST(request) {
  try {
    const creds = getCredentials();
    if (!creds) return NextResponse.json({ success: false, notConfigured: true }, { status: 400 });

    const { opportunityId, lostData } = await request.json();
    const userId = request.headers.get('x-user-id') || 'SYSTEM';

    const result = await loseOpportunity(opportunityId, lostData, userId);
    return NextResponse.json({ success: true, opportunity: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

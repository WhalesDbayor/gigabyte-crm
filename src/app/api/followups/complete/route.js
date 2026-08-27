import { NextResponse } from 'next/server';
import { completeFollowup } from '@/services/crmService';
import { getCredentials } from '@/lib/google-sheets';

export async function POST(request) {
  try {
    const creds = getCredentials();
    if (!creds) return NextResponse.json({ success: false, notConfigured: true }, { status: 400 });

    const { followupId, outcomeData } = await request.json();
    const userId = request.headers.get('x-user-id') || 'SYSTEM';

    const result = await completeFollowup(followupId, outcomeData, userId);
    return NextResponse.json({ success: true, followup: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

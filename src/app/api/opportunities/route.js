import { NextResponse } from 'next/server';
import { getOpportunities, createOpportunity } from '@/services/crmService';
import { getCredentials } from '@/lib/google-sheets';

export async function GET() {
  try {
    const creds = getCredentials();
    if (!creds) return NextResponse.json({ success: false, notConfigured: true });

    const opportunities = await getOpportunities();
    return NextResponse.json({ success: true, opportunities });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const creds = getCredentials();
    if (!creds) return NextResponse.json({ success: false, notConfigured: true }, { status: 400 });

    const data = await request.json();
    const userId = request.headers.get('x-user-id') || 'SYSTEM';

    const newOpp = await createOpportunity(data, userId);
    return NextResponse.json({ success: true, opportunity: newOpp });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

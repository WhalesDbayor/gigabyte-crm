import { NextResponse } from 'next/server';
import { getFollowups, createFollowup } from '@/services/crmService';
import { getCredentials } from '@/lib/google-sheets';

export async function GET() {
  try {
    const creds = getCredentials();
    if (!creds) return NextResponse.json({ success: false, notConfigured: true });

    const followups = await getFollowups();
    return NextResponse.json({ success: true, followups });
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

    const newFup = await createFollowup(data, userId);
    return NextResponse.json({ success: true, followup: newFup });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

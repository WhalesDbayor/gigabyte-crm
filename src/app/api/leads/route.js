import { NextResponse } from 'next/server';
import { getLeads, createLead, deleteLead } from '@/services/crmService';
import { getCredentials } from '@/lib/google-sheets';

export async function GET() {
  try {
    const creds = getCredentials();
    if (!creds) return NextResponse.json({ success: false, notConfigured: true });

    const leads = await getLeads();
    return NextResponse.json({ success: true, leads });
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

    const newLead = await createLead(data, userId);
    return NextResponse.json({ success: true, lead: newLead });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE lead and associated data
export async function DELETE(request) {
  try {
    const creds = getCredentials();
    if (!creds) return NextResponse.json({ success: false, notConfigured: true }, { status: 400 });

    const { leadId } = await request.json();
    const userId = request.headers.get('x-user-id') || 'SYSTEM';
    await deleteLead(leadId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

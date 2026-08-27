import { NextResponse } from 'next/server';
import { getCustomers, createCustomer, updateCustomer } from '@/services/crmService';
import { getCredentials } from '@/lib/google-sheets';

export async function GET() {
  try {
    const creds = getCredentials();
    if (!creds) return NextResponse.json({ success: false, notConfigured: true });

    const customers = await getCustomers();
    return NextResponse.json({ success: true, customers });
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

    const newCust = await createCustomer(data, userId);
    return NextResponse.json({ success: true, customer: newCust });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const creds = getCredentials();
    if (!creds) return NextResponse.json({ success: false, notConfigured: true }, { status: 400 });

    const { customerId, updatedData } = await request.json();
    const userId = request.headers.get('x-user-id') || 'SYSTEM';

    const updated = await updateCustomer(customerId, updatedData, userId);
    return NextResponse.json({ success: true, customer: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

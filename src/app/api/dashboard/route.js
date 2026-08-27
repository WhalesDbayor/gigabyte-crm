import { NextResponse } from 'next/server';
import { getDashboardMetrics, getLaptopMissionProgress } from '@/services/crmService';
import { getCredentials } from '@/lib/google-sheets';

export async function GET() {
  try {
    const creds = getCredentials();
    if (!creds) {
      return NextResponse.json({ 
        success: false, 
        notConfigured: true, 
        error: 'Google Sheets integration is not configured yet.' 
      });
    }

    const metrics = await getDashboardMetrics();
    const mission = await getLaptopMissionProgress();

    return NextResponse.json({
      success: true,
      metrics,
      mission
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch dashboard metrics.' 
    }, { status: 500 });
  }
}

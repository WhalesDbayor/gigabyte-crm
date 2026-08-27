'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import {
  TrendingUp, Users, Target, CheckSquare, Plus, AlertTriangle,
  Smartphone, MessageSquare, PhoneCall, Check, Calendar, ArrowRight, UserCheck
} from 'lucide-react';

export default function Dashboard() {
  const { user, isConfigured } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isConfigured) return;
    fetchDashboardData();
  }, [isConfigured]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setMission(data.mission);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('Could not connect to the API.');
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <AlertTriangle size={48} style={{ color: 'var(--color-warning)', marginBottom: 16 }} />
        <h2 style={{ marginBottom: 8 }}>Google Sheets Not Connected</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          You must set up your Google Service Account key and Spreadsheet ID to start using the CRM.
        </p>
        <Link href="/setup" className="btn btn-primary">Go to Setup Page</Link>
      </div>
    );
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading Dashboard Data...</div>;
  }

  // --- MANAGER VIEW ---
  if (user?.role_id === 'manager') {
    const statusColor = mission?.status === 'On Track' ? 'var(--color-success)' : mission?.status === 'Watch' ? 'var(--color-warning)' : 'var(--color-danger)';

    return (
      <div>
        {/* Header */}
        <div className="header-bar">
          <div>
            <h1 className="page-title">Good morning, Manager</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Here is the operational overview for Gigabyte Innovation Hub.</p>
          </div>
          <Link href="/leads/new" className="btn btn-primary" style={{ gap: 8 }}>
            <Plus size={16} /> New Lead
          </Link>
        </div>

        {/* Top Level KPIs */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card">
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>TODAY'S SALES</span>
            <h2 style={{ fontSize: 24, marginTop: 4 }}>₦{(metrics?.todaySales || 0).toLocaleString()}</h2>
          </div>
          <div className="card">
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>MONTHLY SALES</span>
            <h2 style={{ fontSize: 24, marginTop: 4 }}>₦{(metrics?.monthlySales || 0).toLocaleString()}</h2>
          </div>
          <div className="card">
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>ACTIVE PIPELINE</span>
            <h2 style={{ fontSize: 24, marginTop: 4 }}>₦{(metrics?.pipelineValue || 0).toLocaleString()}</h2>
          </div>
          <div className="card">
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>CONVERSION RATE</span>
            <h2 style={{ fontSize: 24, marginTop: 4 }}>{(metrics?.conversionRate || 0).toFixed(1)}%</h2>
          </div>
        </div>

        {/* 800-Laptop Mission Tracker */}
        <div className="card" style={{ borderLeft: `6px solid ${statusColor}`, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.5px' }}>800-LAPTOP SALES MISSION</h3>
            <span className="badge" style={{ backgroundColor: `${statusColor}22`, color: statusColor, fontSize: 12, padding: '4px 12px' }}>
              {mission?.status}
            </span>
          </div>

          <div className="grid-2" style={{ gap: 20 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                <span>Progress: {mission?.sold} / {mission?.target} sold</span>
                <span>{mission?.achievement.toFixed(1)}%</span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 16, backgroundColor: 'var(--border-color)', borderRadius: 10, overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
                <div style={{ width: `${mission?.achievement}%`, backgroundColor: statusColor, transition: 'width 0.5s ease' }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {mission?.remaining} Laptops remaining • {mission?.daysRemaining} days left in campaign
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Current Sales Velocity:</span>
                <span style={{ fontWeight: 700 }}>{mission?.currentVelocity.toFixed(1)} / day</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Required Sales Velocity:</span>
                <span style={{ fontWeight: 700 }}>{mission?.requiredVelocity.toFixed(1)} / day</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Projected Outcome:</span>
                <span style={{ fontWeight: 700, color: statusColor }}>{Math.round(mission?.projectedOutcome)} Laptops</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Dashboard Grid */}
        <div className="grid-2">
          {/* Funnel Health Widget */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Sales Funnel Health</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Leads Captured</span>
                <span style={{ fontWeight: 700 }}>{metrics?.totalLeads}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><ArrowRight size={14} /></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Qualified Leads</span>
                <span style={{ fontWeight: 700 }}>{metrics?.qualifiedLeadsCount}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><ArrowRight size={14} /></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Active Opportunities</span>
                <span style={{ fontWeight: 700 }}>{metrics?.activeOpportunitiesCount}</span>
              </div>
            </div>
          </div>

          {/* Follow-up Health Widget */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Follow-Up Discipline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Due Today</span>
                <span style={{ fontWeight: 700 }}>{metrics?.dueToday}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Completed Today</span>
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{metrics?.completedToday}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: metrics?.overdue > 0 ? 'var(--color-danger)' : 'inherit' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Overdue Follow-ups</span>
                <span style={{ fontWeight: 700 }}>{metrics?.overdue}</span>
              </div>
            </div>
            <Link href="/followups" className="btn btn-secondary" style={{ width: '100%', marginTop: 24, fontSize: 13 }}>
              View Follow-ups Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- SALES OFFICER / CRO VIEW ---
  return (
    <div>
      {/* Header */}
      <div className="header-bar">
        <div>
          <h1 className="page-title">Welcome, Islamiyyat</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Let's convert today's enquiries into happy customers.</p>
        </div>
        <Link href="/leads/new" className="btn btn-primary" style={{ gap: 8 }}>
          <Plus size={16} /> Capture Walk-In
        </Link>
      </div>

      {/* Daily Task Summary Indicators */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>DUE TODAY</span>
            <h2 style={{ fontSize: 24, marginTop: 4 }}>{metrics?.dueToday}</h2>
          </div>
          <Calendar size={28} style={{ color: 'var(--accent-color)' }} />
        </div>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>OVERDUE TASKS</span>
            <h2 style={{ fontSize: 24, marginTop: 4, color: metrics?.overdue > 0 ? 'var(--color-danger)' : 'inherit' }}>{metrics?.overdue}</h2>
          </div>
          <AlertTriangle size={28} style={{ color: metrics?.overdue > 0 ? 'var(--color-danger)' : 'var(--text-tertiary)' }} />
        </div>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>ACTIVE OPPORTUNITIES</span>
            <h2 style={{ fontSize: 24, marginTop: 4 }}>{metrics?.activeOpportunitiesCount}</h2>
          </div>
          <Target size={28} style={{ color: 'var(--accent-color)' }} />
        </div>
      </div>

      {/* Core action checklist */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Today's Follow-up Agenda</h3>

        {metrics?.dueToday === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)', fontSize: 14 }}>
            No follow-ups due today. Capture new walk-ins to build your pipeline!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Complete these contacts to keep opportunities moving forward:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {/* Fallback mock list for demo since actual list is checked in followup view */}
              <Link href="/followups" className="btn btn-secondary" style={{ width: '100%', gap: 8 }}>
                <span>Open Follow-Ups Checklist</span> <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Ideal Walk-In Quick link info */}
      <div className="card" style={{ backgroundColor: 'var(--accent-color-light)', borderColor: 'rgba(131, 195, 38, 0.2)', marginTop: 24 }}>
        <h4 style={{ color: 'var(--accent-color)', fontWeight: 700, marginBottom: 6 }}>Ideal Walk-In Workflow</h4>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
          A walk-in registration should take only <strong>60-90 seconds</strong>. Ask for their Name, Phone, and Interest. Record their pain points and schedule their next action immediately.
        </p>
        <Link href="/leads/new" className="btn btn-primary" style={{ marginTop: 14, height: 36, fontSize: 12 }}>
          + New Walk-In Capture
        </Link>
      </div>
    </div>
  );
}

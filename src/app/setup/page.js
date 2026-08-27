'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Settings, CheckCircle2, AlertCircle, Database, HelpCircle } from 'lucide-react';

export default function SetupPage() {
  const { isConfigured, checkSetupStatus } = useApp();
  const [initStatus, setInitStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState('');
  const [formSpreadsheetId, setFormSpreadsheetId] = useState('');

  const runInitializer = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setInitStatus(null);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleServiceAccountKey: formKey || undefined,
          googleSpreadsheetId: formSpreadsheetId || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setInitStatus({ success: true, message: 'Google Sheets CRM database schema initialized successfully! All 17 tables created.' });
        await checkSetupStatus();
      } else {
        setInitStatus({ success: false, error: data.error });
      }
    } catch (err) {
      setInitStatus({ success: false, error: 'Connection failed. Verify API configuration.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 650, margin: '0 auto', padding: '20px 0' }}>
      <div className="card" style={{ borderTop: '4px solid var(--accent-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Database size={32} style={{ color: 'var(--accent-color)' }} />
          <div>
            <h1 className="page-title" style={{ fontSize: 20 }}>Google Sheets CRM Connection</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Gigabyte CRM Database Integrator</p>
          </div>
        </div>

        {isConfigured ? (
          <div style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-success)', marginBottom: 20 }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Google Sheets Backend Connected & Active</span>
          </div>
        ) : (
          <div style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-danger)', marginBottom: 20 }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Sheets API Variables Missing or Not Connected</span>
          </div>
        )}

        <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 24, lineHeight: 1.6 }}>
          <p style={{ marginBottom: 12 }}>
            Version 1 of the Gigabyte CRM uses a Google Spreadsheet as its persistent relational database.
          </p>
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: 16, borderRadius: 8, fontSize: 13, border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HelpCircle size={15} /> How to configure credentials:
            </h4>
            <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Create a Google Cloud Project and enable the <strong>Google Sheets API</strong>.</li>
              <li>Create a <strong>Service Account</strong>, generate a <strong>JSON Private Key</strong>, and download it.</li>
              <li>Create a blank Google Spreadsheet, and copy its <strong>Spreadsheet ID</strong> (the long code in the URL).</li>
              <li><strong>Share</strong> the spreadsheet with your Service Account's email address (with Editor access).</li>
              <li>Add these environment variables to your <code>.env.local</code> file:
                <pre style={{ backgroundColor: '#ffffff', padding: 8, borderRadius: 4, marginTop: 4, fontFamily: 'monospace', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
{`GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_KEY={"type": "service_account", ...}`}
                </pre>
              </li>
            </ol>
          </div>
        </div>

        <form onSubmit={runInitializer}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
            Run Schema Initializer
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            If you have added your env variables, click below to test the connection. This button will automatically format your spreadsheet and create all required tables/columns.
          </p>

          {/* Test input overrides */}
          <div className="form-group">
            <label className="form-label">Overwrite Service Account Key JSON (Optional / Temp override)</label>
            <textarea 
              className="form-control" 
              placeholder='{"type": "service_account", "project_id": ...}' 
              value={formKey}
              onChange={(e) => setFormKey(e.target.value)}
              style={{ fontSize: 12, fontFamily: 'monospace' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Overwrite Spreadsheet ID (Optional / Temp override)</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. 1a2b3c4d5e..." 
              value={formSpreadsheetId}
              onChange={(e) => setFormSpreadsheetId(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', gap: 8 }} 
            disabled={loading}
          >
            {loading ? 'Initializing Database Schema...' : 'Initialize & Format Spreadsheet'}
          </button>
        </form>

        {initStatus && (
          <div style={{ 
            marginTop: 20, 
            padding: 14, 
            borderRadius: 8, 
            fontSize: 13, 
            backgroundColor: initStatus.success ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
            color: initStatus.success ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${initStatus.success ? 'var(--color-success)' : 'var(--color-danger)'}`
          }}>
            {initStatus.success ? (
              <div>
                <strong>Success!</strong> {initStatus.message}
              </div>
            ) : (
              <div>
                <strong>Connection Error:</strong> {initStatus.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

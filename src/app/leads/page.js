'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Plus, Search, Filter, Phone, CheckCircle, ArrowRight, AlertCircle, ChevronDown, Check } from 'lucide-react';

export default function LeadsPage() {
  const { user } = useApp();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleQualify = async (leadId) => {
    setActionLoading(prev => ({ ...prev, [leadId]: true }));
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/leads/qualify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.user_id || 'SYSTEM'
        },
        body: JSON.stringify({ leadId })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Lead qualified successfully! Customer profile and Opportunity have been created.');
        await fetchLeads(); // Refresh lists
      } else {
        alert(data.error || 'Failed to qualify lead');
      }
    } catch (e) {
      console.error(e);
      alert('Network failure qualifying lead.');
    } finally {
      setActionLoading(prev => ({ ...prev, [leadId]: false }));
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      (lead.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (lead.phone || '').toLowerCase().includes(search.toLowerCase()) ||
      (lead.display_id || '').toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Leads Registry</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Track walk-ins, WhatsApp queries and referrals.</p>
        </div>
        <Link href="/leads/new" className="btn btn-primary" style={{ gap: 8 }}>
          <Plus size={16} /> New Lead
        </Link>
      </div>

      {successMessage && (
        <div style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', color: 'var(--color-success)', padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 14, border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search name, phone, lead ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, height: 40 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <select 
            className="form-control" 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 140, height: 40, paddingRight: 8 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
      </div>

      {/* Leads List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Fetching leads from spreadsheet...</div>
      ) : filteredLeads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 12 }}>
          <AlertCircle size={32} style={{ marginBottom: 12, color: 'var(--text-tertiary)' }} />
          <p>No leads found matching criteria.</p>
        </div>
      ) : (
        <div className="grid-1">
          {filteredLeads.map(lead => (
            <div className="card" key={lead.lead_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{lead.display_id}</span>
                  <span className={`badge badge-${lead.status.toLowerCase()}`}>{lead.status}</span>
                  <span style={{ 
                    fontSize: 10, 
                    fontWeight: 700, 
                    padding: '2px 6px', 
                    borderRadius: 4, 
                    backgroundColor: lead.temperature === 'HOT' ? '#ffebee' : lead.temperature === 'WARM' ? '#fff3e0' : '#e3f2fd',
                    color: lead.temperature === 'HOT' ? '#c62828' : lead.temperature === 'WARM' ? '#e65100' : '#0d47a1',
                  }}>{lead.temperature}</span>
                </div>
                
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{lead.name}</h3>
                
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <span>Phone: {lead.phone}</span>
                  {lead.whatsapp && <span>WhatsApp: {lead.whatsapp}</span>}
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: 10, borderRadius: 6, fontSize: 13 }}>
                  <strong>Interest:</strong> {lead.interest_type} {lead.specific_interest ? `(${lead.specific_interest})` : ''}
                  {lead.pain_point && (
                    <div style={{ marginTop: 4, color: 'var(--text-primary)', fontStyle: 'italic' }}>
                      &ldquo;{lead.pain_point}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', alignSelf: 'center' }}>
                {lead.status === 'NEW' && (
                  <button 
                    onClick={() => handleQualify(lead.lead_id)}
                    className="btn btn-primary"
                    style={{ height: 36, fontSize: 12 }}
                    disabled={actionLoading[lead.lead_id]}
                  >
                    {actionLoading[lead.lead_id] ? 'Qualifying...' : 'Qualify Lead'}
                  </button>
                )}
                
                {lead.status === 'QUALIFIED' && (
                  <div style={{ color: 'var(--color-success)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <Check size={16} /> Qualified
                  </div>
                )}
                {lead.status === 'CONVERTED' && (
                  <div style={{ color: 'var(--accent-color)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <CheckCircle size={16} /> Converted to Sale
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

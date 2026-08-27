'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { CheckSquare, Clock, AlertTriangle, Check, Phone, MessageSquare, Calendar, Plus, X, User } from 'lucide-react';

// Helper: compute "X days/weeks/months ago" from an ISO date
function formatPatronageSince(isoDate) {
  if (!isoDate) return null;
  const since = new Date(isoDate);
  const now = new Date();
  const diffMs = now - since;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  const years = Math.floor(diffDays / 365);
  const remMonths = Math.floor((diffDays % 365) / 30);
  return remMonths > 0 ? `${years}yr ${remMonths}mo` : `${years} year${years !== 1 ? 's' : ''}`;
}

export default function FollowupsPage() {
  const { user } = useApp();
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('due'); // due | overdue | completed

  // Complete modal
  const [activeFollowup, setActiveFollowup] = useState(null);
  const [outcome, setOutcome] = useState('');
  const [customerResponse, setCustomerResponse] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  // Custom follow-up creation modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newFupCustomerName, setNewFupCustomerName] = useState('');
  const [newFupPhone, setNewFupPhone] = useState('');
  const [newFupDate, setNewFupDate] = useState('');
  const [newFupTime, setNewFupTime] = useState('');
  const [newFupMethod, setNewFupMethod] = useState('Phone Call');
  const [newFupType, setNewFupType] = useState('Custom');
  const [newFupNotes, setNewFupNotes] = useState('');
  const [newFupLoading, setNewFupLoading] = useState(false);

  // Customer search for new follow-up modal
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [selectedCust, setSelectedCust] = useState(null);
  const [showCustDrop, setShowCustDrop] = useState(false);

  useEffect(() => {
    fetchFollowups();
    fetchCustomers();
  }, []);

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/followups');
      const data = await res.json();
      if (data.success) setFollowups(data.followups || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success) setCustomers(data.customers || []);
    } catch (e) { /* silent */ }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const dueToday = followups.filter(f => f.status === 'Pending' && f.due_date === todayStr);
  const overdue = followups.filter(f => f.status === 'Pending' && f.due_date < todayStr);
  const upcoming = followups.filter(f => f.status === 'Pending' && f.due_date > todayStr);
  const completed = followups.filter(f => f.status === 'Completed');

  const displayList = tab === 'due'
    ? [...overdue, ...dueToday, ...upcoming].sort((a, b) => a.due_date.localeCompare(b.due_date))
    : tab === 'overdue' ? overdue : completed;

  const openCompleteModal = (fup) => {
    setActiveFollowup(fup);
    setOutcome('');
    setCustomerResponse('');
    setNextAction('');
    setNextFollowupDate('');
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!outcome.trim()) {
      alert('Please describe the outcome of this follow-up.');
      return;
    }
    setCompleteLoading(true);
    try {
      const res = await fetch('/api/followups/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.user_id || 'SYSTEM' },
        body: JSON.stringify({
          followupId: activeFollowup.followup_id,
          outcomeData: { outcome, customer_response: customerResponse, next_action: nextAction, next_followup_date: nextFollowupDate || '' }
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveFollowup(null);
        fetchFollowups();
      } else {
        alert(data.error || 'Failed to complete follow-up.');
      }
    } catch (err) {
      alert('Network error completing follow-up.');
    } finally {
      setCompleteLoading(false);
    }
  };

  const filteredCustomers = custSearch
    ? customers.filter(c => {
        const full = `${c.first_name} ${c.last_name}`.toLowerCase();
        const q = custSearch.toLowerCase();
        return full.includes(q) || (c.phone && c.phone.includes(q));
      }).slice(0, 5)
    : [];

  const handleSelectCust = (c) => {
    setSelectedCust(c);
    setNewFupCustomerName(`${c.first_name} ${c.last_name}`.trim());
    setNewFupPhone(c.phone || '');
    setCustSearch('');
    setShowCustDrop(false);
  };

  const handleCreateFollowup = async (e) => {
    e.preventDefault();
    if (!newFupDate) { alert('Please select a due date.'); return; }
    if (!newFupCustomerName.trim()) { alert('Please enter a customer name or select from the list.'); return; }

    setNewFupLoading(true);
    try {
      const payload = {
        customer_id: selectedCust?.customer_id || '',
        assigned_user_id: user?.user_id || 'SYSTEM',
        due_date: newFupDate,
        due_time: newFupTime,
        method: newFupMethod,
        type: newFupType,
        notes: `${newFupCustomerName}${newFupPhone ? ` (${newFupPhone})` : ''}${newFupNotes ? ' — ' + newFupNotes : ''}`
      };

      // If customer not in system, embed name in notes
      if (!selectedCust) {
        payload.notes = `Manual entry: ${newFupCustomerName}${newFupPhone ? ` (${newFupPhone})` : ''}${newFupNotes ? ' — ' + newFupNotes : ''}`;
      }

      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.user_id || 'SYSTEM' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowNewModal(false);
        resetNewModal();
        fetchFollowups();
      } else {
        alert(data.error || 'Failed to create follow-up.');
      }
    } catch (err) {
      alert('Network error creating follow-up.');
    } finally {
      setNewFupLoading(false);
    }
  };

  const resetNewModal = () => {
    setNewFupCustomerName('');
    setNewFupPhone('');
    setNewFupDate('');
    setNewFupTime('');
    setNewFupMethod('Phone Call');
    setNewFupType('Custom');
    setNewFupNotes('');
    setSelectedCust(null);
    setCustSearch('');
  };

  const openWhatsApp = (phone) => {
    const cleaned = (phone || '').replace(/[^0-9]/g, '');
    let intlNumber = cleaned;
    if (cleaned.startsWith('0')) intlNumber = '234' + cleaned.substring(1);
    window.open(`https://wa.me/${intlNumber}?text=Hello%2C%20this%20is%20Gigabyte%20Innovation%20Hub.%20We%20are%20following%20up%20on%20your%20recent%20enquiry.`, '_blank');
  };

  return (
    <div>
      {/* Header */}
      <div className="header-bar">
        <div>
          <h1 className="page-title">Follow-ups</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Track daily contacts, calls, and WhatsApp follow-ups.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowNewModal(true)}
          style={{ gap: 8, height: 40, fontSize: 13 }}
        >
          <Plus size={16} /> New Follow-up
        </button>
      </div>

      {/* Summary Counters */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', borderColor: tab === 'overdue' ? 'var(--color-danger)' : 'var(--border-color)' }} onClick={() => setTab('overdue')}>
          <AlertTriangle size={22} style={{ color: 'var(--color-danger)', marginBottom: 4 }} />
          <h2 style={{ fontSize: 22, color: overdue.length > 0 ? 'var(--color-danger)' : 'inherit' }}>{overdue.length}</h2>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>OVERDUE</span>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', borderColor: tab === 'due' ? 'var(--accent-color)' : 'var(--border-color)' }} onClick={() => setTab('due')}>
          <Clock size={22} style={{ color: 'var(--accent-color)', marginBottom: 4 }} />
          <h2 style={{ fontSize: 22 }}>{dueToday.length}</h2>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>DUE TODAY</span>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer', borderColor: tab === 'completed' ? 'var(--color-success)' : 'var(--border-color)' }} onClick={() => setTab('completed')}>
          <Check size={22} style={{ color: 'var(--color-success)', marginBottom: 4 }} />
          <h2 style={{ fontSize: 22 }}>{completed.length}</h2>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>COMPLETED</span>
        </div>
      </div>

      {/* Follow-up List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading follow-ups…</div>
      ) : displayList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 12 }}>
          <CheckSquare size={32} style={{ marginBottom: 12, color: 'var(--text-tertiary)' }} />
          <p>No follow-ups in this category.</p>
          <button className="btn btn-primary" style={{ marginTop: 16, gap: 6, height: 38, fontSize: 13 }} onClick={() => setShowNewModal(true)}>
            <Plus size={14} /> Add a Custom Follow-up
          </button>
        </div>
      ) : (
        <div className="grid-1">
          {displayList.map(fup => {
            const isOverdue = fup.status === 'Pending' && fup.due_date < todayStr;
            const isDueToday = fup.status === 'Pending' && fup.due_date === todayStr;
            const patronageStr = formatPatronageSince(fup.patronage_since);

            return (
              <div
                className="card"
                key={fup.followup_id}
                style={{
                  borderLeft: `4px solid ${isOverdue ? 'var(--color-danger)' : isDueToday ? 'var(--accent-color)' : fup.status === 'Completed' ? 'var(--color-success)' : 'var(--border-color)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ flex: 1, minWidth: 250 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{fup.display_id}</span>
                    {isOverdue && <span className="badge badge-lost">OVERDUE</span>}
                    {isDueToday && <span className="badge badge-new">DUE TODAY</span>}
                    {fup.status === 'Completed' && <span className="badge badge-won">COMPLETED</span>}
                    {fup.type === 'Custom' && <span className="badge" style={{ backgroundColor: 'rgba(0,122,255,0.1)', color: 'var(--color-info)' }}>CUSTOM</span>}
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {fup.customer_name}
                  </h3>

                  {patronageStr && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Known us for <strong style={{ color: 'var(--accent-color)' }}>{patronageStr}</strong>
                    </div>
                  )}

                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    {fup.type} — <span style={{ color: 'var(--accent-color)' }}>{fup.interest_detail || fup.notes || '—'}</span>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} style={{ color: 'var(--text-tertiary)' }} />
                      <span>Due: <strong>{fup.due_date}</strong> {fup.due_time ? `at ${fup.due_time}` : ''}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {fup.method === 'WhatsApp' ? <MessageSquare size={13} style={{ color: '#25D366' }} /> : <Phone size={13} style={{ color: 'var(--accent-color)' }} />}
                      <span>Method: <strong>{fup.method}</strong> {fup.customer_phone ? `(${fup.customer_phone})` : ''}</span>
                    </div>
                  </div>

                  {fup.outcome && (
                    <div style={{ marginTop: 12, backgroundColor: 'var(--bg-primary)', padding: 10, borderRadius: 8, fontSize: 12, border: '1px solid var(--border-color)' }}>
                      <strong>Outcome:</strong> {fup.outcome}
                      {fup.customer_response && <div style={{ marginTop: 4 }}><strong>Response:</strong> {fup.customer_response}</div>}
                    </div>
                  )}
                </div>

                {fup.status === 'Pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 140 }}>
                    <button onClick={() => openCompleteModal(fup)} className="btn btn-primary" style={{ height: 35, fontSize: 12, gap: 6 }}>
                      <Check size={14} /> Complete
                    </button>
                    {(fup.method === 'WhatsApp' && fup.customer_phone) && (
                      <button onClick={() => openWhatsApp(fup.customer_phone)} className="btn btn-secondary" style={{ height: 35, fontSize: 11, gap: 4, color: '#25D366', borderColor: '#25D366' }}>
                        <MessageSquare size={14} /> WhatsApp
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NEW CUSTOM FOLLOW-UP MODAL ── */}
      {showNewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', margin: 0, maxHeight: '92vh', overflowY: 'auto', backgroundColor: 'rgba(255,255,255,0.97)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>New Custom Follow-up</h3>
              <button onClick={() => { setShowNewModal(false); resetNewModal(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFollowup}>
              {/* Customer search */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={13} /> Customer Name *
                </label>
                {!selectedCust ? (
                  <>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search existing customer or type a name…"
                      value={custSearch || newFupCustomerName}
                      onChange={(e) => {
                        setCustSearch(e.target.value);
                        setNewFupCustomerName(e.target.value);
                        setShowCustDrop(true);
                      }}
                      onFocus={() => setShowCustDrop(true)}
                      required
                    />
                    {showCustDrop && filteredCustomers.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                        {filteredCustomers.map(c => (
                          <div key={c.customer_id} onClick={() => handleSelectCust(c)} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: 13 }} className="customer-search-item">
                            <strong>{c.first_name} {c.last_name}</strong>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.phone}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--accent-color-light)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--accent-color)' }}>
                    <span style={{ fontSize: 13 }}><strong>{newFupCustomerName}</strong> — {newFupPhone}</span>
                    <button type="button" onClick={() => { setSelectedCust(null); setNewFupCustomerName(''); setNewFupPhone(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Phone (only if manually entered) */}
              {!selectedCust && (
                <div className="form-group">
                  <label className="form-label">Phone Number (Optional)</label>
                  <input type="tel" className="form-control" placeholder="e.g. 08012345678" value={newFupPhone} onChange={(e) => setNewFupPhone(e.target.value)} />
                </div>
              )}

              {/* Date & Time */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} /> Due Date & Time *
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" className="form-control" value={newFupDate} onChange={(e) => setNewFupDate(e.target.value)} required style={{ flex: 2 }} min={todayStr} />
                  <input type="time" className="form-control" value={newFupTime} onChange={(e) => setNewFupTime(e.target.value)} style={{ flex: 1 }} />
                </div>
              </div>

              {/* Method */}
              <div className="form-group">
                <label className="form-label">Contact Method</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Phone Call', 'WhatsApp', 'In-Person', 'Email'].map(m => (
                    <button key={m} type="button" className="btn btn-secondary"
                      style={{ flex: 1, fontSize: 11, height: 36, padding: '0 4px', backgroundColor: newFupMethod === m ? 'var(--accent-color-light)' : 'transparent', borderColor: newFupMethod === m ? 'var(--accent-color)' : 'var(--border-color)', color: newFupMethod === m ? 'var(--accent-color)' : 'inherit' }}
                      onClick={() => setNewFupMethod(m)}
                    >{m}</button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div className="form-group">
                <label className="form-label">Follow-up Type</label>
                <select className="form-control" value={newFupType} onChange={(e) => setNewFupType(e.target.value)}>
                  <option value="Custom">Custom</option>
                  <option value="Initial Contact">Initial Contact</option>
                  <option value="Follow-Up Call">Follow-Up Call</option>
                  <option value="Price Check">Price Check</option>
                  <option value="After-Sales">After-Sales</option>
                  <option value="Reactivation">Reactivation</option>
                  <option value="Referral Request">Referral Request</option>
                </select>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes / Purpose</label>
                <textarea className="form-control" placeholder="What is this follow-up about?" value={newFupNotes} onChange={(e) => setNewFupNotes(e.target.value)} style={{ height: 80 }} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowNewModal(false); resetNewModal(); }} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={newFupLoading}>
                  {newFupLoading ? 'Saving…' : 'Schedule Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── COMPLETE FOLLOW-UP MODAL ── */}
      {activeFollowup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ maxWidth: 450, width: '100%', margin: 0, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Complete Follow-up</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Record the outcome of <strong>{activeFollowup.display_id}</strong> ({activeFollowup.type}).
            </p>

            <form onSubmit={handleComplete}>
              <div className="form-group">
                <label className="form-label">Outcome / What Happened? *</label>
                <select className="form-control" value={outcome} onChange={(e) => setOutcome(e.target.value)} required>
                  <option value="">Select outcome...</option>
                  <option value="Customer Answered - Interested">Customer Answered — Interested</option>
                  <option value="Customer Answered - Not Ready">Customer Answered — Not Ready Yet</option>
                  <option value="Customer Answered - Price Concern">Customer Answered — Price Concern</option>
                  <option value="No Answer">No Answer / Unreachable</option>
                  <option value="WhatsApp Sent - Awaiting Reply">WhatsApp Sent — Awaiting Reply</option>
                  <option value="Customer Visited Store">Customer Visited Store</option>
                  <option value="Customer Bought">Customer Made a Purchase</option>
                  <option value="Customer Declined">Customer Declined / Lost</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Customer Response Details (Optional)</label>
                <textarea className="form-control" placeholder="What did the customer say?" value={customerResponse} onChange={(e) => setCustomerResponse(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Next Action</label>
                <input type="text" className="form-control" placeholder="e.g. Send product specs via WhatsApp" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Schedule Next Follow-up (Optional)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" className="form-control" value={nextFollowupDate} onChange={(e) => setNextFollowupDate(e.target.value)} style={{ flex: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>If a date is set, a new follow-up task will be created automatically.</span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveFollowup(null)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={completeLoading}>
                  {completeLoading ? 'Saving...' : 'Mark Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

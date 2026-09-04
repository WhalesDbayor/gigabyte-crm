'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ChevronRight, ChevronLeft, Save, Sparkles, Search, X, User, RefreshCw, AlertCircle } from 'lucide-react';

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useApp();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Lead inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [interestType, setInterestType] = useState('Laptop');
  const [specificInterest, setSpecificInterest] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [purpose, setPurpose] = useState('Programming');
  const [conditionPreference, setConditionPreference] = useState('Either');
  const [painPoint, setPainPoint] = useState('');
  const [sourceId, setSourceId] = useState('SRC-001'); // default walk-in

  // Years of patronage (optional)
  const [patronageValue, setPatronageValue] = useState('');
  const [patronageUnit, setPatronageUnit] = useState('weeks');

  // Customer search inputs
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    setCustomersError(false);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      } else {
        setCustomersError(true);
      }
    } catch (e) {
      console.error('Failed to load customers:', e);
      setCustomersError(true);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Close dropdown when clicking outside the search container
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (cust) => {
    setSelectedCustomerId(cust.customer_id);
    setSelectedCustomer(cust);
    // Handle both split-name (first_name/last_name) and single-name formats
    const fullName = cust.name || `${cust.first_name || ''} ${cust.last_name || ''}`.trim();
    setName(fullName);
    setPhone(cust.phone || '');
    setWhatsapp(cust.whatsapp || '');
    setEmail(cust.email || '');
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setSelectedCustomer(null);
    setName('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setSearchQuery('');
  };

  const filteredCustomers = searchQuery.trim().length >= 1
    ? customers.filter(c => {
        const query = searchQuery.toLowerCase().trim();
        // Support both split-name and single-name formats
        const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
        const singleName = (c.name || '').toLowerCase();
        const displayId = (c.display_id || '').toLowerCase();
        const phoneNorm = (c.phone || '').replace(/\s/g, '');
        const waPhoneNorm = (c.whatsapp || '').replace(/\s/g, '');
        const queryNorm = query.replace(/\s/g, '');
        return (
          fullName.includes(query) ||
          singleName.includes(query) ||
          displayId.includes(query) ||
          (phoneNorm && phoneNorm.includes(queryNorm)) ||
          (waPhoneNorm && waPhoneNorm.includes(queryNorm)) ||
          (c.email && c.email.toLowerCase().includes(query))
        );
      }).slice(0, 10)
    : [];

  const nextStep = () => {
    // Basic validation
    if (step === 1 && (!name || !phone)) {
      alert('Name and Phone Number are required.');
      return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  // Compute a canonical 'known since' date from the patronage field
  const computePatronageSince = () => {
    if (!patronageValue || isNaN(Number(patronageValue))) return '';
    const val = Number(patronageValue);
    const now = new Date();
    const unitMap = { days: 1, weeks: 7, months: 30, years: 365 };
    const daysBack = val * (unitMap[patronageUnit] || 1);
    now.setDate(now.getDate() - daysBack);
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const handleSubmit = async (autoQualify = false) => {
    setLoading(true);
    try {
      // 1. Save Lead
      const leadPayload = {
        customer_id: selectedCustomerId,
        name,
        phone,
        whatsapp: whatsapp || phone, // default matching phone
        email,
        interest_type: interestType,
        specific_interest: specificInterest,
        budget_min: budgetMin ? Number(budgetMin) : 0,
        budget_max: budgetMax ? Number(budgetMax) : 0,
        purpose,
        condition_preference: conditionPreference,
        pain_point: painPoint,
        source_id: sourceId,
        assigned_user_id: user?.user_id || 'usr-sales-222',
        patronage_since: computePatronageSince() // optional: ISO date of first patronage
      };

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.user_id || 'SYSTEM'
        },
        body: JSON.stringify(leadPayload)
      });
      const data = await res.json();
      
      if (!data.success) {
        alert(data.error || 'Failed to capture lead.');
        return;
      }

      // 2. Auto-qualify workflow if selected
      if (autoQualify) {
        const qualRes = await fetch('/api/leads/qualify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user?.user_id || 'SYSTEM'
          },
          body: JSON.stringify({ leadId: data.lead.lead_id })
        });
        const qualData = await qualRes.json();
        if (!qualData.success) {
          alert('Lead saved, but auto-qualification failed: ' + qualData.error);
          router.push('/leads');
          return;
        }
      }

      router.push('/leads');
    } catch (e) {
      console.error(e);
      alert('Network failure saving lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '10px 0' }}>
      <div className="card">
        {/* Progress header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Capture Walk-In Lead</h2>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Step {step} of 4</span>
        </div>

        {/* Step indicator bubbles */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              style={{ 
                flex: 1, 
                height: 4, 
                backgroundColor: s <= step ? 'var(--accent-color)' : 'var(--border-color)',
                borderRadius: 2,
                transition: 'background-color 0.3s ease'
              }} 
            />
          ))}
        </div>

        {/* Step 1: Contact details */}
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Who is the customer?</h3>
            
            {/* Customer search */}
            {!selectedCustomerId && (
              <div className="form-group" style={{ position: 'relative' }} ref={searchRef}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Search size={14} /> Search Existing Customer (Optional)
                  </span>
                  {customersLoading && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
                    </span>
                  )}
                  {customersError && !customersLoading && (
                    <button type="button" onClick={fetchCustomers} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <AlertCircle size={11} /> Retry
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={customersLoading ? 'Loading customer list…' : 'Type name, phone or email…'}
                  value={searchQuery}
                  disabled={customersLoading}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
                  autoComplete="off"
                />

                {/* Dropdown results */}
                {showDropdown && searchQuery.trim().length >= 1 && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    maxHeight: 240,
                    overflowY: 'auto'
                  }}>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(cust => (
                        <div
                          key={cust.customer_id}
                          // onMouseDown prevents the input blur from firing before onClick
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectCustomer(cust)}
                          style={{
                            padding: '11px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border-color)',
                            fontSize: 13,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-color-light)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              {cust.name || `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || '(No name)'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {cust.phone}{cust.email ? ` · ${cust.email}` : ''}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--accent-color)', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{cust.display_id}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                        No customer found for &ldquo;<strong>{searchQuery}</strong>&rdquo;
                        <div style={{ fontSize: 11, marginTop: 4 }}>Fill in the form below to add as new customer.</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Linked badge */}
            {selectedCustomerId && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--accent-color-light)',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--accent-color)',
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <User size={16} style={{ color: 'var(--accent-color)' }} />
                  <span>Linked to <strong>{name}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Aisha Bello"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
                readOnly={!!selectedCustomerId}
                style={selectedCustomerId ? { backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' } : {}}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input 
                type="tel" 
                className="form-control" 
                placeholder="e.g. 08012345678"
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required
                readOnly={!!selectedCustomerId}
                style={selectedCustomerId ? { backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' } : {}}
              />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp Number (Leave blank if same as phone)</label>
              <input 
                type="tel" 
                className="form-control" 
                placeholder="e.g. 08012345678"
                value={whatsapp} 
                onChange={(e) => setWhatsapp(e.target.value)} 
                readOnly={!!selectedCustomerId}
                style={selectedCustomerId ? { backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' } : {}}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address (Optional)</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="e.g. aisha@gmail.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                readOnly={!!selectedCustomerId}
                style={selectedCustomerId ? { backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' } : {}}
              />
            </div>

            {/* Years of Patronage — optional */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Known Us For (Optional)
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>— sets customer's patronage start date</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 2"
                  value={patronageValue}
                  onChange={(e) => setPatronageValue(e.target.value)}
                  style={{ flex: 1 }}
                />
                <select
                  className="form-control"
                  value={patronageUnit}
                  onChange={(e) => setPatronageUnit(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
              {patronageValue && !isNaN(Number(patronageValue)) && (
                <div style={{ fontSize: 11, color: 'var(--accent-color)', marginTop: 4 }}>
                  Customer has known us since: <strong>{computePatronageSince()}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Customer Interest */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>What are they interested in?</h3>
            <div className="form-group">
              <label className="form-label">Interest Category</label>
              <select className="form-control" value={interestType} onChange={(e) => setInterestType(e.target.value)}>
                <option value="Laptop">Laptop Sales</option>
                <option value="Desktop">Desktop Sales</option>
                <option value="Accessories">Accessories & Gadgets</option>
                <option value="Repair">Computer Repairs</option>
                <option value="Academy">Gigacademy Training</option>
                <option value="Workspace">Workspace Services</option>
                <option value="Other">Other Solutions</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Specific Model / Requirements (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. HP EliteBook, Core i5, 16GB RAM"
                value={specificInterest} 
                onChange={(e) => setSpecificInterest(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Condition Preference</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['New', 'Fairly used', 'Either'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, backgroundColor: conditionPreference === opt ? 'var(--accent-color-light)' : 'transparent', borderColor: conditionPreference === opt ? 'var(--accent-color)' : 'var(--border-color)', color: conditionPreference === opt ? 'var(--accent-color)' : 'inherit' }}
                    onClick={() => setConditionPreference(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Qualification Info */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Intended Use & Budget</h3>
            <div className="form-group">
              <label className="form-label">Budget range (₦)</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Min" 
                  value={budgetMin} 
                  onChange={(e) => setBudgetMin(e.target.value)} 
                />
                <span>to</span>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Max" 
                  value={budgetMax} 
                  onChange={(e) => setBudgetMax(e.target.value)} 
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Primary Intended Use</label>
              <select className="form-control" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                <option value="General use">General Office Use</option>
                <option value="School">School/Academic Work</option>
                <option value="Programming">Programming / Web Dev</option>
                <option value="Data Analysis">Data Analysis / Science</option>
                <option value="Graphics">Graphic Design / AutoCAD</option>
                <option value="Gaming">Gaming</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Lead Source</label>
              <select className="form-control" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                <option value="SRC-001">Walk-in</option>
                <option value="SRC-002">WhatsApp Enquiry</option>
                <option value="SRC-003">Instagram Lead</option>
                <option value="SRC-008">Customer Referral</option>
                <option value="SRC-016">Outbound Call</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Submission */}
        {step === 4 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Review Walk-in Details</h3>
            <div style={{ backgroundColor: 'var(--bg-primary)', padding: 16, borderRadius: 8, fontSize: 13, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div><strong>Name:</strong> {name}</div>
              <div><strong>Contact:</strong> {phone} {whatsapp ? `(WA: ${whatsapp})` : ''}</div>
              <div><strong>Interest:</strong> {interestType} {specificInterest ? `(${specificInterest})` : ''}</div>
              <div><strong>Condition:</strong> {conditionPreference}</div>
              <div><strong>Use Purpose:</strong> {purpose}</div>
              <div><strong>Budget:</strong> {budgetMin || budgetMax ? `₦${Number(budgetMin).toLocaleString()} - ₦${Number(budgetMax).toLocaleString()}` : 'Not Specified'}</div>
              {patronageValue && !isNaN(Number(patronageValue)) && (
                <div><strong>Known Since:</strong> {computePatronageSince()} <span style={{ color: 'var(--text-secondary)' }}>({patronageValue} {patronageUnit} ago)</span></div>
              )}
            </div>
            
            <div className="form-group">
              <label className="form-label">Pain Points / Specific Needs (Notes)</label>
              <textarea 
                className="form-control"
                placeholder="e.g. Computer Science student looking for a fast programming laptop with reliable battery."
                value={painPoint}
                onChange={(e) => setPainPoint(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Actions navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 24 }}>
          {step > 1 ? (
            <button type="button" className="btn btn-secondary" onClick={prevStep} style={{ flex: 1, gap: 6 }}>
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => router.push('/leads')} style={{ flex: 1 }}>
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button type="button" className="btn btn-primary" onClick={nextStep} style={{ flex: 1, gap: 6 }}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 2 }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleSubmit(true)}
                disabled={loading}
                style={{ gap: 8 }}
              >
                <Sparkles size={16} /> {loading ? 'Processing...' : 'Save & Qualify Immediately'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => handleSubmit(false)}
                disabled={loading}
                style={{ gap: 8 }}
              >
                <Save size={16} /> {loading ? 'Saving...' : 'Save as New Lead'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

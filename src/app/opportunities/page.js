'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Target, CheckCircle2, XCircle, Calendar, Plus, MessageSquare, AlertCircle, ShoppingCart, Phone } from 'lucide-react';

export default function OpportunitiesPage() {
  const { user } = useApp();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('ALL');
  
  // Modals state
  const [activeOpp, setActiveOpp] = useState(null);
  const [modalType, setModalType] = useState(null); // 'WIN' | 'LOSE' | 'CUSTOMER'
  const [activeCustomer, setActiveCustomer] = useState(null);

  // Customer map
  const [customers, setCustomers] = useState({});
  
  // WON Form fields
  const [winPrice, setWinPrice] = useState('');
  const [winQty, setWinQty] = useState('1');
  const [winDiscount, setWinDiscount] = useState('0');
  const [winPayStatus, setWinPayStatus] = useState('Paid');
  const [winDelStatus, setWinDelStatus] = useState('Delivered');
  const [winTxRef, setWinTxRef] = useState('');
  const [winLoading, setWinLoading] = useState(false);

  // LOST Form fields
  const [lostReason, setLostReason] = useState('Price Too High');
  const [lostCompetitor, setLostCompetitor] = useState('');
  const [lostCompPrice, setLostCompPrice] = useState('0');
  const [lostNotes, setLostNotes] = useState('');
  const [loseLoading, setLoseLoading] = useState(false);

  useEffect(() => {
    fetchOpportunities();
    fetchCustomers();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/opportunities');
      const data = await res.json();
      if (data.success) {
        setOpportunities(data.opportunities || []);
      }
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
      if (data.success && Array.isArray(data.customers)) {
        const map = {};
        data.customers.forEach(c => {
          map[c.customer_id] = c;
        });
        setCustomers(map);
      }
    } catch (e) {
      console.error('Failed to load customers', e);
    }
  };

  const handleWinSubmit = async (e) => {
    e.preventDefault();
    if (!activeOpp) return;
    setWinLoading(true);

    try {
      const res = await fetch('/api/opportunities/win', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.user_id || 'SYSTEM'
        },
        body: JSON.stringify({
          opportunityId: activeOpp.opportunity_id,
          saleData: {
            unit_price: Number(winPrice || activeOpp.estimated_value),
            quantity: Number(winQty),
            discount: Number(winDiscount),
            payment_status: winPayStatus,
            delivery_status: winDelStatus,
            transaction_reference: winTxRef
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Opportunity closed as WON! Sale recorded.');
        closeModals();
        fetchOpportunities();
      } else {
        alert(data.error || 'Failed to record won opportunity');
      }
    } catch (error) {
      alert('Connection error recording sale.');
    } finally {
      setWinLoading(false);
    }
  };

  const handleLoseSubmit = async (e) => {
    e.preventDefault();
    if (!activeOpp) return;
    if (!lostReason) {
      alert('Please select a valid lost reason.');
      return;
    }
    setLoseLoading(true);

    try {
      const res = await fetch('/api/opportunities/lost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.user_id || 'SYSTEM'
        },
        body: JSON.stringify({
          opportunityId: activeOpp.opportunity_id,
          lostData: {
            lost_reason_id: lostReason,
            competitor: lostCompetitor,
            competitor_price: Number(lostCompPrice || 0),
            notes: lostNotes
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Opportunity closed as LOST.');
        closeModals();
        fetchOpportunities();
      } else {
        alert(data.error || 'Failed to record lost details');
      }
    } catch (err) {
      alert('Connection error.');
    } finally {
      setLoseLoading(false);
    }
  };

  const openModal = (opp, type) => {
    setActiveOpp(opp);
    setModalType(type);
    if (type === 'WIN') {
      setWinPrice(opp.estimated_value);
      setWinQty('1');
      setWinDiscount('0');
      setWinPayStatus('Paid');
      setWinDelStatus('Delivered');
      setWinTxRef('');
    } else {
      setLostReason('Price Too High');
      setLostCompetitor('');
      setLostCompPrice('0');
      setLostNotes('');
    }
  };

  const closeModals = () => {
    setActiveOpp(null);
    setModalType(null);
    setActiveCustomer(null);
  };

  const filteredOpps = opportunities.filter(opp => {
    if (stageFilter === 'ALL') return true;
    return opp.stage === stageFilter;
  });

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Sales Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Manage client transactions, negotiations, and conversions.</p>
        </div>
      </div>

      {/* Stage Selector (Responsive filter bar) */}
      <div className="card" style={{ padding: 12, overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: 8, marginBottom: 20 }}>
        {['ALL', 'NEW', 'CONTACTED', 'RECOMMENDATION_SENT', 'NEGOTIATION', 'PAYMENT_PENDING', 'WON', 'LOST'].map(stage => (
          <button
            key={stage}
            onClick={() => setStageFilter(stage)}
            className="btn btn-secondary"
            style={{ 
              height: 34, 
              fontSize: 12, 
              padding: '0 12px',
              backgroundColor: stageFilter === stage ? 'var(--accent-color-light)' : 'transparent',
              borderColor: stageFilter === stage ? 'var(--accent-color)' : 'var(--border-color)',
              color: stageFilter === stage ? 'var(--accent-color)' : 'inherit',
              borderRadius: 20
            }}
          >
            {stage.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading Pipeline...</div>
      ) : filteredOpps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 12 }}>
          <AlertCircle size={32} style={{ marginBottom: 12, color: 'var(--text-tertiary)' }} />
          <p>No active opportunities in this stage.</p>
        </div>
      ) : (
        <div className="grid-1">
          {filteredOpps.map(opp => (
            <div className="card" key={opp.opportunity_id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{opp.display_id}</span>
                  <span className={`badge badge-${opp.stage.toLowerCase()}`}>{opp.stage.replace('_', ' ')}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Prob: {opp.probability}%
                  </span>
                </div>
                
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{opp.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Estimated Value: <strong style={{ color: 'var(--text-primary)' }}>₦{parseFloat(opp.estimated_value || 0).toLocaleString()}</strong>
                </p>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 8 }}>
                  <strong>Customer:</strong> {customers[opp.customer_id] ? (
                    <span
                      className="badge badge-primary clickable-cust"
                      onClick={() => {
                        setActiveCustomer(customers[opp.customer_id]);
                        setModalType('CUSTOMER');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {customers[opp.customer_id].first_name} {customers[opp.customer_id].last_name}
                    </span>
                  ) : `New Lead`}
                  {customers[opp.customer_id] && customers[opp.customer_id].phone && (
                    <div style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 12 }}>
                      <Phone size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{customers[opp.customer_id].phone}
                    </div>
                  )}
                  {opp.notes && <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Note: {opp.notes}</div>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <Calendar size={14} />
                  <span>Expected Close: {opp.expected_close_date || 'Not Set'}</span>
                </div>
              </div>

              {/* Action Buttons for pipeline movement */}
              {opp.stage !== 'WON' && opp.stage !== 'LOST' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 140, justifyContent: 'center' }}>
                  <button 
                    onClick={() => openModal(opp, 'WIN')}
                    className="btn btn-primary"
                    style={{ height: 35, fontSize: 12, gap: 6 }}
                  >
                    <CheckCircle2 size={14} /> Mark WON
                  </button>
                  <button 
                    onClick={() => openModal(opp, 'LOSE')}
                    className="btn btn-secondary"
                    style={{ height: 35, fontSize: 12, color: 'var(--color-danger)', borderColor: 'var(--color-danger)', gap: 6 }}
                  >
                    <XCircle size={14} /> Close LOST
                  </button>
                  <Link href={`/followups?oppId=${opp.opportunity_id}`} className="btn btn-secondary" style={{ height: 35, fontSize: 11, justifyContent: 'center', padding: 0 }}>
                    Schedule Contact
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* WON SALE MODAL OVERLAY */}
      {modalType === 'WIN' && activeOpp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ maxWidth: 450, width: '100%', margin: 0, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart style={{ color: 'var(--accent-color)' }} /> Record Successful Sale
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Specify the actual sales transaction figures to close opportunity <strong>{activeOpp.display_id}</strong>.
            </p>
            
            <form onSubmit={handleWinSubmit}>
              <div className="form-group">
                <label className="form-label">Selling Unit Price (₦) *</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={winPrice} 
                  onChange={(e) => setWinPrice(e.target.value)} 
                  required 
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={winQty} 
                    onChange={(e) => setWinQty(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Applied (₦)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={winDiscount} 
                    onChange={(e) => setWinDiscount(e.target.value)} 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select className="form-control" value={winPayStatus} onChange={(e) => setWinPayStatus(e.target.value)}>
                  <option value="Paid">Fully Paid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Pending">Payment Pending</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Status</label>
                <select className="form-control" value={winDelStatus} onChange={(e) => setWinDelStatus(e.target.value)}>
                  <option value="Delivered">Delivered</option>
                  <option value="Pending">Pending Delivery</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Transaction Reference (Optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Bank Transfer ID, POS reference"
                  value={winTxRef} 
                  onChange={(e) => setWinTxRef(e.target.value)} 
                />
              </div>
              
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={closeModals} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={winLoading}>
                  {winLoading ? 'Recording sale...' : 'Confirm Sale (WON)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOST DETAILS MODAL OVERLAY */}
      {modalType === 'LOSE' && activeOpp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ maxWidth: 450, width: '100%', margin: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: 'var(--color-danger)' }}>
              Document Lost Opportunity
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              To maintain data integrity, you must capture the reason why this sale failed.
            </p>
            
            <form onSubmit={handleLoseSubmit}>
              <div className="form-group">
                <label className="form-label">Lost Reason *</label>
                <select className="form-control" value={lostReason} onChange={(e) => setLostReason(e.target.value)} required>
                  <option value="Price Too High">Price Too High</option>
                  <option value="Bought Elsewhere">Bought Elsewhere / Competitor</option>
                  <option value="Product Unavailable">Product Out of Stock / Unavailable</option>
                  <option value="Customer Not Ready">Customer Not Ready / Reactivate later</option>
                  <option value="Payment Issue">Payment/Finance issue</option>
                  <option value="Changed Mind">Changed Mind</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Known Competitor name (Optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Kara, Slot, Jumia" 
                  value={lostCompetitor}
                  onChange={(e) => setLostCompetitor(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Competitor Price (₦ if known)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={lostCompPrice}
                  onChange={(e) => setLostCompPrice(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Additional notes / Explanation</label>
                <textarea 
                  className="form-control" 
                  placeholder="Describe context (required if 'Other' selected)"
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  required={lostReason === 'Other'}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={closeModals} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ flex: 2 }} disabled={loseLoading}>
                  {loseLoading ? 'Submitting...' : 'Mark Lost'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAIL MODAL OVERLAY */}
      {modalType === 'CUSTOMER' && activeCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ maxWidth: 350, width: '100%', margin: 0, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone style={{ color: 'var(--accent-color)' }} /> Customer Details
            </h3>
            <p style={{ fontSize: 14, marginBottom: 8 }}><strong>Name:</strong> {activeCustomer.first_name} {activeCustomer.last_name}</p>
            <p style={{ fontSize: 14 }}><strong>Phone:</strong> <a href={`tel:${activeCustomer.phone}`} style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>{activeCustomer.phone}</a></p>
            <button className="btn btn-secondary" onClick={closeModals} style={{ marginTop: 16, width: '100%' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

import { readSheet, appendRow, updateRow } from '../lib/google-sheets';

// Helper to generate UUIDs locally
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper to generate sequential human-readable IDs
async function generateNextDisplayId(sheetName, prefix) {
  try {
    const rows = await readSheet(sheetName);
    let maxNum = 0;
    const regex = new RegExp(`^${prefix}-(\\d+)$`);

    rows.forEach(row => {
      const match = String(row.display_id || '').match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    });

    return `${prefix}-${String(maxNum + 1).padStart(6, '0')}`;
  } catch (error) {
    console.error(`Failed to generate ID for ${sheetName}:`, error);
    return `${prefix}-000001`; // Fallback
  }
}

// Log an activity in the audit logs and activity timeline
export async function logActivity({ customerId, leadId, opportunityId, userId, type, description, outcome }) {
  const activity = {
    activity_id: generateUUID(),
    customer_id: customerId || '',
    lead_id: leadId || '',
    opportunity_id: opportunityId || '',
    user_id: userId || 'SYSTEM',
    activity_type: type,
    description: description || '',
    outcome: outcome || '',
    timestamp: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  try {
    await appendRow('07_Activities', activity);
  } catch (e) {
    console.error('Failed to log activity row:', e);
  }

  // Also write to audit trail
  const audit = {
    audit_id: generateUUID(),
    user_id: userId || 'SYSTEM',
    action: type,
    entity_type: leadId ? 'Lead' : opportunityId ? 'Opportunity' : customerId ? 'Customer' : 'System',
    entity_id: leadId || opportunityId || customerId || 'SYSTEM',
    field_changed: '',
    old_value: '',
    new_value: description || '',
    timestamp: new Date().toISOString(),
    ip_device_reference: 'CRM-Server'
  };

  try {
    await appendRow('16_AuditLogs', audit);
  } catch (e) {
    console.error('Failed to write audit log row:', e);
  }

  return activity;
}

// --- LEADS ---
export async function getLeads() {
  return await readSheet('04_Leads');
}

export async function createLead(leadData, userId) {
  const leadId = generateUUID();
  const displayId = await generateNextDisplayId('04_Leads', 'LEAD');
  const now = new Date().toISOString();

  // --- CUSTOMER UPSERT ---
  // If the salesperson linked an existing customer, use that customer_id.
  // Otherwise, check if a customer with the same phone/email already exists
  // (prevents duplicates). If truly new, create a customer record immediately
  // so they appear in future searches from lead capture step 1.
  let customerId = leadData.customer_id || '';

  if (!customerId) {
    const customers = await getCustomers();
    const existingCust = customers.find(c => {
      const cPhoneNorm = normalizePhone(c.phone);
      const leadPhoneNorm = normalizePhone(leadData.phone);
      const cWANorm = normalizePhone(c.whatsapp);
      const leadWANorm = normalizePhone(leadData.whatsapp);
      const phoneMatch = leadPhoneNorm && cPhoneNorm && cPhoneNorm === leadPhoneNorm;
      const waMatch = leadWANorm && cWANorm && cWANorm === leadWANorm;
      const emailMatch = leadData.email && c.email &&
        c.email.toLowerCase().trim() === leadData.email.toLowerCase().trim() &&
        leadData.email.trim() !== '';
      return phoneMatch || waMatch || emailMatch;
    });

    if (existingCust) {
      // Existing customer found — link this lead to them (no new record created)
      customerId = existingCust.customer_id;
    } else {
      // New customer — create a record now so they're searchable on next visit
      const nameParts = (leadData.name || '').trim().split(/\s+/);
      const custDisplayId = await generateNextDisplayId('03_Customers', 'CUS');
      const newCust = {
        customer_id: generateUUID(),
        display_id: custDisplayId,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        phone: leadData.phone || '',
        whatsapp: leadData.whatsapp || '',
        email: leadData.email || '',
        gender: '',
        location: '',
        customer_type: 'Individual',
        occupation: '',
        organization: '',
        source_id: leadData.source_id || 'SRC-001',
        assigned_user_id: leadData.assigned_user_id || userId || 'SYSTEM',
        customer_status: 'ACTIVE',
        notes: '',
        patronage_since: leadData.patronage_since || now.split('T')[0],
        created_at: now,
        updated_at: now
      };
      await appendRow('03_Customers', newCust);
      customerId = newCust.customer_id;

      await logActivity({
        customerId,
        userId,
        type: 'CUSTOMER_CREATED',
        description: `Auto-created customer record ${custDisplayId} (${leadData.name}) during lead capture.`,
        outcome: 'Success'
      });
    }
  }

  const newLead = {
    lead_id: leadId,
    display_id: displayId,
    customer_id: customerId,
    name: leadData.name || '',
    phone: leadData.phone || '',
    whatsapp: leadData.whatsapp || '',
    email: leadData.email || '',
    source_id: leadData.source_id || 'SRC-001',
    campaign_id: leadData.campaign_id || '',
    interest_type: leadData.interest_type || 'Laptop',
    specific_interest: leadData.specific_interest || '',
    budget_min: leadData.budget_min || '',
    budget_max: leadData.budget_max || '',
    purpose: leadData.purpose || '',
    condition_preference: leadData.condition_preference || '',
    pain_point: leadData.pain_point || '',
    patronage_since: leadData.patronage_since || '',
    assigned_user_id: leadData.assigned_user_id || userId || 'SYSTEM',
    status: 'NEW',
    temperature: leadData.temperature || 'WARM',
    created_at: now,
    updated_at: now
  };

  await appendRow('04_Leads', newLead);
  await logActivity({
    leadId,
    customerId,
    userId,
    type: 'LEAD_CREATED',
    description: `Created lead ${displayId} (${newLead.name}) interested in ${newLead.interest_type}.`,
    outcome: 'Success'
  });

  // Automatically schedule initial contact follow-up
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + 1);
  await createFollowup({
    lead_id: leadId,
    customer_id: customerId,
    assigned_user_id: newLead.assigned_user_id,
    due_date: followUpDate.toISOString().split('T')[0],
    due_time: '10:00',
    method: newLead.whatsapp ? 'WhatsApp' : 'Phone Call',
    type: 'Initial Contact',
    notes: 'Initial follow-up call scheduled automatically on lead capture.'
  }, userId);

  return newLead;
}

function normalizePhone(num) {
  if (!num) return '';
  const cleaned = String(num).replace(/\D/g, '');
  return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
}

export async function qualifyLead(leadId, userId) {
  const leads = await getLeads();
  const lead = leads.find(l => l.lead_id === leadId);
  if (!lead) throw new Error('Lead not found');

  if (lead.status === 'QUALIFIED' || lead.status === 'CONVERTED') {
    throw new Error('Lead is already qualified/converted.');
  }

  const now = new Date().toISOString();
  let customerId = lead.customer_id;

  // 1. Duplicate detection: Check if customer already exists by phone/whatsapp/email
  if (!customerId) {
    const customers = await getCustomers();
    const existingCust = customers.find(c => {
      const cPhoneNorm = normalizePhone(c.phone);
      const leadPhoneNorm = normalizePhone(lead.phone);
      const cWANorm = normalizePhone(c.whatsapp);
      const leadWANorm = normalizePhone(lead.whatsapp);

      const phoneMatch = leadPhoneNorm && cPhoneNorm && cPhoneNorm === leadPhoneNorm;
      const waMatch = leadWANorm && cWANorm && cWANorm === leadWANorm;
      const emailMatch = lead.email && c.email && c.email.toLowerCase().trim() === lead.email.toLowerCase().trim() && lead.email.trim() !== '';

      return phoneMatch || waMatch || emailMatch;
    });

    if (existingCust) {
      customerId = existingCust.customer_id;
    } else {
      // 2. Create customer if not exists
      const custDisplayId = await generateNextDisplayId('03_Customers', 'CUS');
      const newCust = {
        customer_id: generateUUID(),
        display_id: custDisplayId,
        first_name: lead.name.split(' ')[0] || '',
        last_name: lead.name.split(' ').slice(1).join(' ') || '',
        phone: lead.phone,
        whatsapp: lead.whatsapp,
        email: lead.email,
        gender: '',
        location: '',
        customer_type: 'Individual',
        occupation: '',
        organization: '',
        source_id: lead.source_id,
        assigned_user_id: lead.assigned_user_id || userId || 'SYSTEM',
        customer_status: 'ACTIVE',
        notes: lead.pain_point || '',
        // Patronage start date — if the salesperson recorded prior patronage, use that date;
        // otherwise fall back to today. This is the permanent "known since" anchor.
        patronage_since: lead.patronage_since || now.split('T')[0],
        created_at: now,
        updated_at: now
      };
      await appendRow('03_Customers', newCust);
      customerId = newCust.customer_id;

      await logActivity({
        customerId,
        userId,
        type: 'CUSTOMER_CREATED',
        description: `Created customer record ${custDisplayId} during lead qualification.`,
        outcome: 'Success'
      });
    }
  }

  // 3. Create Opportunity
  const oppDisplayId = await generateNextDisplayId('05_Opportunities', 'OPP');
  const oppId = generateUUID();
  const estimatedValue = lead.budget_max || lead.budget_min || 0;

  const newOpp = {
    opportunity_id: oppId,
    display_id: oppDisplayId,
    customer_id: customerId,
    lead_id: leadId,
    title: `${lead.interest_type} enquiry`,
    category: lead.interest_type || 'Laptop',
    product_id: '',
    quantity: '1',
    estimated_value: String(estimatedValue),
    budget: String(estimatedValue),
    stage: 'NEW',
    probability: '5', // 5% for NEW stage
    expected_close_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    assigned_user_id: lead.assigned_user_id || userId || 'SYSTEM',
    campaign_id: lead.campaign_id || '',
    source_id: lead.source_id || '',
    lost_reason_id: '',
    competitor: '',
    competitor_price: '',
    notes: lead.pain_point || '',
    created_at: now,
    updated_at: now
  };

  await appendRow('05_Opportunities', newOpp);

  // 4. Update Lead Status
  await updateRow('04_Leads', 'lead_id', leadId, {
    status: 'QUALIFIED',
    customer_id: customerId,
    updated_at: now
  });

  await logActivity({
    customerId,
    leadId,
    opportunityId: oppId,
    userId,
    type: 'LEAD_QUALIFIED',
    description: `Lead qualified. Created Opportunity ${oppDisplayId}.`,
    outcome: 'Success'
  });

  // Schedule follow-up for the new opportunity
  const oppFollowUpDate = new Date();
  oppFollowUpDate.setDate(oppFollowUpDate.getDate() + 2); // Follow up in 2 days
  await createFollowup({
    customer_id: customerId,
    opportunity_id: oppId,
    assigned_user_id: newOpp.assigned_user_id,
    due_date: oppFollowUpDate.toISOString().split('T')[0],
    due_time: '11:00',
    method: lead.whatsapp ? 'WhatsApp' : 'Phone Call',
    type: 'Recommendation Follow-up',
    notes: `Follow up on qualified opportunity ${oppDisplayId}.`
  }, userId);

  return { customerId, opportunityId: oppId }

// --- DELETE LEAD AND ASSOCIATED DATA ---
export async function deleteLead(leadId, userId) {
  // Fetch lead to get related IDs
  const leads = await getLeads();
  const lead = leads.find(l => l.lead_id === leadId);
  if (!lead) throw new Error('Lead not found');

  const now = new Date().toISOString();
  const customerId = lead.customer_id;

  // Helper to filter rows and overwrite sheet
  async function filterAndOverwrite(sheetName, filterFn) {
    const rows = await readSheet(sheetName);
    // Preserve header row format by reading raw values
    const config = getCredentials();
    const service = getSheetsClient();
    const response = await service.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${sheetName}!A:Z`
    });
    const rawRows = response.data.values || [];
    const header = rawRows[0];
    const dataRows = rawRows.slice(1).filter(filterFn);
    const newValues = [header, ...dataRows];
    await service.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: newValues }
    });
  }

  // Delete lead row
  await filterAndOverwrite('04_Leads', row => row[0] !== leadId);

  // Delete related opportunities (where lead_id matches column 3 or opportunity_id)
  await filterAndOverwrite('05_Opportunities', row => row[3] !== leadId);

  // Delete related followups (lead_id or opportunity_id)
  await filterAndOverwrite('06_Followups', row => {
    const leadCol = row[3];
    const oppCol = row[4];
    return leadCol !== leadId && oppCol !== leadId;
  });

  // Delete activities related to this lead
  await filterAndOverwrite('07_Activities', row => row[2] !== leadId);

  // Log deletion activity
  await logActivity({
    leadId,
    customerId,
    userId,
    type: 'LEAD_DELETED',
    description: `Deleted lead ${lead.display_id || leadId} and associated data.`,
    outcome: 'Success'
  });

  return { success: true };
}

// --- CUSTOMERS ---
export async function getCustomers() {
  return await readSheet('03_Customers');
}

export async function createCustomer(custData, userId) {
  const customerId = generateUUID();
  const displayId = await generateNextDisplayId('03_Customers', 'CUS');
  const now = new Date().toISOString();

  const newCust = {
    customer_id: customerId,
    display_id: displayId,
    first_name: custData.first_name || '',
    last_name: custData.last_name || '',
    phone: custData.phone || '',
    whatsapp: custData.whatsapp || '',
    email: custData.email || '',
    gender: custData.gender || '',
    location: custData.location || '',
    customer_type: custData.customer_type || 'Individual',
    occupation: custData.occupation || '',
    organization: custData.organization || '',
    source_id: custData.source_id || 'SRC-001',
    assigned_user_id: custData.assigned_user_id || userId || 'SYSTEM',
    customer_status: 'ACTIVE',
    notes: custData.notes || '',
    created_at: now,
    updated_at: now
  };

  await appendRow('03_Customers', newCust);
  await logActivity({
    customerId,
    userId,
    type: 'CUSTOMER_CREATED',
    description: `Manually created customer ${displayId} (${newCust.first_name} ${newCust.last_name}).`,
    outcome: 'Success'
  });

  return newCust;
}

export async function updateCustomer(customerId, updatedData, userId) {
  const now = new Date().toISOString();
  const res = await updateRow('03_Customers', 'customer_id', customerId, {
    ...updatedData,
    updated_at: now
  });

  await logActivity({
    customerId,
    userId,
    type: 'CUSTOMER_UPDATED',
    description: `Updated customer profile.`,
    outcome: 'Success'
  });

  return res;
}

// --- OPPORTUNITIES ---
export async function getOpportunities() {
  return await readSheet('05_Opportunities');
}

const STAGE_PROBABILITIES = {
  'NEW': '5',
  'CONTACTED': '10',
  'QUALIFIED': '25',
  'RECOMMENDATION_SENT': '40',
  'QUOTE_SENT': '55',
  'NEGOTIATION': '70',
  'PAYMENT_PENDING': '90',
  'WON': '100',
  'LOST': '0',
  'NOT_READY': '0'
};

export async function createOpportunity(oppData, userId) {
  const oppId = generateUUID();
  const displayId = await generateNextDisplayId('05_Opportunities', 'OPP');
  const now = new Date().toISOString();

  const newOpp = {
    opportunity_id: oppId,
    display_id: displayId,
    customer_id: oppData.customer_id,
    lead_id: oppData.lead_id || '',
    title: oppData.title || 'Opportunity',
    category: oppData.category || 'Laptop',
    product_id: oppData.product_id || '',
    quantity: String(oppData.quantity || '1'),
    estimated_value: String(oppData.estimated_value || '0'),
    budget: String(oppData.budget || '0'),
    stage: oppData.stage || 'NEW',
    probability: STAGE_PROBABILITIES[oppData.stage || 'NEW'] || '5',
    expected_close_date: oppData.expected_close_date || '',
    assigned_user_id: oppData.assigned_user_id || userId || 'SYSTEM',
    campaign_id: oppData.campaign_id || '',
    source_id: oppData.source_id || '',
    lost_reason_id: '',
    competitor: '',
    competitor_price: '',
    notes: oppData.notes || '',
    created_at: now,
    updated_at: now
  };

  await appendRow('05_Opportunities', newOpp);
  await logActivity({
    customerId: newOpp.customer_id,
    opportunityId: oppId,
    userId,
    type: 'OPPORTUNITY_CREATED',
    description: `Created opportunity ${displayId}: ${newOpp.title} (Value: ₦${parseFloat(newOpp.estimated_value).toLocaleString()}).`,
    outcome: 'Success'
  });

  return newOpp;
}

export async function updateOpportunityStage(oppId, stage, userId) {
  const now = new Date().toISOString();
  const probability = STAGE_PROBABILITIES[stage] || '0';

  const opportunities = await getOpportunities();
  const opp = opportunities.find(o => o.opportunity_id === oppId);
  if (!opp) throw new Error('Opportunity not found');

  const oldStage = opp.stage;
  const updated = await updateRow('05_Opportunities', 'opportunity_id', oppId, {
    stage,
    probability,
    updated_at: now
  });

  await logActivity({
    customerId: opp.customer_id,
    opportunityId: oppId,
    userId,
    type: 'STAGE_CHANGED',
    description: `Changed stage of opportunity ${opp.display_id} from ${oldStage} to ${stage}.`,
    outcome: 'Success'
  });

  return updated;
}

export async function winOpportunity(oppId, saleData, userId) {
  const opportunities = await getOpportunities();
  const opp = opportunities.find(o => o.opportunity_id === oppId);
  if (!opp) throw new Error('Opportunity not found');

  const now = new Date().toISOString();

  // 1. Update Opportunity Stage to WON
  await updateRow('05_Opportunities', 'opportunity_id', oppId, {
    stage: 'WON',
    probability: '100',
    product_id: saleData.product_id || opp.product_id,
    updated_at: now
  });

  // 2. Record the completed Sale
  const saleId = generateUUID();
  const saleDisplayId = await generateNextDisplayId('08_Sales', 'SALE');
  const amount = parseFloat(saleData.unit_price || opp.estimated_value) * parseFloat(saleData.quantity || 1) - parseFloat(saleData.discount || 0);

  const sale = {
    sale_id: saleId,
    display_id: saleDisplayId,
    customer_id: opp.customer_id,
    opportunity_id: oppId,
    product_id: saleData.product_id || opp.product_id || '',
    quantity: String(saleData.quantity || '1'),
    unit_price: String(saleData.unit_price || opp.estimated_value),
    discount: String(saleData.discount || '0'),
    total_amount: String(amount),
    salesperson_id: opp.assigned_user_id || userId || 'SYSTEM',
    source_id: opp.source_id,
    campaign_id: opp.campaign_id,
    payment_status: saleData.payment_status || 'Paid',
    delivery_status: saleData.delivery_status || 'Delivered',
    transaction_reference: saleData.transaction_reference || '',
    sale_date: now,
    created_at: now
  };

  await appendRow('08_Sales', sale);

  await logActivity({
    customerId: opp.customer_id,
    opportunityId: oppId,
    userId,
    type: 'SALE_RECORDED',
    description: `Closed opportunity ${opp.display_id} as WON. Recorded sale ${saleDisplayId} (₦${amount.toLocaleString()}).`,
    outcome: 'Success'
  });

  // 3. Update Lead to CONVERTED (if lead_id exists)
  if (opp.lead_id) {
    await updateRow('04_Leads', 'lead_id', opp.lead_id, {
      status: 'CONVERTED',
      updated_at: now
    });
  }

  // 4. Automatically schedule after-sales checks: Delivery follow-up & Referral request
  const afterSalesDate = new Date();
  afterSalesDate.setDate(afterSalesDate.getDate() + 3); // 3 days later
  await createFollowup({
    customer_id: opp.customer_id,
    opportunity_id: oppId,
    assigned_user_id: opp.assigned_user_id,
    due_date: afterSalesDate.toISOString().split('T')[0],
    due_time: '12:00',
    method: 'WhatsApp',
    type: 'After-Sales',
    notes: `Perform after-sales check-in for purchase ${saleDisplayId}. Ask if they're satisfied, and request a referral.`
  }, userId);

  return sale;
}

export async function loseOpportunity(oppId, lostData, userId) {
  if (!lostData.lost_reason_id || lostData.lost_reason_id.trim() === '') {
    throw new Error('Lost Reason is required to close an opportunity as LOST.');
  }

  const opportunities = await getOpportunities();
  const opp = opportunities.find(o => o.opportunity_id === oppId);
  if (!opp) throw new Error('Opportunity not found');

  const now = new Date().toISOString();

  // Update Opportunity to LOST
  const updated = await updateRow('05_Opportunities', 'opportunity_id', oppId, {
    stage: 'LOST',
    probability: '0',
    lost_reason_id: lostData.lost_reason_id,
    competitor: lostData.competitor || '',
    competitor_price: lostData.competitor_price || '0',
    notes: `${opp.notes || ''}\nLost notes: ${lostData.notes || ''}`.trim(),
    updated_at: now
  });

  await logActivity({
    customerId: opp.customer_id,
    opportunityId: oppId,
    userId,
    type: 'OPPORTUNITY_LOST',
    description: `Opportunity ${opp.display_id} closed as LOST. Reason: ${lostData.lost_reason_id}.`,
    outcome: 'Success'
  });

  // If lost due to "Customer Not Ready", schedule reactivation follow-up in 30 days
  if (lostData.lost_reason_id === 'Customer Could Not Afford' || lostData.lost_reason_id === 'Customer Not Ready') {
    const reactivationDate = new Date();
    reactivationDate.setDate(reactivationDate.getDate() + 30);
    await createFollowup({
      customer_id: opp.customer_id,
      opportunity_id: oppId,
      assigned_user_id: opp.assigned_user_id,
      due_date: reactivationDate.toISOString().split('T')[0],
      due_time: '10:00',
      method: 'WhatsApp',
      type: 'Lost Lead Reactivation',
      notes: `Reactivate lost lead ${opp.display_id}. Customer was previously not ready / budget constrained.`
    }, userId);
  }

  return updated;
}

// --- FOLLOW-UPS ---
export async function getFollowups() {
  const followups = await readSheet('06_Followups');
  const customers = await readSheet('03_Customers');
  const leads = await readSheet('04_Leads');
  const opportunities = await readSheet('05_Opportunities');

  const customerMap = new Map(customers.map(c => [c.customer_id, c]));
  const leadMap = new Map(leads.map(l => [l.lead_id, l]));
  const oppMap = new Map(opportunities.map(o => [o.opportunity_id, o]));

  return followups.map(fup => {
    const cust = customerMap.get(fup.customer_id) || null;
    const lead = leadMap.get(fup.lead_id) || null;
    const opp = oppMap.get(fup.opportunity_id) || null;

    let customerName = 'Unknown Customer';
    let customerPhone = '';
    let customerEmail = '';
    let interestDetail = '';

    if (cust) {
      customerName = `${cust.first_name} ${cust.last_name}`.trim();
      customerPhone = cust.phone || '';
      customerEmail = cust.email || '';
    } else if (lead) {
      customerName = lead.name || '';
      customerPhone = lead.phone || '';
      customerEmail = lead.email || '';
    }

    if (opp) {
      interestDetail = `${opp.category || 'Enquiry'} - ${opp.title || ''}`;
    } else if (lead) {
      interestDetail = `${lead.interest_type || 'Enquiry'} - ${lead.specific_interest || ''}`;
    }

    return {
      ...fup,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      interest_detail: interestDetail,
      patronage_since: cust?.patronage_since || '' // "known since" date for live patronage display
    };
  });
}

export async function createFollowup(fupData, userId) {
  const followupId = generateUUID();
  const displayId = await generateNextDisplayId('06_Followups', 'FUP');
  const now = new Date().toISOString();

  const newFup = {
    followup_id: followupId,
    display_id: displayId,
    customer_id: fupData.customer_id || '',
    lead_id: fupData.lead_id || '',
    opportunity_id: fupData.opportunity_id || '',
    assigned_user_id: fupData.assigned_user_id || userId || 'SYSTEM',
    due_date: fupData.due_date || '',
    due_time: fupData.due_time || '',
    method: fupData.method || 'Phone Call',
    type: fupData.type || 'Initial Contact',
    status: 'Pending',
    outcome: '',
    customer_response: '',
    next_action: '',
    next_followup_date: '',
    completed_at: '',
    created_at: now,
    updated_at: now
  };

  await appendRow('06_Followups', newFup);
  return newFup;
}

export async function completeFollowup(fupId, outcomeData, userId) {
  if (!outcomeData.outcome || outcomeData.outcome.trim() === '') {
    throw new Error('Follow-up outcome is required to mark it completed.');
  }

  const followups = await getFollowups();
  const fup = followups.find(f => f.followup_id === fupId);
  if (!fup) throw new Error('Followup not found');

  const now = new Date().toISOString();

  // Update followup record
  const updated = await updateRow('06_Followups', 'followup_id', fupId, {
    status: 'Completed',
    outcome: outcomeData.outcome,
    customer_response: outcomeData.customer_response || '',
    next_action: outcomeData.next_action || '',
    next_followup_date: outcomeData.next_followup_date || '',
    completed_at: now,
    updated_at: now
  });

  await logActivity({
    customerId: fup.customer_id,
    leadId: fup.lead_id,
    opportunityId: fup.opportunity_id,
    userId,
    type: 'FOLLOWUP_COMPLETED',
    description: `Completed follow-up ${fup.display_id} (${fup.type}). Outcome: ${outcomeData.outcome}`,
    outcome: 'Success'
  });

  // If next follow-up is requested/scheduled, create it automatically
  if (outcomeData.next_followup_date) {
    await createFollowup({
      customer_id: fup.customer_id,
      lead_id: fup.lead_id,
      opportunity_id: fup.opportunity_id,
      assigned_user_id: fup.assigned_user_id,
      due_date: outcomeData.next_followup_date,
      due_time: '10:00',
      method: fup.method,
      type: fup.type,
      notes: outcomeData.next_action || 'Follow up as scheduled.'
    }, userId);
  }

  return updated;
}

// --- SALES ---
export async function getSales() {
  return await readSheet('08_Sales');
}

// --- USERS ---
export async function getUsers() {
  return await readSheet('01_Users');
}

// --- DASHBOARDS & METRICS ---
export async function getDashboardMetrics() {
  const sales = await getSales();
  const leads = await getLeads();
  const opportunities = await getOpportunities();
  const followups = await getFollowups();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = now.toISOString().slice(0, 7); // YYYY-MM

  // 1. Sales Calculations
  let todaySales = 0;
  let monthlySales = 0;
  let totalRevenue = 0;

  sales.forEach(sale => {
    const saleDateStr = String(sale.sale_date || '').split('T')[0];
    const saleMonthStr = String(sale.sale_date || '').slice(0, 7);
    const amount = parseFloat(sale.total_amount || 0);

    totalRevenue += amount;
    if (saleDateStr === todayStr) {
      todaySales += amount;
    }
    if (saleMonthStr === thisMonthStr) {
      monthlySales += amount;
    }
  });

  const averageOrderValue = sales.length > 0 ? (totalRevenue / sales.length) : 0;

  // 2. Leads Calculations
  const newLeadsCount = leads.filter(l => String(l.created_at).split('T')[0] === todayStr).length;
  const totalLeads = leads.length;
  const qualifiedLeadsCount = leads.filter(l => l.status === 'QUALIFIED').length;
  const convertedLeadsCount = leads.filter(l => l.status === 'CONVERTED').length;
  const conversionRate = totalLeads > 0 ? ((convertedLeadsCount / totalLeads) * 100) : 0;

  // 3. Pipeline Calculations
  const activeOpportunities = opportunities.filter(o => o.stage !== 'WON' && o.stage !== 'LOST');
  let pipelineValue = 0;
  activeOpportunities.forEach(o => {
    pipelineValue += parseFloat(o.estimated_value || 0);
  });

  // 4. Follow-up checklist statuses
  const dueToday = followups.filter(f => f.status === 'Pending' && f.due_date === todayStr).length;
  const overdue = followups.filter(f => f.status === 'Pending' && f.due_date < todayStr).length;
  const completedToday = followups.filter(f => f.status === 'Completed' && String(f.completed_at).split('T')[0] === todayStr).length;

  return {
    todaySales,
    monthlySales,
    totalRevenue,
    averageOrderValue,
    newLeadsCount,
    totalLeads,
    qualifiedLeadsCount,
    conversionRate,
    pipelineValue,
    activeOpportunitiesCount: activeOpportunities.length,
    dueToday,
    overdue,
    completedToday
  };
}

// 800-Laptop Sales Mission Calculations
export async function getLaptopMissionProgress() {
  const sales = await getSales();
  const targets = await readSheet('13_Targets');

  // Find 800 laptop target (config default)
  const laptopTarget = targets.find(t => t.target_name === '800 Laptop Sales') || {
    target_quantity: '800',
    start_date: '2026-09-01',
    end_date: '2026-12-31'
  };

  const targetQty = parseInt(laptopTarget.target_quantity, 10);
  const startDate = new Date(laptopTarget.start_date);
  const endDate = new Date(laptopTarget.end_date);
  const now = new Date();

  // Laptops sold: category is Laptop (needs to join with opportunity/product, or count laptop sales)
  // Let's check sales. For now, since the category lives in Opportunity, we can match opportunity category = 'Laptop'
  const opportunities = await getOpportunities();
  let soldQty = 0;

  sales.forEach(sale => {
    const opp = opportunities.find(o => o.opportunity_id === sale.opportunity_id);
    if (opp && opp.category === 'Laptop') {
      soldQty += parseInt(sale.quantity || 1, 10);
    }
  });

  const remaining = Math.max(0, targetQty - soldQty);
  const achievementPercent = (soldQty / targetQty) * 100;

  // Days calculations
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 122; // Sept-Dec = 122 days

  // Days elapsed (limit between 0 and totalCampaignDays)
  let daysElapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
  if (daysElapsed < 0) daysElapsed = 0;
  if (daysElapsed > totalDays) daysElapsed = totalDays;

  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  // Velocity calculations
  const currentVelocity = daysElapsed > 0 ? (soldQty / daysElapsed) : 0;
  const requiredVelocity = daysRemaining > 0 ? (remaining / daysRemaining) : 0;

  const projectedOutcome = currentVelocity * totalDays;
  const gap = projectedOutcome - targetQty;

  // Status mapping
  let status = 'Watch';
  if (currentVelocity >= requiredVelocity) {
    status = 'On Track';
  } else if (projectedOutcome < targetQty * 0.9) {
    status = 'At Risk';
  }

  return {
    target: targetQty,
    sold: soldQty,
    remaining,
    achievement: achievementPercent,
    daysElapsed,
    daysRemaining,
    totalDays,
    currentVelocity,
    requiredVelocity,
    projectedOutcome,
    gap,
    status
  };
}


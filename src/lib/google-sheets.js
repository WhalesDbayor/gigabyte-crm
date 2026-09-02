import { JWT } from 'google-auth-library';
import { sheets } from '@googleapis/sheets';

// Schema columns definition for all 17 sheets
export const SCHEMAS = {
  '01_Users': ['user_id', 'display_id', 'first_name', 'last_name', 'email', 'phone', 'role_id', 'department', 'branch', 'status', 'date_joined', 'last_login', 'created_at', 'updated_at'],
  '02_Roles': ['role_id', 'name', 'permissions', 'created_at'],
  '03_Customers': ['customer_id', 'display_id', 'first_name', 'last_name', 'phone', 'whatsapp', 'email', 'gender', 'location', 'customer_type', 'occupation', 'organization', 'source_id', 'assigned_user_id', 'customer_status', 'notes', 'created_at', 'updated_at'],
  '04_Leads': ['lead_id', 'display_id', 'customer_id', 'name', 'phone', 'whatsapp', 'email', 'source_id', 'campaign_id', 'interest_type', 'specific_interest', 'budget_min', 'budget_max', 'purpose', 'condition_preference', 'pain_point', 'assigned_user_id', 'status', 'temperature', 'created_at', 'updated_at'],
  '05_Opportunities': ['opportunity_id', 'display_id', 'customer_id', 'lead_id', 'title', 'category', 'product_id', 'quantity', 'estimated_value', 'budget', 'stage', 'probability', 'expected_close_date', 'assigned_user_id', 'campaign_id', 'source_id', 'lost_reason_id', 'competitor', 'competitor_price', 'notes', 'created_at', 'updated_at'],
  '06_Followups': ['followup_id', 'display_id', 'customer_id', 'lead_id', 'opportunity_id', 'assigned_user_id', 'due_date', 'due_time', 'method', 'type', 'status', 'outcome', 'customer_response', 'next_action', 'next_followup_date', 'completed_at', 'created_at', 'updated_at'],
  '07_Activities': ['activity_id', 'customer_id', 'lead_id', 'opportunity_id', 'user_id', 'activity_type', 'description', 'outcome', 'timestamp', 'created_at'],
  '08_Sales': ['sale_id', 'display_id', 'customer_id', 'opportunity_id', 'product_id', 'quantity', 'unit_price', 'discount', 'total_amount', 'salesperson_id', 'source_id', 'campaign_id', 'payment_status', 'delivery_status', 'transaction_reference', 'sale_date', 'created_at'],
  '09_Products': ['product_id', 'product_code', 'name', 'category', 'brand', 'model', 'condition', 'specifications', 'selling_price', 'availability_status', 'techstock_reference', 'created_at', 'updated_at'],
  '10_Campaigns': ['campaign_id', 'campaign_name', 'objective', 'channel', 'target_audience', 'start_date', 'end_date', 'budget', 'target_leads', 'target_sales', 'target_revenue', 'status', 'created_by', 'created_at', 'updated_at'],
  '11_Sources': ['source_id', 'name', 'created_at'],
  '12_Tasks': ['task_id', 'title', 'description', 'assigned_user_id', 'related_customer_id', 'related_lead_id', 'related_opportunity_id', 'priority', 'due_date', 'status', 'completed_at', 'created_at'],
  '13_Targets': ['target_id', 'target_name', 'target_type', 'target_quantity', 'target_revenue', 'start_date', 'end_date', 'product_category', 'branch', 'assigned_team', 'status', 'created_at'],
  '14_Partners': ['partner_id', 'display_id', 'name', 'partner_type', 'organization', 'phone', 'email', 'location', 'referral_code', 'assigned_user', 'status', 'created_at'],
  '15_Corporates': ['corporate_id', 'display_id', 'organization_name', 'industry', 'contact_person', 'position', 'phone', 'email', 'address', 'technology_needs', 'estimated_value', 'procurement_cycle', 'assigned_user', 'status', 'last_contact', 'next_followup', 'created_at'],
  '16_AuditLogs': ['audit_id', 'user_id', 'action', 'entity_type', 'entity_id', 'field_changed', 'old_value', 'new_value', 'timestamp', 'ip_device_reference'],
  '17_Settings': ['key', 'value', 'updated_at']
};

export function getCredentials() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  let spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!key || !spreadsheetId) {
    return null;
  }
  
  // If the user pasted a full URL instead of just the ID, extract the ID
  const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    spreadsheetId = match[1];
  }

  try {
    let jsonStr = key.trim();
    if (!jsonStr.startsWith('{')) {
      // If it doesn't start with {, assume it's base64 encoded (Vercel best practice)
      jsonStr = Buffer.from(jsonStr, 'base64').toString('utf-8');
    }
    const creds = JSON.parse(jsonStr);
    return { credentials: creds, spreadsheetId };
  } catch (e) {
    console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e.message);
    return null;
  }
}

export function getSheetsClient() {
  const config = getCredentials();
  if (!config) {
    throw new Error('Google credentials or Spreadsheet ID not configured.');
  }

  // Aggressively normalize the private key. Vercel sometimes mangles JSON newlines or adds quotes.
  let formattedKey = config.credentials.private_key || '';
  formattedKey = formattedKey.replace(/\\n/g, '\n'); // Replace literal \n with actual newlines
  formattedKey = formattedKey.replace(/"/g, '');    // Remove any rogue quotes
  
  // Ensure the key has proper PEM formatting if Vercel stripped newlines entirely
  if (!formattedKey.includes('\n') && formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedKey = formattedKey
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
      .replace(/ ([a-zA-Z0-9+/=]{64}) /g, '\n$1\n'); // Attempt to reconstruct if spaces replaced newlines
  }

  const auth = new JWT({
    email: config.credentials.client_email,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return sheets({ version: 'v4', auth });
}

// Read all rows from a sheet
export async function readSheet(sheetName) {
  const config = getCredentials();
  if (!config) throw new Error('Not Configured');
  const service = getSheetsClient();
  const headers = SCHEMAS[sheetName];
  if (!headers) throw new Error(`Unknown sheet ${sheetName}`);

  try {
    const response = await service.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }

    const sheetHeaders = rows[0];
    const dataRows = rows.slice(1);

    return dataRows.map(row => {
      const obj = {};
      headers.forEach(header => {
        const index = sheetHeaders.indexOf(header);
        obj[header] = index !== -1 && row[index] !== undefined ? row[index] : '';
      });
      return obj;
    });
  } catch (error) {
    console.error(`Error reading sheet ${sheetName}:`, error);
    throw error;
  }
}

// Append a single row
export async function appendRow(sheetName, data) {
  const config = getCredentials();
  if (!config) throw new Error('Not Configured');
  const service = getSheetsClient();
  const headers = SCHEMAS[sheetName];
  if (!headers) throw new Error(`Unknown sheet ${sheetName}`);

  let sheetHeaders = headers;
  try {
    const headerRes = await service.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${sheetName}!1:1`,
    });
    if (headerRes.data.values && headerRes.data.values[0]) {
      sheetHeaders = headerRes.data.values[0];
    }
  } catch (e) {}

  const newRowValues = sheetHeaders.map(header => {
    return data[header] !== undefined ? String(data[header]) : '';
  });

  try {
    await service.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRowValues],
      },
    });
    return data;
  } catch (error) {
    console.error(`Error appending to sheet ${sheetName}:`, error);
    throw error;
  }
}

// Update a row finding it by ID key
export async function updateRow(sheetName, idKey, idVal, updatedData) {
  const config = getCredentials();
  if (!config) throw new Error('Not Configured');
  const service = getSheetsClient();
  
  try {
    const response = await service.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      throw new Error(`Record with ${idKey}=${idVal} not found in ${sheetName} (empty sheet).`);
    }

    const sheetHeaders = rows[0];
    const idColumnIndex = sheetHeaders.indexOf(idKey);
    if (idColumnIndex === -1) {
      throw new Error(`ID Column ${idKey} not found in sheet ${sheetName}`);
    }

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idColumnIndex] === idVal) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Record with ${idKey}=${idVal} not found in ${sheetName}`);
    }

    const currentRowValues = rows[rowIndex - 1];
    const newRowValues = sheetHeaders.map((header, idx) => {
      if (updatedData[header] !== undefined) {
        return String(updatedData[header]);
      }
      return currentRowValues[idx] !== undefined ? String(currentRowValues[idx]) : '';
    });

    await service.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${sheetName}!A${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRowValues],
      },
    });

    const updatedObj = {};
    sheetHeaders.forEach((header, idx) => {
      updatedObj[header] = newRowValues[idx];
    });
    return updatedObj;
  } catch (error) {
    console.error(`Error updating sheet ${sheetName}:`, error);
    throw error;
  }
}

// Initializer to create tables/sheets and add columns in row 1
export async function initializeSpreadsheetSchema(spreadsheetId, serviceAccountKey) {
  // If the user pasted a full URL instead of just the ID, extract the ID
  const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    spreadsheetId = match[1];
  }

  let privateKey, clientEmail;
  try {
    const creds = JSON.parse(serviceAccountKey);
    privateKey = creds.private_key;
    clientEmail = creds.client_email;
  } catch (e) {
    throw new Error('Invalid Service Account Key format. Must be JSON string.');
  }

  const auth = new JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const service = sheets({ version: 'v4', auth });

  const meta = await service.spreadsheets.get({ spreadsheetId });
  const existingTitles = meta.data.sheets.map(s => s.properties.title);

  const sheetsToCreate = Object.keys(SCHEMAS).filter(name => !existingTitles.includes(name));
  
  if (sheetsToCreate.length > 0) {
    const requests = sheetsToCreate.map(title => ({
      addSheet: {
        properties: { title }
      }
    }));
    await service.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
  }

  for (const sheetName of Object.keys(SCHEMAS)) {
    const headers = SCHEMAS[sheetName];
    await service.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers]
      }
    });
  }

  return { success: true, initializedSheets: Object.keys(SCHEMAS) };
}

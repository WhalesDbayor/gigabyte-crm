const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
});

// Since getSheetsClient uses ES6 modules in Next.js, we should use dynamic import
async function test() {
  try {
    const { getSheetsClient } = await import('./src/lib/google-sheets.js');
    const client = getSheetsClient();
    const res = await client.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID.match(/\/d\/([a-zA-Z0-9-_]+)/)[1]
    });
    console.log('SUCCESS! Spreadsheet title:', res.data.properties.title);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}

test();

const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GS_SPREADSHEET_ID;   // ID de tu Google Sheet
const COUNTERS_RANGE = 'Counters!A:B';                  // Hoja "Counters", columnas Fecha / Contador

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;   // 2025-11-18
}

function buildOrderNumber(dateStr, counter) {
  const [y, m, d] = dateStr.split('-');
  return `A51-${y}-${m}-${d}-${String(counter).padStart(4, '0')}`;
}

async function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');

  const jwtClient = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  await jwtClient.authorize();
  return google.sheets({ version: 'v4', auth: jwtClient });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const sheets = await getSheetsClient();
    const todayStr = getTodayString();

    // Leer contenido actual de Counters!A:B
    const readResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: COUNTERS_RANGE,
    });

    const rows = readResp.data.values || [];
    let rowIndex = -1;
    let currentCounter = -1;

    // Buscar fila del día de hoy
    for (let i = 0; i < rows.length; i++) {
      const rowDate = rows[i][0];
      if (rowDate === todayStr) {
        rowIndex = i;
        currentCounter = rows[i][1] !== undefined ? parseInt(rows[i][1], 10) : -1;
        break;
      }
    }

    let newCounter;
    if (rowIndex === -1) {
      // No hay fila para hoy → empezamos en 0 (0000)
      newCounter = 0;
      rows.push([todayStr, String(newCounter)]);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: COUNTERS_RANGE,
        valueInputOption: 'RAW',
        resource: { values: rows },
      });
    } else {
      // Hay fila para hoy → incrementamos
      newCounter = isNaN(currentCounter) ? 0 : currentCounter + 1;
      rows[rowIndex][1] = String(newCounter);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: COUNTERS_RANGE,
        valueInputOption: 'RAW',
        resource: { values: rows },
      });
    }

    const orderNumber = buildOrderNumber(todayStr, newCounter);

    return res.status(200).json({ ok: true, orderNumber });
  } catch (err) {
    console.error('Error en generateOrder:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

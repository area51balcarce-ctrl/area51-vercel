// api/sendEmail.js
import { Resend } from "resend";
import { google } from "googleapis";

const resend = new Resend(process.env.RESEND_API_KEY);

// === Helpers para Google Sheets (misma lógica que generateOrder.js) ===
async function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");

  const jwtClient = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  await jwtClient.authorize();
  return google.sheets({ version: "v4", auth: jwtClient });
}

// Guarda una fila en la hoja "Ordenes" de tu spreadsheet
async function guardarOrdenEnSheets(payload) {
  const {
    orden,
    fecha,
    nombre,
    telefono,
    producto,
    equipo,
    modelo,
    problema,
    detalle,
    estado,
    calcosDecision,
  } = payload;

  const spreadsheetId = process.env.GS_SPREADSHEET_ID; // debe ser 17TFP...
  if (!spreadsheetId) {
    console.error("GS_SPREADSHEET_ID no está definido en las variables de entorno");
    return;
  }

  const sheets = await getSheetsClient();

  // Hoja y rango donde queremos escribir
  const range = "Ordenes!A:K";

  const values = [
    [
      orden || "",
      fecha || "",
      nombre || "",
      telefono || "",
      equipo || "",
      modelo || "",
      problema || "",
      detalle || "",
      estado || "",
      calcosDecision || "",
      "" // LinkWhatsApp (lo podés completar después si querés)
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

// === Handler HTTP de Vercel ===
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      orden,
      nombre,
      telefono,
      producto,
      equipo,
      modelo,
      problema,
      detalle,
      estado,
      calcosDecision,
      fecha,
      pdfBase64,
    } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: "Falta el PDF" });
    }

    const safeFecha = fecha || "sin_fecha";
    const safeOrden = orden || "SIN-ORDEN";

    const nombreArchivo = `Orden_AREA51_${safeOrden}_${safeFecha.replace(
      /\//g,
      "-"
    )}.pdf`;

    // 1) Enviar correo con Resend (igual que antes)
    const { error } = await resend.emails.send({
      from: "Formularios AREA 51 <onboarding@resend.dev>",
      to: "area51.balcarce@gmail.com",
      subject: `AREA 51 - Nueva orden de servicio - ${safeOrden} - ${
        nombre || "Sin nombre"
      }`,
      html: `
        <h2>Nueva orden de servicio - AREA 51</h2>

        <p><strong>Orden:</strong> ${safeOrden}</p>
        <p><strong>Fecha:</strong> ${fecha || "-"}</p>

        <p><strong>Nombre:</strong> ${nombre || "-"}</p>
        <p><strong>Teléfono:</strong> ${telefono || "-"}</p>

        <p><strong>Producto:</strong> ${producto || "-"}</p>
        <p><strong>Equipo:</strong> ${equipo || "-"}</p>
        <p><strong>Modelo:</strong> ${modelo || "-"}</p>

        <p><strong>Problema:</strong> ${problema || "-"}</p>
        <p><strong>Descripción:</strong> ${detalle || "-"}</p>

        <p><strong>Estado físico:</strong> ${estado || "-"}</p>
        <p><strong>Calcomanías:</strong> ${calcosDecision || "N/A"}</p>

        <hr />
        <p>Se adjunta la ORDEN DE SERVICIO en PDF con la firma del cliente.</p>
      `,
      attachments: [
        {
          filename: nombreArchivo,
          content: pdfBase64,
        },
      ],
    });

    if (error) {
      console.error("Error al enviar correo AREA 51:", error);
      return res.status(500).json({ error: "Error al enviar el correo" });
    }

    // 2) Guardar la orden en Google Sheets (ORDENES)
    try {
      await guardarOrdenEnSheets({
        orden,
        fecha,
        nombre,
        telefono,
        producto,
        equipo,
        modelo,
        problema,
        detalle,
        estado,
        calcosDecision,
      });
    } catch (sheetErr) {
      console.error("Error guardando en Google Sheets:", sheetErr);
      // NO corto la respuesta al cliente: el mail ya salió
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error inesperado:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

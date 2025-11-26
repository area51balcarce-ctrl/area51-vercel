// api/sendEmail.js
import { Resend } from "resend";
import { google } from "googleapis";

const resend = new Resend(process.env.RESEND_API_KEY);
const SPREADSHEET_ID = process.env.GS_SPREADSHEET_ID;

// mismo esquema de auth que usás en generateOrder.js
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      orden,
      nombre,
      telefono,
      medioPago,
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

    // 1) ENVIAR MAIL
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

        <p><strong>Medio de pago:</strong> ${medioPago || "-"}</p>

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

    // 2) GUARDAR EN GOOGLE SHEETS (hoja "Ordenes")
    try {
      const sheets = await getSheetsClient();

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Ordenes!A:K",           // columnas A a K
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              safeOrden || "",
              fecha || "",
              nombre || "",
              telefono || "",
              equipo || "",
              modelo || "",
              problema || "",
              detalle || "",
              estado || "",
              calcosDecision || "",
              "", // LinkWhatsApp (si después querés guardarlo)
            ],
          ],
        },
      });
    } catch (sheetErr) {
      console.error("Error al escribir en Google Sheets:", sheetErr);
      // el mail ya salió; devolvemos 200 pero avisamos en el log
      return res.status(200).json({
        success: true,
        warning: "Mail enviado pero fallo el guardado en Sheets",
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error inesperado:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

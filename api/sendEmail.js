// api/sendEmail.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Nombre del archivo: incluye orden y fecha
    const nombreArchivo = `Orden_AREA51_${safeOrden}_${safeFecha.replace(
      /\//g,
      "-"
    )}.pdf`;

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
          content: pdfBase64, // base64 SIN el "data:application/pdf..."
        },
      ],
    });

    if (error) {
      console.error("Error al enviar correo AREA 51:", error);
      return res.status(500).json({ error: "Error al enviar el correo" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error inesperado:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

// api/sendEmail.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const {
      nombre,
      telefono,
      equipo,
      modelo,
      problema,
      detalle,
      estado,
      calcosDecision,
      fecha,
      pdfBase64,
    } = req.body;

    // seguridad rápida por si falta algo importante
    if (!nombre || !telefono || !equipo || !pdfBase64) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const asunto = `Nueva orden de servicio - AREA 51 - ${nombre}`;

    const htmlBody = `
      <h2>Nueva orden de servicio AREA 51</h2>
      <p><strong>Fecha:</strong> ${fecha}</p>
      <p><strong>Nombre:</strong> ${nombre}</p>
      <p><strong>Teléfono:</strong> ${telefono}</p>
      <p><strong>Equipo:</strong> ${equipo}</p>
      <p><strong>Modelo:</strong> ${modelo || 'N/A'}</p>
      <p><strong>Problema:</strong> ${problema}</p>
      <p><strong>Descripción:</strong><br/>${detalle || 'Sin descripción adicional'}</p>
      <p><strong>Estado físico:</strong> ${estado}</p>
      <p><strong>Calcomanías:</strong> ${calcosDecision || 'N/A'}</p>
      <hr/>
      <p>Se adjunta en PDF la orden de servicio firmada por el cliente.</p>
    `;

    const response = await resend.emails.send({
      from: 'Formularios AREA 51 <onboarding@resend.dev>',
      // 👉 aquí llega SIEMPRE la copia para tu local
      to: ['s.i.balcarce@gmail.com'],
      subject: asunto,
      html: htmlBody,
      attachments: [
        {
          filename: `Orden_AREA51_${fecha.replace(/\//g, '-')}.pdf`,
          content: pdfBase64, // base64 sin el "data:application/pdf;base64,"
        },
      ],
    });

    console.log('Resend response:', response);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error enviando email AREA 51:', error);
    return res.status(500).json({ error: 'Error al enviar el email' });
  }
}

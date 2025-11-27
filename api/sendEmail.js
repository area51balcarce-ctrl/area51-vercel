const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

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
  } = body || {};

  if (!pdfBase64 || !orden) {
    return res
      .status(400)
      .json({ ok: false, message: "Falta pdfBase64 u orden en el body" });
  }

  const fechaNombre = (fecha || "").replace(/\//g, "-") || "sin-fecha";
  const filename = `Orden_${orden}_${fechaNombre}.pdf`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const htmlResumen = `
    <h2>AREA 51 - Nueva Orden de Servicio</h2>
    <p><strong>Orden:</strong> ${orden}</p>
    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Nombre:</strong> ${nombre}</p>
    <p><strong>Teléfono:</strong> ${telefono}</p>
    <p><strong>Medio de pago:</strong> ${medioPago}</p>
    <p><strong>Producto:</strong> ${producto}</p>
    <p><strong>Equipo:</strong> ${equipo}</p>
    <p><strong>Modelo:</strong> ${modelo}</p>
    <p><strong>Problema:</strong> ${problema}</p>
    <p><strong>Detalle:</strong> ${detalle}</p>
    <p><strong>Estado físico:</strong> ${estado}</p>
    <p><strong>Calcomanías:</strong> ${calcosDecision}</p>
    <p>Se adjunta el PDF firmado.</p>
  `;

  const mailOptions = {
    from: `"AREA 51" <${process.env.GMAIL_USER}>`,
    to: "area51.balcarce@gmail.com",
    subject: `Nueva orden ${orden} - ${nombre || ""}`,
    html: htmlResumen,
    attachments: [
      {
        filename,
        content: Buffer.from(pdfBase64, "base64"),
        contentType: "application/pdf",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error enviando mail:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Error enviando mail en el servidor" });
  }
};

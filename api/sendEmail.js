const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  // Solo aceptar POST
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  // Asegurarnos de tener el body como objeto
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
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

  // Validación básica
  if (!pdfBase64 || !orden) {
    return res
      .status(400)
      .json({ ok: false, message: "Falta pdfBase64 u orden en el body" });
  }

  const fechaNombre = (fecha || "").replace(/\//g, "-") || "sin-fecha";
  const filename = `Orden_${orden}_${fechaNombre}.pdf`;

  // Transporter usando Gmail + variables de entorno
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER, // area51.balcarce@gmail.com
      pass: process.env.GMAIL_PASS, // en Vercel, NO en código
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
    <p>Se adjunta el PDF firmado del cliente.</p>
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
    // 1) Enviar el mail como siempre
    await transporter.sendMail(mailOptions);

    // 2) Después de enviar el mail, guardar la orden en Sheets usando tu WebApp
    const SCRIPT_URL =
      process.env.SCRIPT_URL ||
      "https://script.google.com/macros/s/AKfycbyl5OTqorFGvvelnZuYHjO19wh9Cpga8WeppGNCPiuimZ8gUWWHw1zPY2ubbpOWNjRDXA/exec";

    try {
      const resp = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orden,
          fecha,
          nombre,
          telefono,
          equipo,
          modelo,
          problema,
          detalle,
          estado,
          calcosDecision
        }),
      });

      const text = await resp.text();
      console.log("Respuesta de Sheets:", resp.status, text);
    } catch (sheetErr) {
      console.error("Error enviando datos a Sheets:", sheetErr);
      // No corto el flujo: el mail ya se envió
    }

    // 3) Respuesta HTTP al front
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error enviando mail:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Error enviando mail en el servidor" });
  }
};



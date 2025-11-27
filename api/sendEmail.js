import nodemailer from "nodemailer";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ ok:false, error:"Solo POST permitido" });
    }

    const data = req.body;
    const sheetUrl = "https://script.google.com/macros/s/AKfycbzAByWsvzMeubBaCkv_DhC--8R7odKi0qEdN_syO1lPWbeW4yNsnAwOJxk6goWDp9lX/exec";

    try {
        // 1) Guardar en Google Sheets 📄
        const guardar = await fetch(sheetUrl, {
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body: JSON.stringify({
                tipo: "guardarOrden",
                ...data
            })
        });

        const r = await guardar.json();
        console.log("Respuesta Google Sheets → ", r);

        // 2) Enviar Email con PDF 📎
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: process.env.MAIL_USER,
            subject: `Nueva Orden Generada: ${data.orden}`,
            html: `
                <h2>📄 Nueva Orden en AREA 51</h2>
                <p><b>Nombre:</b> ${data.nombre}</p>
                <p><b>Teléfono:</b> ${data.telefono}</p>
                <p><b>Equipo:</b> ${data.equipo} ${data.modelo}</p>
                <p><b>Problema:</b> ${data.problema}</p>
                <p><b>Fecha:</b> ${data.fecha}</p>
            `,
            attachments:[{
                filename:`Orden_${data.orden}.pdf`,
                content:data.pdfBase64,
                encoding:"base64"
            }]
        });

        return res.status(200).json({ ok:true, msg:"Orden guardada y email enviado" });

    } catch(err) {
        console.error(err);
        return res.status(500).json({ ok:false, error:"Error guardando/Email", detalle:err.message });
    }
}

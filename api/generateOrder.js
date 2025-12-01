// api/generateOrder.js
// Proxy muy simple entre Vercel y tu Apps Script

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwtLCKoaMMRdradoAmuOFJ60BfCTHN2OMZpHtYUd5cf39YNdE_U9B8hUXjogIGp9DnPLg/exec";

export default async function handler(req, res) {
  try {
    // GET → solo pedir número de orden nuevo
    if (req.method === "GET") {
      const r = await fetch(SCRIPT_URL);
      const text = await r.text();

      // Intentar parsear JSON; si falla, devolver error con el HTML
      try {
        const data = JSON.parse(text);
        return res.status(200).json(data);
      } catch (e) {
        console.error("Respuesta NO JSON desde Apps Script:", text);
        return res.status(500).json({
          ok: false,
          error: "Apps Script no devolvió JSON",
          raw: text,
        });
      }
    }

    // POST → guardar datos de la orden en Sheets
    if (req.method === "POST") {
      const r = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {}),
      });

      const text = await r.text();
      try {
        const data = JSON.parse(text);
        return res.status(r.ok ? 200 : 500).json(data);
      } catch (e) {
        console.error("Respuesta NO JSON desde Apps Script (POST):", text);
        return res.status(500).json({
          ok: false,
          error: "Apps Script no devolvió JSON en POST",
          raw: text,
        });
      }
    }

    // Cualquier otro método
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Error en /api/generateOrder:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

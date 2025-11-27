// api/generateOrder.js
// Proxy muy simple entre Vercel y tu Apps Script

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwp03HlgzlSlR08wXLwQipQanXIJ3nN8qFXvIo-BzAAODipU4ed07MLLr7rh8S4f-G5/exec";

export default async function handler(req, res) {
  try {
    // GET → solo pedir número de orden nuevo
    if (req.method === "GET") {
      const r = await fetch(SCRIPT_URL);
      const data = await r.json();
      return res.status(200).json(data);
    }

    // POST → guardar datos de la orden en Sheets
    if (req.method === "POST") {
      const r = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {}),
      });

      let data = null;
      try {
        data = await r.json();
      } catch (e) {
        data = null;
      }

      return res.status(r.ok ? 200 : 500).json(data || { ok: false });
    }

    // Cualquier otro método
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Error en /api/generateOrder:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

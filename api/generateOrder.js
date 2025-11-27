// api/generateOrder.js
// Proxy entre Vercel y tu Apps Script

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwp03HlgzlSlR08wXLwQipQanXIJ3nN8qFXvIo-BzAAODipU4ed07MLLr7rh8S4f-G5/exec";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // FRONT → /api/generateOrder (GET) → Apps Script doGet()
      const r = await fetch(SCRIPT_URL);
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      // FRONT → /api/generateOrder (POST) → Apps Script doPost()
      const r = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {}),
      });

      const data = await r.json().catch(() => null);
      return res.status(r.ok ? 200 : 500).json(data || { ok: false });
    }

    // Cualquier otra cosa: no permitido
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Error en /api/generateOrder:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

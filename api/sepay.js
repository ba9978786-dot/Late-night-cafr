module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.SEPAY_WEBHOOK_API_KEY;
  const auth = req.headers.authorization || "";

  if (!secret || auth !== `Apikey ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const p = req.body || {};

    if (
      p.transferType !== "in" ||
      !Number.isInteger(p.id) ||
      !Number.isInteger(p.transferAmount)
    ) {
      return res.status(200).json({ success: true });
    }

    const content = `${p.code || ""} ${p.content || ""}`;
    const match = content.match(/LNC-[A-Z0-9]{12}/i);

    if (!match) {
      return res.status(200).json({ success: true });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await fetch(
      `${url}/rest/v1/orders?order_code=eq.${match[0]}&amount=eq.${p.transferAmount}&status=eq.pending&transaction_id=is.null`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          status: "paid",
          transaction_id: String(p.id),
          paid_at: new Date().toISOString()
        })
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: "Database error" });
    }

    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
};

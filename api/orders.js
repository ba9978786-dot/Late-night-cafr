const crypto = require("node:crypto");

const RANKS = {
  "Đồng": 10000,
  "Vàng": 20000,
  "Bạch Kim": 40000,
  "Kim Cương": 100000,
  "Tinh Anh": 200000
};

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username, rank } = req.body || {};

    if (!/^[A-Za-z0-9_]{3,16}$/.test(username || "")) {
      return res.status(400).json({ error: "Tên Minecraft không hợp lệ" });
    }

    if (!Object.prototype.hasOwnProperty.call(RANKS, rank)) {
      return res.status(400).json({ error: "Rank không hợp lệ" });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return res.status(500).json({ error: "Server chưa cấu hình Supabase" });
    }

    const order = {
      order_code: "LNC-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase(),
      minecraft_username: username,
      rank_name: rank,
      amount: RANKS[rank],
      status: "pending"
    };

    const response = await fetch(`${url}/rest/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(order)
    });

    if (!response.ok) {
      return res.status(500).json({ error: "Không lưu được đơn hàng" });
    }

    const [saved] = await response.json();

    return res.status(201).json({
      success: true,
      order_code: saved.order_code,
      username: saved.minecraft_username,
      rank: saved.rank_name,
      amount: saved.amount,
      status: saved.status
    });

  } catch (error) {
    return res.status(500).json({ error: "Lỗi máy chủ" });
  }
};

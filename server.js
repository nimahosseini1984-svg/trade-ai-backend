// Trade AI Backend — Develop Mode
// نسخه توسعه: سرور سبک برای دریافت داده زنده از TSETMC
// اجرا: npm install سپس npm run dev

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const TSETMC_BASE = "https://cdn.tsetmc.com/api";

// هدرهایی که برای عبور از فیلتر/تشخیص بات لازم است (فقط برای develop)
const TSE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
  "Referer": "https://www.tsetmc.com/"
};

// ---------- Helper: fetch از TSETMC با مدیریت خطا ----------
async function tseFetch(path) {
  const url = `${TSETMC_BASE}${path}`;
  const res = await fetch(url, { headers: TSE_HEADERS, timeout: 8000 });
  if (!res.ok) {
    throw new Error(`TSETMC responded ${res.status} for ${path}`);
  }
  return res.json();
}

// ---------- Health check ----------
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Trade AI Backend (develop mode)",
    time: new Date().toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })
  });
});

// ---------- ۱. جستجوی نماد بر اساس نام/کد ----------
// GET /api/search?q=فولاد
app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "پارامتر q الزامی است" });

  try {
    // اندپوینت جستجوی رسمی تسمک
    const data = await tseFetch(`/Instrument/GetInstrumentSearch/${encodeURIComponent(q)}`);
    res.json({ success: true, data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// ---------- ۲. اطلاعات هویتی نماد (کد بورسی، بخش صنعت و ...) ----------
// GET /api/identity/:insCode
app.get("/api/identity/:insCode", async (req, res) => {
  try {
    const data = await tseFetch(`/Instrument/GetInstrumentIdentity/${req.params.insCode}`);
    res.json({ success: true, data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// ---------- ۳. قیمت لحظه‌ای/پایانی + حجم ----------
// GET /api/price/:insCode
app.get("/api/price/:insCode", async (req, res) => {
  try {
    const data = await tseFetch(`/ClosingPrice/GetClosingPriceInfo/${req.params.insCode}`);
    res.json({ success: true, data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// ---------- ۴. تاریخچه قیمت (برای تحلیل تکنیکال بعدی) ----------
// GET /api/history/:insCode?days=30
app.get("/api/history/:insCode", async (req, res) => {
  const top = req.query.days || 30;
  try {
    const data = await tseFetch(`/ClosingPrice/GetClosingPriceDailyList/${req.params.insCode}/${top}`);
    res.json({ success: true, data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// ---------- ۵. خلاصه یک نماد (قیمت + هویت با یک درخواست) ----------
// GET /api/symbol/:insCode/summary
app.get("/api/symbol/:insCode/summary", async (req, res) => {
  const { insCode } = req.params;
  try {
    const [identity, price] = await Promise.all([
      tseFetch(`/Instrument/GetInstrumentIdentity/${insCode}`),
      tseFetch(`/ClosingPrice/GetClosingPriceInfo/${insCode}`)
    ]);
    res.json({
      success: true,
      fetchedAt: new Date().toLocaleString("fa-IR", { timeZone: "Asia/Tehran" }),
      identity,
      price
    });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// ---------- خطای عمومی ----------
app.use((req, res) => {
  res.status(404).json({ error: "مسیر یافت نشد" });
});

app.listen(PORT, () => {
  console.log(`✅ Trade AI Backend (develop) روی پورت ${PORT} اجرا شد`);
  console.log(`   http://localhost:${PORT}`);
});

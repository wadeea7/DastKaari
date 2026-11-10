const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ status: "Dastkaari is running" });
});

// Contact form: messages are appended to storage/messages.jsonl (git-ignored)
app.post("/api/contact", (req, res) => {
  const { name, phone, message } = req.body || {};
  if (!String(name || "").trim() || !String(message || "").trim()) return res.status(400).json({ ok: false });
  const dir = path.join(__dirname, "storage");
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, "messages.jsonl"), JSON.stringify({
    at: new Date().toISOString(), name: String(name).slice(0, 80), phone: String(phone || "").slice(0, 30), message: String(message).slice(0, 1000),
  }) + "\n");
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Open http://localhost:${PORT}`));
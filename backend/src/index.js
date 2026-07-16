const express = require("express");
const cors = require("cors");
require("dotenv").config();

const webhookRoutes = require("./routes/webhook");
const apiRoutes = require("./routes/api");
const { processFollowUps } = require("./services/followup");
const { getAuthUrl, getTokens } = require("./services/gmail");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get("/", (req, res) => res.json({ status: "SentryAI backend running 🚀" }));
app.use("/webhook", webhookRoutes);
app.use("/api", apiRoutes);

app.get("/auth/gmail", (req, res) => {
  res.redirect(getAuthUrl());
});

app.get("/auth/gmail/callback", async (req, res) => {
  try {
    const tokens = await getTokens(req.query.code);
    res.send(`
      <h2>✅ Gmail connected!</h2>
      <p>Add this to your .env:</p>
      <pre>GMAIL_REFRESH_TOKEN=${tokens.refresh_token}</pre>
    `);
  } catch (err) {
    res.status(500).send("Auth failed: " + err.message);
  }
});

// ── Auto-processing intervals ──────────────────────────────────────────────
async function autoProcessEmails() {
  try {
    const res = await fetch(`http://localhost:${PORT}/api/gmail/process`, { method: "POST" });
    const data = await res.json();
    if (data.processed > 0) console.log(`📧 Auto-processed ${data.processed} emails`);
  } catch (err) {
    console.error("Email auto-process error:", err.message);
  }
}

app.listen(PORT, () => {
  console.log(`SentryAI running on port ${PORT}`);

  // Run follow-up scheduler every hour
  processFollowUps();
  setInterval(processFollowUps, 60 * 60 * 1000);

  // Run email check every 5 minutes
  setInterval(autoProcessEmails, 5 * 60 * 1000);
});
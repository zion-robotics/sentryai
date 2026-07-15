const express = require("express");
const cors = require("cors");
require("dotenv").config();

const webhookRoutes = require("./routes/webhook");
const apiRoutes = require("./routes/api");
const { processFollowUps } = require("./services/followup");

const app = express();

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
  const { getAuthUrl } = require("./services/gmail");
  res.redirect(getAuthUrl());
});

app.get("/auth/gmail/callback", async (req, res) => {
  const { getTokens } = require("./services/gmail");
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

// Run follow-up scheduler every hour
processFollowUps();
setInterval(processFollowUps, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SentryAI running on port ${PORT}`));
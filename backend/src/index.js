const express = require("express");
const cors = require("cors");
require("dotenv").config();

const webhookRoutes = require("./routes/webhook");

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log(`📥 Incoming ${req.method} ${req.path}`, JSON.stringify(req.body, null, 2));
  }
  next();
});

app.get("/", (req, res) => res.json({ status: "SentryAI backend running 🚀" }));
app.use("/webhook", webhookRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SentryAI running on port ${PORT}`));

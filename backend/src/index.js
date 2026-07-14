const express = require("express");
const cors = require("cors");
require("dotenv").config();

const webhookRoutes = require("./routes/webhook");
const apiRoutes = require("./routes/api");

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SentryAI running on port ${PORT}`));
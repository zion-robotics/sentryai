const express = require("express");
const router = express.Router();
const supabase = require("../services/supabase");
const { getAuthUrl, getTokens, getUnreadEmails, sendEmail, markAsRead } = require("../services/gmail");
const { classifyMessage, generateReply } = require("../services/qwen");
const { scheduleFollowUp } = require("../services/followup");
const { sendTelegram, sendWhatsApp } = require("../services/messenger");

// Get all conversations
router.get("/conversations", async (req, res) => {
  const { data: convs, error } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Attach last message to each conversation
  const withLastMessage = await Promise.all(
    (convs || []).map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return { ...conv, last_message: lastMsg?.content || null };
    })
  );

  res.json(withLastMessage);
});

// Get messages for a conversation
router.get("/conversations/:id/messages", async (req, res) => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", req.params.id)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get stats
router.get("/stats", async (req, res) => {
  const { data: convs } = await supabase
    .from("conversations")
    .select("lead_score, status");

  const { count: msgCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("direction", "inbound");

  res.json({
    messages: msgCount || 0,
    hot:    convs?.filter(c => c.lead_score === "hot").length || 0,
    warm:   convs?.filter(c => c.lead_score === "warm").length || 0,
    cold:   convs?.filter(c => c.lead_score === "cold").length || 0,
    closed: convs?.filter(c => c.status === "closed").length || 0,
  });
});

// Toggle agent takeover
router.patch("/conversations/:id/takeover", async (req, res) => {
  const { agent_active } = req.body;
  const { data, error } = await supabase
    .from("conversations")
    .update({ agent_active })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Gmail OAuth
router.get("/auth/gmail", (req, res) => {
  res.redirect(getAuthUrl());
});

router.get("/auth/gmail/callback", async (req, res) => {
  try {
    const tokens = await getTokens(req.query.code);
    console.log("Gmail refresh token:", tokens.refresh_token);
    res.send(`
      <h2>Gmail connected!</h2>
      <p>Add this to your .env:</p>
      <pre>GMAIL_REFRESH_TOKEN=${tokens.refresh_token}</pre>
    `);
  } catch (err) {
    res.status(500).send("Auth failed: " + err.message);
  }
});

// Process unread emails
router.post("/gmail/process", async (req, res) => {
  try {
    const emails = await getUnreadEmails();
    if (emails.length === 0) return res.json({ processed: 0 });

    const businessId = process.env.DEFAULT_BUSINESS_ID;
    let processed = 0;

    for (const email of emails) {
      const fromEmail = email.from.match(/<(.+)>/)?.[1] || email.from;
      const fromName  = email.from.match(/^(.+?)\s*</)?.[1] || fromEmail;
      const text      = `Subject: ${email.subject}\n\n${email.body}`.slice(0, 1000);

      let { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("platform", "email")
        .eq("customer_id", fromEmail)
        .single();

      if (!conv) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            business_id: businessId,
            platform: "email",
            customer_id: fromEmail,
            customer_name: fromName,
            lead_score: "cold",
            status: "active",
            agent_active: true
          })
          .select()
          .single();
        conv = newConv;
      }

      await supabase.from("messages").insert({
        conversation_id: conv.id,
        platform: "email",
        direction: "inbound",
        content: text,
        message_type: "text",
        sender: fromName,
        raw: email
      });

      const classification = await classifyMessage(text);

      await supabase
        .from("conversations")
        .update({ lead_score: classification.lead_score, last_message_at: new Date().toISOString() })
        .eq("id", conv.id);

      if (classification.lead_score === "warm") {
        await scheduleFollowUp(conv.id, businessId);
      }

      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single();

      const reply = await generateReply(text, business, []);

      await sendEmail(fromEmail, `Re: ${email.subject}`, reply);

      await supabase.from("messages").insert({
        conversation_id: conv.id,
        platform: "email",
        direction: "outbound",
        content: reply,
        message_type: "text",
        sender: "SentryAI"
      });

      await markAsRead(email.id);
      processed++;
      console.log(`📧 Email replied to ${fromEmail}`);
    }

    res.json({ processed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a manual message (human takeover)
router.post("/conversations/:id/send", async (req, res) => {
  try {
    const { message } = req.body;
    const { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    // Auto pause agent when owner sends manually
    if (conv.agent_active) {
      await supabase
        .from("conversations")
        .update({ agent_active: false })
        .eq("id", conv.id);
    }

    if (conv.platform === "telegram") {
      await sendTelegram(conv.customer_id, message);
    } else if (conv.platform === "whatsapp") {
      await sendWhatsApp(conv.customer_id, message);
    } else if (conv.platform === "email") {
      await sendEmail(conv.customer_id, "Message from SentryAI", message);
    }

    await supabase.from("messages").insert({
      conversation_id: conv.id,
      platform: conv.platform,
      direction: "outbound",
      content: message,
      message_type: "text",
      sender: "Business Owner"
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { sendDailyReport, generateDailyReport } = require("../services/report");

// Get today's report data (for dashboard display)
router.get("/report/:businessId", async (req, res) => {
  try {
    const report = await generateDailyReport(req.params.businessId);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger sending the report
router.post("/report/:businessId/send", async (req, res) => {
  try {
    const result = await sendDailyReport(req.params.businessId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const { classifyMessage, generateReply } = require("../services/qwen");
const supabase = require("../services/supabase");
const { sendTelegram } = require("../services/messenger");

// ── Telegram ──────────────────────────────────────────────────────────────────
router.post("/telegram", async (req, res) => {
  res.sendStatus(200);

  try {
    const msg = req.body.message;
    if (!msg || !msg.text) return;

    const chatId = msg.chat.id.toString();
    const text = msg.text;
    const customerName = msg.from?.first_name || "Customer";
    const businessId = process.env.DEFAULT_BUSINESS_ID;

    console.log(`📩 Telegram from ${customerName}: ${text}`);

    // 1. Get or create conversation
    let { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("platform", "telegram")
      .eq("customer_id", chatId)
      .single();

    if (!conv) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          business_id: businessId,
          platform: "telegram",
          customer_id: chatId,
          customer_name: customerName,
          lead_score: "cold",
          status: "active",
          agent_active: true
        })
        .select()
        .single();
      conv = newConv;
    }

    // 2. Save incoming message
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      platform: "telegram",
      direction: "inbound",
      content: text,
      message_type: "text",
      sender: customerName,
      raw: req.body
    });

    // 3. Skip if human takeover active
    if (!conv.agent_active) {
      console.log("Human takeover active — agent not responding");
      return;
    }

    // 4. Classify message
    const classification = await classifyMessage(text);
    console.log("Classification:", classification);

    // 5. Update lead score
    await supabase
      .from("conversations")
      .update({
        lead_score: classification.lead_score,
        last_message_at: new Date().toISOString()
      })
      .eq("id", conv.id);

    // 6. Get recent history
    const { data: history } = await supabase
      .from("messages")
      .select("direction, content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(6);

    const formattedHistory = (history || []).reverse().map(m => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content
    }));

    // 7. Get business context
    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();

    // 8. Generate reply
    const reply = await generateReply(text, business, formattedHistory);
    console.log(`🤖 Reply: ${reply}`);

    // 9. Send reply
    await sendTelegram(chatId, reply);

    // 10. Save outbound message
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      platform: "telegram",
      direction: "outbound",
      content: reply,
      message_type: "text",
      sender: "SentryAI"
    });

  } catch (err) {
    console.error("Telegram webhook error:", err.message);
  }
});

// ── Meta ──────────────────────────────────────────────────────────────────────
router.post("/meta", (req, res) => {
  console.log("Meta message:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

router.get("/meta", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

module.exports = router;

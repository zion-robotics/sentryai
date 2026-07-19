const express = require("express");
const router = express.Router();
const { classifyMessage, generateReply } = require("../services/qwen");
const supabase = require("../services/supabase");
const { sendTelegram, sendWhatsApp } = require("../services/messenger");
const { createPaymentLink } = require("../services/paystack");
const { scheduleFollowUp } = require("../services/followup");

// ── Shared AI handler ─────────────────────────────────────────────────────────
async function handleMessage({ platform, customerId, customerName, text, rawBody }) {
  const businessId = process.env.DEFAULT_BUSINESS_ID;

  let { data: conv } = await supabase
    .from("conversations")
    .select("*")
    .eq("platform", platform)
    .eq("customer_id", customerId)
    .single();

  if (!conv) {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        business_id: businessId,
        platform,
        customer_id: customerId,
        customer_name: customerName,
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
    platform,
    direction: "inbound",
    content: text,
    message_type: "text",
    sender: customerName,
    raw: rawBody
  });

  if (!conv.agent_active) {
    console.log("Human takeover active — agent not responding");
    return null;
  }

  const classification = await classifyMessage(text);
  console.log("Classification:", classification);

 await supabase
    .from("conversations")
    .update({
      lead_score: classification.lead_score,
      last_message_at: new Date().toISOString()
    })
    .eq("id", conv.id);

  if (classification.lead_score === "hot") {
    const { sendPushToBusiness } = require("../services/push");
    try {
      await sendPushToBusiness(businessId, {
        title: "Hot lead alert",
        body: customerName + " on " + platform + " needs your attention",
      });
    } catch (err) {
      console.error("Push notification failed:", err.message);
    }
  }

  // Schedule follow-up for warm leads
  if (classification.lead_score === "warm") {
    const { scheduleFollowUp } = require("../services/followup");
    await scheduleFollowUp(conv.id, businessId);
  }

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

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

 // ── Buying intent → auto payment link ─────────────────────────────────────
  let paymentLink = null;

  if (
    classification.intent === "buying" ||
    classification.lead_score === "hot"
  ) {
    try {
      paymentLink = await createPaymentLink({
        email: "customer@sentryai.com",
        amount: 12500,
        name: customerName,
        description: `Order from ${business.name}`
      });
      console.log("💳 Payment link generated:", paymentLink);

      await supabase.from("leads").insert({
        conversation_id: conv.id,
        business_id: businessId,
        score: "hot",
        payment_link: paymentLink,
        payment_status: "pending"
      });
    } catch (err) {
      console.error("Paystack error:", err.message);
    }
  }

  // ── Generate reply with payment link context ───────────────────────────────
  const messageToProcess = paymentLink
    ? `${text}\n\n[AGENT INSTRUCTION: Customer is ready to pay. You MUST include this Paystack payment link in your reply: ${paymentLink} — Tell them to click it to pay securely. Do NOT mention bank transfer. Keep reply short and casual.]`
    : text;

  const reply = await generateReply(messageToProcess, business, formattedHistory);
  const finalReply = reply;
  // ── Save outbound message ──────────────────────────────────────────────────
  await supabase.from("messages").insert({
    conversation_id: conv.id,
    platform,
    direction: "outbound",
    content: finalReply,
    message_type: "text",
    sender: "SentryAI"
  });

  return { reply: finalReply, conv };
}

// ── Telegram ──────────────────────────────────────────────────────────────────
router.post("/telegram", async (req, res) => {
  res.sendStatus(200);
  try {
    const msg = req.body.message;
    if (!msg || !msg.text) return;

    const chatId = msg.chat.id.toString();
    const text = msg.text;
    const customerName = msg.from?.first_name || "Customer";

    console.log(`📩 Telegram from ${customerName}: ${text}`);

    const result = await handleMessage({
      platform: "telegram",
      customerId: chatId,
      customerName,
      text,
      rawBody: req.body
    });

    if (result) {
      await sendTelegram(chatId, result.reply);
      console.log(`🤖 Telegram reply: ${result.reply}`);
    }
  } catch (err) {
    console.error("Telegram error:", err.message);
  }
});

// ── WhatsApp ──────────────────────────────────────────────────────────────────
router.post("/meta", async (req, res) => {
  res.sendStatus(200);
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    const msg = messages[0];
    if (msg.type !== "text") return;

    const from = msg.from;
    const text = msg.text.body;
    const customerName = value.contacts?.[0]?.profile?.name || "Customer";

    console.log(`📩 WhatsApp from ${customerName} (${from}): ${text}`);

    const result = await handleMessage({
      platform: "whatsapp",
      customerId: from,
      customerName,
      text,
      rawBody: req.body
    });

    if (result) {
      await sendWhatsApp(from, result.reply);
      console.log(`🤖 WhatsApp reply: ${result.reply}`);
    }
  } catch (err) {
    console.error("WhatsApp error:", err.message);
  }
});

// ── Meta webhook verification ─────────────────────────────────────────────────
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
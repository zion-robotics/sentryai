const supabase = require("./supabase");
const { generateReply } = require("./qwen");
const { sendTelegram, sendWhatsApp } = require("./messenger");

async function scheduleFollowUp(conversationId, businessId) {
  const followUpAt = new Date();
  followUpAt.setHours(followUpAt.getHours() + 24);

  await supabase
    .from("leads")
    .upsert({
      conversation_id: conversationId,
      business_id: businessId,
      score: "warm",
      follow_up_count: 0,
      next_follow_up_at: followUpAt.toISOString(),
      payment_status: "pending"
    }, { onConflict: "conversation_id" });

  console.log(`📅 Follow-up scheduled for ${followUpAt.toLocaleString()}`);
}

async function processFollowUps() {
  console.log("🔄 Checking follow-ups...");

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*, conversations(*)")
    .lte("next_follow_up_at", new Date().toISOString())
    .lt("follow_up_count", 3)
    .eq("payment_status", "pending");

  if (error) {
    console.error("Follow-up fetch error:", error.message);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log("No follow-ups due right now");
    return;
  }

  for (const lead of leads) {
    const conv = lead.conversations;
    if (!conv) continue;

    console.log(`📬 Sending follow-up ${lead.follow_up_count + 1} to ${conv.customer_name} on ${conv.platform}`);

    try {
      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", conv.business_id)
        .single();

      const { data: history } = await supabase
        .from("messages")
        .select("direction, content")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(4);

      const formattedHistory = (history || []).reverse().map(m => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content
      }));

      const followUpPrompt = lead.follow_up_count === 0
        ? `[SYSTEM: This is a follow-up message. The customer showed interest earlier but has not responded. Send a short, friendly follow-up. Do not mention you are an AI. Keep it very casual — like a friend checking in. Maximum 2 sentences.]`
        : `[SYSTEM: This is a second follow-up. Customer still hasn't responded. Make it shorter and add a light sense of urgency — maybe stock is limited or offer expires soon. Maximum 2 sentences.]`;

      const reply = await generateReply(followUpPrompt, business, formattedHistory);

      // Send on correct platform
      if (conv.platform === "telegram") {
        await sendTelegram(conv.customer_id, reply);
      } else if (conv.platform === "whatsapp") {
        await sendWhatsApp(conv.customer_id, reply);
      }

      // Save follow-up message
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        platform: conv.platform,
        direction: "outbound",
        content: reply,
        message_type: "text",
        sender: "SentryAI (follow-up)"
      });

      // Schedule next follow-up or stop
      const nextFollowUpCount = lead.follow_up_count + 1;
      const nextFollowUpAt = new Date();

      if (nextFollowUpCount < 2) {
        nextFollowUpAt.setHours(nextFollowUpAt.getHours() + 24);
        await supabase
          .from("leads")
          .update({
            follow_up_count: nextFollowUpCount,
            next_follow_up_at: nextFollowUpAt.toISOString()
          })
          .eq("id", lead.id);
        console.log(`✅ Follow-up sent. Next scheduled for ${nextFollowUpAt.toLocaleString()}`);
      } else {
        // Stop following up — mark cold
        await supabase
          .from("leads")
          .update({
            follow_up_count: nextFollowUpCount,
            next_follow_up_at: null,
            score: "cold"
          })
          .eq("id", lead.id);

        await supabase
          .from("conversations")
          .update({ lead_score: "cold" })
          .eq("id", conv.id);

        console.log(`❄️ ${conv.customer_name} marked cold after 2 follow-ups`);
      }
    } catch (err) {
      console.error(`Follow-up error for ${conv.customer_name}:`, err.message);
    }
  }
}

module.exports = { scheduleFollowUp, processFollowUps };
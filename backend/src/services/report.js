const supabase = require("./supabase");
const { chat } = require("./qwen");
const { sendTelegram, sendWhatsApp } = require("./messenger");

async function generateDailyReport(businessId) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Total inbound messages yesterday
  const { count: totalMessages } = await supabase
    .from("messages")
    .select("*, conversations!inner(business_id)", { count: "exact", head: true })
    .eq("direction", "inbound")
    .eq("conversations.business_id", businessId)
    .gte("created_at", yesterday.toISOString())
    .lt("created_at", todayStart.toISOString());

  // Conversations by lead score (current state)
  const { data: convs } = await supabase
    .from("conversations")
    .select("lead_score, status, platform")
    .eq("business_id", businessId);

  const hot    = convs?.filter(c => c.lead_score === "hot").length || 0;
  const warm   = convs?.filter(c => c.lead_score === "warm").length || 0;
  const cold   = convs?.filter(c => c.lead_score === "cold").length || 0;
  const closed = convs?.filter(c => c.status === "closed").length || 0;

  // Platform breakdown yesterday
  const { data: msgsByPlatform } = await supabase
    .from("messages")
    .select("platform, conversations!inner(business_id)")
    .eq("direction", "inbound")
    .eq("conversations.business_id", businessId)
    .gte("created_at", yesterday.toISOString())
    .lt("created_at", todayStart.toISOString());

  const platformCounts = {};
  (msgsByPlatform || []).forEach(m => {
    platformCounts[m.platform] = (platformCounts[m.platform] || 0) + 1;
  });

  const topPlatform = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])[0];

  // Revenue from payment links generated yesterday
  const { data: leads } = await supabase
    .from("leads")
    .select("payment_status, business_id, created_at")
    .eq("business_id", businessId)
    .gte("created_at", yesterday.toISOString())
    .lt("created_at", todayStart.toISOString());

  const paymentsGenerated = leads?.length || 0;

  // Conversations needing attention (hot leads with no recent AI reply, or paused agent)
  const { data: needsAttention } = await supabase
    .from("conversations")
    .select("customer_name, platform")
    .eq("business_id", businessId)
    .eq("agent_active", false);

  const report = {
    date: yesterday.toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    totalMessages: totalMessages || 0,
    hot, warm, cold, closed,
    topPlatform: topPlatform ? topPlatform[0] : "none",
    topPlatformCount: topPlatform ? topPlatform[1] : 0,
    paymentsGenerated,
    needsAttention: needsAttention?.length || 0,
    needsAttentionNames: (needsAttention || []).map(c => c.customer_name).slice(0, 3)
  };

  return report;
}

async function formatReportMessage(report, businessName) {
  const prompt = `Write a short, friendly morning business report message for a Nigerian business owner, meant to be sent as a WhatsApp or Telegram text message.

STRICT FORMATTING RULES:
1. Plain text only. Zero markdown of any kind.
2. Never use asterisks, underscores, hashtags, or any bold/italic symbols.
3. Never use em dashes or double hyphens. Use a comma or period instead.
4. Never use bullet points, numbered lists, or line-by-line breakdowns.
5. Write it as flowing natural sentences, like a text message a person would type.
6. Maximum 5 short sentences total.
7. One emoji at the start, and at most one more anywhere else. Never more.
8. Never say "as an AI" or mention you are automated.

Data to include naturally in the sentences:
Business: ${businessName}
Date: ${report.date}
Total messages received: ${report.totalMessages}
Hot leads right now: ${report.hot}
Warm leads: ${report.warm}
Cold leads: ${report.cold}
Closed sales: ${report.closed}
Most active platform: ${report.topPlatform} (${report.topPlatformCount} messages)
Payment links generated: ${report.paymentsGenerated}
Conversations needing attention: ${report.needsAttention}${report.needsAttentionNames.length > 0 ? ` (${report.needsAttentionNames.join(", ")})` : ""}

Write it as one short, warm paragraph. Start with "Good morning!"`;

  let message = await chat([{ role: "user", content: prompt }]);

  // Strip any markdown or em dashes that slip through
  message = message
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/^\s*[-•]\s/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .replace(/—/g, ",")
    .replace(/--/g, ",")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return message;
}

async function sendDailyReport(businessId) {
  console.log(`📊 Generating daily report for business ${businessId}...`);

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (!business) {
    console.error("Business not found for report");
    return;
  }

  const report = await generateDailyReport(businessId);
  const message = await formatReportMessage(report, business.name);

  // Save report to database
  await supabase.from("reports").insert({
    business_id: businessId,
    date: report.date,
    total_messages: report.totalMessages,
    hot_leads: report.hot,
    warm_leads: report.warm,
    cold_leads: report.cold,
    sales_closed: report.closed,
    revenue: 0,
    summary: message
  });

  // Send to owner via Telegram if we have their chat ID
  const ownerChatId = process.env.OWNER_TELEGRAM_ID;
  if (ownerChatId) {
    try {
      await sendTelegram(ownerChatId, message);
      console.log("📊 Daily report sent to owner via Telegram");
    } catch (err) {
      console.error("Failed to send report via Telegram:", err.message);
    }
  } else {
    console.log("📊 Report generated (no owner Telegram ID set):", message);
  }

  return { report, message };
}

module.exports = { generateDailyReport, formatReportMessage, sendDailyReport };
const supabase = require("./supabase");
const { chat } = require("./qwen");
const { sendTelegram, sendWhatsApp } = require("./messenger");
const { sendEmail } = require("./gmail");

async function getRecipientsBySegment(businessId, segment) {
  let query = supabase
    .from("conversations")
    .select("id, platform, customer_id, customer_name, lead_score")
    .eq("business_id", businessId);

  if (segment !== "all") {
    query = query.eq("lead_score", segment);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function generateBroadcastCopy(brief, businessContext) {
  const prompt = "Write a short promotional broadcast message for a Nigerian business based on this brief: " + brief + "\n\nBusiness name: " + businessContext.name + "\nTone: " + businessContext.tone + "\n\nRules to follow strictly:\n1. Plain text only, no markdown, no asterisks, no bullet points, no line breaks\n2. Write it as ONE single paragraph, maximum 2 sentences total\n3. Sound like a real business owner texting customers, not a corporate ad\n4. Include one clear call to action inside the same paragraph\n5. Use at most one emoji\n6. No em dashes, no newlines, no multi-line formatting\n\nReturn only the message text as a single line, nothing else.";

  let result = await chat([{ role: "user", content: prompt }]);

  result = result
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/^\s*[-•]\s/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .replace(/—/g, ",")
    .replace(/–/g, ",")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return result;
}
async function sendBroadcast(businessId, segment, message) {
  const recipients = await getRecipientsBySegment(businessId, segment);

  let sent = 0;
  let failed = 0;
  const results = [];

  for (const recipient of recipients) {
    try {
      if (recipient.platform === "telegram") {
        await sendTelegram(recipient.customer_id, message);
      } else if (recipient.platform === "whatsapp") {
        await sendWhatsApp(recipient.customer_id, message);
      } else if (recipient.platform === "email") {
        await sendEmail(recipient.customer_id, "A message for you", message);
      } else {
        continue;
      }

      await supabase.from("messages").insert({
        conversation_id: recipient.id,
        platform: recipient.platform,
        direction: "outbound",
        content: message,
        message_type: "broadcast",
        sender: "SentryAI Broadcast"
      });

      sent++;
      results.push({ name: recipient.customer_name, platform: recipient.platform, status: "sent" });
      console.log("Broadcast sent to " + recipient.customer_name + " on " + recipient.platform);
    } catch (err) {
      failed++;
      results.push({ name: recipient.customer_name, platform: recipient.platform, status: "failed", error: err.message });
      console.error("Broadcast failed for " + recipient.customer_name + ": " + err.message);
    }
  }

  return { total: recipients.length, sent, failed, results };
}

module.exports = { getRecipientsBySegment, generateBroadcastCopy, sendBroadcast };
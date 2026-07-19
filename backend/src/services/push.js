const webpush = require("web-push");
const supabase = require("./supabase");

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function saveSubscription(businessId, subscription) {
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({
      business_id: businessId,
      endpoint: subscription.endpoint,
      keys: subscription.keys
    }, { onConflict: "endpoint" });

  if (error) throw new Error(error.message);
}

async function sendPushToBusiness(businessId, payload) {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("business_id", businessId);

  if (!subs || subs.length === 0) return { sent: 0 };

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      console.error("Push failed for one subscription:", err.message);
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return { sent };
}

module.exports = { saveSubscription, sendPushToBusiness };
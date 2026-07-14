const express = require("express");
const router = express.Router();
const supabase = require("../services/supabase");

// Get all conversations
router.get("/conversations", async (req, res) => {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
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

module.exports = router;
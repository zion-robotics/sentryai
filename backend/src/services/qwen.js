const axios = require("axios");

const QWEN_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";

async function chat(messages, systemPrompt = "") {
  const response = await axios.post(QWEN_URL, {
    model: "qwen-plus",
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages
    ]
  }, {
    headers: {
      "Authorization": `Bearer ${process.env.QWEN_API_KEY}`,
      "Content-Type": "application/json"
    }
  });
  return response.data.choices[0].message.content;
}

async function classifyMessage(message) {
  const prompt = `You are an AI that classifies customer messages for Nigerian SMEs.

Analyze this message and return ONLY a JSON object with this exact structure:
{
  "intent": "inquiry|complaint|buying|greeting|follow_up|other",
  "lead_score": "hot|warm|cold",
  "language": "english|pidgin|yoruba|hausa|igbo|mixed",
  "summary": "one sentence summary of what customer wants"
}

Rules:
- hot = customer is ready to buy, asking for payment details, account number, or saying "I want to order", "send me the link", "how do I pay", "I go buy", "I wan pay"
- warm = customer is interested but still asking questions
- cold = just browsing, greeting, or casual chat
- Detect Nigerian languages correctly

Message: "${message}"

Return ONLY the JSON object. No explanation. No markdown.`;

  const result = await chat([{ role: "user", content: prompt }]);

  try {
    const cleaned = result.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      intent: "other",
      lead_score: "cold",
      language: "english",
      summary: message
    };
  }
}

async function generateReply(customerMessage, businessContext, conversationHistory = []) {
  const systemPrompt = `You are a customer service agent for ${businessContext.name}. You reply like a real human staff member over WhatsApp or Telegram.

STRICT RULES — follow every single one:
1. Plain text only. Zero markdown. No asterisks, no underscores, no hashtags, no dashes for lists.
2. Never write **bold** or *italic* or __underline__. If you want to emphasize, just write the word normally.
3. Maximum 3 sentences per reply. Be short.
4. Match the customer language exactly. Pidgin gets Pidgin. English gets English. Yoruba gets Yoruba. Igbo gets Igbo.
5. One emoji per reply maximum. Sometimes zero. Never at the start of a line.
6. Never list options unless asked. Never use numbered lists or bullet points.
7. Never say "Certainly", "Absolutely", "Of course", "Great", "Sure thing".
8. Never mention you are an AI.
9. Sound like a human texting on WhatsApp — casual and direct.
10. If customer asks for account details, give the business bank info in plain sentences with no formatting.

Business info:
Name: ${businessContext.name}
Tone: ${businessContext.tone || "friendly"}
Products: ${JSON.stringify(businessContext.catalog)}`;

  const messages = [
    ...conversationHistory.slice(-6),
    { role: "user", content: customerMessage }
  ];

  let reply = await chat(messages, systemPrompt);

  // Strip any markdown that slipped through
  reply = reply
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/^\s*[-•]\s/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .trim();

  return reply;
}

module.exports = { chat, classifyMessage, generateReply };
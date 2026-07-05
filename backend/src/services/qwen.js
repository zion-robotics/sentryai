const Groq = require("groq-sdk");

// Swap this to Qwen when coupon arrives — same code, different client
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

async function chat(messages, systemPrompt = "") {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages
    ]
  });
  return response.choices[0].message.content;
}

async function classifyMessage(message) {
  const prompt = `You are an AI that classifies customer messages for Nigerian SMEs.

Analyze this message and return ONLY a JSON object with this exact structure:
{
  "intent": "inquiry|complaint|buying|greeting|follow_up|other",
  "lead_score": "hot|warm|cold",
  "language": "english|pidgin|yoruba|hausa|mixed",
  "summary": "one sentence summary of what customer wants"
}

Rules:
- hot = customer is ready to buy or asking for payment/price with urgency
- warm = customer is interested but needs more info
- cold = just browsing or greeting
- Pidgin examples: "abeg", "how much e go cost", "oga", "na him"

Message: "${message}"

Return ONLY the JSON, no explanation.`;

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
  const systemPrompt = `You are a smart, friendly customer service agent for "${businessContext.name}".

Your personality:
- Sound like a real human staff member, NEVER robotic
- Match the customer tone and language (if they write Pidgin, reply in Pidgin)
- Be warm, helpful, and concise
- Use emojis naturally but don't overdo it
- Never say "I am an AI" or "As an AI"
- Never use em dashes
- Never use "Certainly!", "Absolutely!", "Of course!"

Business info:
- Name: ${businessContext.name}
- Tone: ${businessContext.tone}
- Products/Services: ${JSON.stringify(businessContext.catalog)}

Keep replies short and conversational. Ask one question at a time.`;

  const messages = [
    ...conversationHistory.slice(-6),
    { role: "user", content: customerMessage }
  ];

  return await chat(messages, systemPrompt);
}

module.exports = { chat, classifyMessage, generateReply };

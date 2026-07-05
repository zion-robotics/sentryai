require("dotenv").config();
const { classifyMessage, generateReply } = require("../services/qwen");

async function test() {
  console.log("Testing Qwen classification...");

  const result1 = await classifyMessage("Abeg how much be this ankara dress?");
  console.log("Pidgin test:", result1);

  const result2 = await classifyMessage("Hi, I want to place an order for 3 pieces");
  console.log("English test:", result2);

  console.log("\nTesting reply generation...");
  const reply = await generateReply(
    "Abeg how much be the ankara?",
    { name: "Tope Fashion", tone: "friendly", catalog: [{ name: "Ankara dress", price: 12500 }] }
  );
  console.log("Reply:", reply);
}

test().catch(console.error);

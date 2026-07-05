const axios = require("axios");

async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

module.exports = { sendTelegram };

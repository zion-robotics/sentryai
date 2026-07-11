const axios = require("axios");

async function createPaymentLink({ email, amount, name, description }) {
  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email: email || "customer@sentryai.com",
      amount: amount * 100, // Paystack uses kobo
      currency: "NGN",
      metadata: {
        customer_name: name,
        description: description
      }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.data.authorization_url;
}

module.exports = { createPaymentLink };
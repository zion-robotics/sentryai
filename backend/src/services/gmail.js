const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

if (process.env.GMAIL_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });
}

function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify"
    ]
  });
}

async function getTokens(code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}

async function sendEmail(to, subject, body) {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body
  ].join("\n");

  const encoded = Buffer.from(message).toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded }
  });
}

async function getUnreadEmails() {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  console.log("📧 Listing unread emails...");
  const { data } = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread in:inbox",
    maxResults: 10
  });

  console.log("📧 Found messages:", data.messages?.length || 0);
  if (!data.messages) return [];

  const emails = [];
  for (const msg of data.messages) {
    console.log("📧 Fetching message ID:", msg.id);
    try {
      const { data: full } = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full"
      });

      const headers = full.payload?.headers || [];
      const from    = headers.find(h => h.name === "From")?.value || ""
      const subject = headers.find(h => h.name === "Subject")?.value || ""
      const body    = extractBody(full.payload)

      emails.push({ id: msg.id, from, subject, body });
    } catch (err) {
      console.error("📧 Error fetching message", msg.id, ":", err.message);
    }
  }

  console.log("📧 Emails fetched:", emails.length);
  return emails;
}

async function markAsRead(messageId) {
  console.log("📧 Marking as read:", messageId);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] }
  });
}

function extractBody(payload) {
  if (!payload) return ""
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8")
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8")
      }
    }
  }
  return ""
}

module.exports = { getAuthUrl, getTokens, sendEmail, getUnreadEmails, markAsRead };
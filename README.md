# SentryAI

Never miss a sale.

SentryAI is an AI agent that reads and replies to customer messages automatically, across every platform a business uses, in whatever language the customer writes in. Built for African SMEs who lose sales every day simply because nobody replied in time.

Live demo: https://sentryai.vercel.app
Backend (Alibaba Cloud): https://sentryai.name.ng
Built for the Qwen Cloud Global AI Hackathon 2026, Track 4, Autopilot Agent

## The problem

Small business owners in Nigeria run their entire operation through their phone, replying to WhatsApp, Telegram, Instagram and email one message at a time. When a customer is not answered fast enough, they simply buy from someone else. Most lost sales are not caused by bad products, they are caused by slow or missed replies.

## What SentryAI does

- Reads incoming messages from WhatsApp, Telegram and Email
- Classifies every message as a hot, warm, or cold lead using Qwen
- Replies in the customer's own language and tone, including Nigerian Pidgin, Yoruba, Igbo and English
- Detects buying intent and automatically generates a real Paystack payment link inside the conversation
- Schedules automatic 24 and 48 hour follow ups for warm leads that go quiet
- Sends the business owner a daily AI written morning report summarizing the previous day
- Lets the business owner send a broadcast campaign to a segment of leads across every connected platform at once
- Supports human takeover, the owner can jump into any conversation and the AI pauses automatically
- Sends real push notifications the moment a hot lead comes in, even when the dashboard is closed
- Works offline as an installable PWA, showing cached conversations when the connection drops

## Architecture

Customer messages arrive on WhatsApp, Telegram or Email and hit a single webhook gateway built in Express. Every message is classified and answered by Qwen, then logged to Supabase. Lead scoring, the follow up scheduler, the Paystack integration and push notifications all run from the same backend process, deployed permanently on an Alibaba Cloud ECS instance with a real domain and SSL certificate. The dashboard is a React and TypeScript PWA, deployed separately on Vercel, and talks to the backend entirely over its public API.

## Tech stack

- Backend: Node.js, Express
- Database: Supabase (PostgreSQL)
- AI: Qwen Cloud API (qwen-plus)
- Frontend: React, TypeScript, Tailwind, Framer Motion, VitePWA
- Payments: Paystack
- Messaging: Telegram Bot API, WhatsApp Business Cloud API (Meta), Gmail API
- Push: web-push with VAPID
- Deployment: Alibaba Cloud ECS (backend), Vercel (frontend), Nginx and Let's Encrypt for HTTPS

## Repository structure

```
backend/    Express API, webhooks, AI logic, integrations
frontend/   React dashboard (PWA)
```

## Running locally

Backend

```
cd backend
npm install
node src/index.js
```

Requires a .env file with Supabase, Qwen, Telegram, Meta, Paystack, Gmail and VAPID credentials.

Frontend

```
cd frontend
npm install
npm run dev
```

Requires VITE_API_URL pointing at a running backend instance.

## Roadmap

Instagram, Facebook, TikTok and Twitter/X integrations, Flutterwave as a second payment option, and a self serve product catalog builder for business owners, all using the same agent architecture already in place.

## Team

Built by Team Apex for the Qwen Cloud Global AI Hackathon 2026.
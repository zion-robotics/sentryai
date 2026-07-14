import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageSquare, Flame, Activity, DollarSign,
  Radio, Settings, Search, Send, Zap,
  UserCheck, Clock, RefreshCw, Bell
} from "lucide-react"

const C = {
  base: "#0B0B14", surface: "#12121E", elevated: "#1A1A28",
  border: "#22223A", red: "#E94560", green: "#22C55E",
  amber: "#F59E0B", blue: "#3B82F6",
  text1: "#F0F0FF", text2: "#8080AA", text3: "#3D3D5C",
}

const P: Record<string, { color: string; label: string }> = {
  whatsapp:  { color: "#25D366", label: "WhatsApp" },
  telegram:  { color: "#2CA5E0", label: "Telegram" },
  instagram: { color: "#E1306C", label: "Instagram" },
  facebook:  { color: "#1877F2", label: "Facebook" },
  tiktok:    { color: "#FF0050", label: "TikTok" },
  email:     { color: "#EA4335", label: "Email" },
  twitter:   { color: "#1DA1F2", label: "X / Twitter" },
}

const SCORE: Record<string, { color: string; label: string }> = {
  hot:  { color: "#FF4444", label: "Hot" },
  warm: { color: "#F59E0B", label: "Warm" },
  cold: { color: "#3B82F6", label: "Cold" },
}

const PIPELINE = {
  hot: [
    { name: "Chioma A.",   platform: "whatsapp",  value: "₦37,500",  note: "Wants 3 ankara pieces — ready to pay" },
    { name: "Mr. Adeyemi", platform: "email",     value: "₦450,000", note: "Bulk uniform order x50 staff" },
    { name: "Mrs. Eze",    platform: "whatsapp",  value: "₦12,500",  note: "Payment confirmed — awaiting delivery" },
    { name: "Bola K.",     platform: "instagram", value: "₦25,000",  note: "Custom bridal order requested" },
  ],
  warm: [
    { name: "David O.",    platform: "telegram",  value: "₦45,000",  note: "Asking about aso-ebi packages" },
    { name: "Fatima M.",   platform: "instagram", value: "₦18,000",  note: "Interested in custom orders" },
    { name: "Tunde B.",    platform: "tiktok",    value: "₦12,500",  note: "Delivery inquiry — Lagos Island" },
  ],
  cold: [
    { name: "Grace N.",     platform: "facebook", value: "—", note: "Delivery timeline question only" },
    { name: "@sade_styles", platform: "twitter",  value: "—", note: "Wedding collection interest" },
  ],
}

const ACTIVITY = [
  { time: "2m ago",  icon: "reply",   color: C.green, text: "Replied to Chioma on WhatsApp",    sub: "Quoted ₦37,500 for 3 ankara pieces" },
  { time: "8m ago",  icon: "score",   color: C.blue,  text: "Classified David as Warm lead",     sub: "Follow-up scheduled for 24hrs" },
  { time: "22m ago", icon: "reply",   color: C.green, text: "Replied to Mr. Adeyemi via Email",  sub: "Requested measurements for bulk order" },
  { time: "41m ago", icon: "reply",   color: C.green, text: "Replied to Tunde on TikTok",        sub: "Confirmed Lagos Island delivery" },
  { time: "1h ago",  icon: "follow",  color: C.amber, text: "Follow-up sent to Mrs. Bello",      sub: "48hr auto follow-up — no response yet" },
  { time: "2h ago",  icon: "payment", color: C.red,   text: "Payment link sent to Emeka",        sub: "Paystack link — ₦25,000 pending" },
  { time: "3h ago",  icon: "closed",  color: C.green, text: "Kemi marked as Closed",             sub: "Payment confirmed, delivery scheduled" },
]

// ── Small components ──────────────────────────────────────────────────────────
function PBadge({ platform }: { platform: string }) {
  const p = P[platform]
  if (!p) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
      color: p.color, background: p.color + "18", border: `1px solid ${p.color}30`,
      whiteSpace: "nowrap" as const,
    }}>{p.label}</span>
  )
}

function SBadge({ score }: { score: string }) {
  const s = SCORE[score]
  if (!s) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px",
      borderRadius: 20, color: s.color, background: s.color + "18",
    }}>{s.label}</span>
  )
}

function Avatar({ name, platform, size = 36 }: { name: string; platform: string; size?: number }) {
  const p = P[platform]
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: p ? p.color + "22" : C.elevated,
      border: `2px solid ${p ? p.color + "40" : C.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: p?.color || C.text2,
      flexShrink: 0, fontFamily: "'Space Grotesk', sans-serif",
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function Dot({ color }: { color: string }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0,
    }} />
  )
}

// ── Inbox ─────────────────────────────────────────────────────────────────────
function Inbox() {
  const API = import.meta.env.VITE_API_URL
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  async function loadConversations() {
    try {
      const res = await fetch(`${API}/api/conversations`)
      const data = await res.json()
      setConversations(data)
      if (!selId && data.length > 0) setSelId(data[0].id)
    } catch (e) {
      console.error("Failed to load conversations", e)
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(id: string) {
    try {
      const res = await fetch(`${API}/api/conversations/${id}/messages`)
      const data = await res.json()
      setMessages(data)
    } catch (e) {
      console.error("Failed to load messages", e)
    }
  }

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selId) loadMessages(selId)
    const interval = setInterval(() => { if (selId) loadMessages(selId) }, 3000)
    return () => clearInterval(interval)
  }, [selId])

  const filtered = filter === "all" ? conversations : conversations.filter(c => c.lead_score === filter)
  const active = conversations.find(c => c.id === selId)

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.text3, fontSize: 13 }}>
      Loading conversations...
    </div>
  )

  if (!loading && conversations.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
      <MessageSquare size={40} color={C.text3} />
      <p style={{ color: C.text1, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>No conversations yet</p>
      <p style={{ color: C.text3, fontSize: 13 }}>Send a message to your Telegram or WhatsApp bot to get started</p>
    </div>
  )

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%" }}>

      {/* List panel */}
      <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.elevated, borderRadius: 8, padding: "8px 12px", border: `1px solid ${C.border}` }}>
            <Search size={13} color={C.text3} />
            <input placeholder="Search conversations…" style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: C.text1, flex: 1, fontFamily: "'Inter', sans-serif" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
          {["all", "hot", "warm", "cold"].map(f => {
            const isF = filter === f
            const color = f === "all" ? C.red : SCORE[f]?.color || C.red
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: "5px 0", borderRadius: 6, border: "none",
                cursor: "pointer", fontSize: 11, fontWeight: 600,
                textTransform: "capitalize" as const,
                background: isF ? color + "22" : "transparent",
                color: isF ? color : C.text3,
                fontFamily: "'Inter', sans-serif",
              }}>{f}</button>
            )
          })}
        </div>

        <div style={{ flex: 1, overflowY: "auto" as const }}>
          {filtered.map(conv => {
            const isS = selId === conv.id
            return (
              <motion.div
                key={conv.id}
                onClick={() => setSelId(conv.id)}
                whileHover={{ backgroundColor: C.elevated }}
                style={{
                  padding: "14px 16px", cursor: "pointer",
                  borderBottom: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${isS ? C.red : "transparent"}`,
                  background: isS ? C.elevated : "transparent",
                }}
              >
                <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <Avatar name={conv.customer_name || "?"} platform={conv.platform} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text1, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {conv.customer_name}
                      </span>
                      <span style={{ fontSize: 11, color: C.text3, flexShrink: 0, marginLeft: 6 }}>
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: C.text2, marginBottom: 7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      No messages yet
                    </p>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <PBadge platform={conv.platform} />
                      <SBadge score={conv.lead_score} />
                      {conv.agent_active && <span style={{ fontSize: 10, color: C.green }}>✓ AI active</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Chat panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {active ? (
          <>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={active.customer_name || "?"} platform={active.platform} size={40} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text1, fontFamily: "'Space Grotesk', sans-serif" }}>{active.customer_name}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <PBadge platform={active.platform} />
                    <SBadge score={active.lead_score} />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "transparent", border: `1px solid ${C.red}`, color: C.red, cursor: "pointer" }}>
                  Take Over
                </button>
                <button style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: C.green + "18", border: `1px solid ${C.green}30`, color: C.green, cursor: "pointer" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
                    Agent Active
                  </span>
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" as const, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((msg: any) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: "flex", justifyContent: msg.direction === "inbound" ? "flex-start" : "flex-end" }}
                >
                  <div style={{
                    maxWidth: "65%",
                    background: msg.direction === "inbound" ? C.elevated : C.red,
                    borderRadius: msg.direction === "inbound" ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                    padding: "10px 14px", fontSize: 13, lineHeight: 1.5, color: "#fff",
                    border: msg.direction === "inbound" ? `1px solid ${C.border}` : "none"
                  }}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {messages.length === 0 && (
                <div style={{ textAlign: "center" as const, color: C.text3, fontSize: 13, marginTop: 40 }}>
                  No messages in this conversation yet
                </div>
              )}
            </div>

            <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.elevated, borderRadius: 12, padding: "11px 16px", border: `1px solid ${C.border}` }}>
                <input placeholder="Type to take over this conversation…" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: C.text1, fontFamily: "'Inter', sans-serif" }} />
                <button style={{ background: "none", border: "none", cursor: "pointer", color: C.red }}><Send size={16} /></button>
              </div>
              <p style={{ fontSize: 10, color: C.text3, textAlign: "center" as const, marginTop: 6 }}>Typing here pauses the AI and lets you respond manually</p>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <MessageSquare size={40} color={C.text3} />
            <p style={{ color: C.text2, fontSize: 13 }}>Select a conversation to view messages</p>
          </div>
        )}
      </div>

      {/* Lead panel */}
      {active && (
        <div style={{ width: 240, flexShrink: 0, borderLeft: `1px solid ${C.border}`, padding: "20px 16px", overflowY: "auto" as const, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 12 }}>Lead Info</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Platform", value: <PBadge platform={active.platform} /> },
                { label: "Score",    value: <SBadge score={active.lead_score} /> },
                { label: "Status",   value: active.status },
                { label: "Agent",    value: active.agent_active ? "Active" : "Paused" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: C.text3 }}>{label}</span>
                  <span style={{ fontSize: 11, color: C.text2 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: C.border }} />
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 10 }}>Quick Actions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { label: "Send Payment Link",   color: C.green },
                { label: "Schedule Follow-up",  color: C.amber },
                { label: "Mark as Closed",      color: C.red   },
              ].map(({ label, color }) => (
                <button key={label} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${color}30`, background: color + "12", color, fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left" as const, fontFamily: "'Inter', sans-serif" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
function Pipeline() {
  const cols = [
    { key: "hot",  label: "Hot Leads",  color: "#FF4444", leads: PIPELINE.hot  },
    { key: "warm", label: "Warm Leads", color: C.amber,   leads: PIPELINE.warm },
    { key: "cold", label: "Cold Leads", color: C.blue,    leads: PIPELINE.cold },
  ]
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, height: "100%", overflow: "hidden" }}>
      {cols.map(col => (
        <div key={col.key} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Dot color={col.color} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text1, fontFamily: "'Space Grotesk', sans-serif" }}>{col.label}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: col.color + "20", color: col.color }}>{col.leads.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" as const, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {col.leads.map((lead, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                style={{ background: C.elevated, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}`, cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text1, fontFamily: "'Space Grotesk', sans-serif" }}>{lead.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>{lead.value}</span>
                </div>
                <p style={{ fontSize: 11, color: C.text2, marginBottom: 8, lineHeight: 1.4 }}>{lead.note}</p>
                <PBadge platform={lead.platform} />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Activity ──────────────────────────────────────────────────────────────────
function ActivityLog() {
  const iconMap: Record<string, React.ReactNode> = {
    reply:   <Send size={13} />,
    score:   <Zap size={13} />,
    follow:  <Clock size={13} />,
    payment: <DollarSign size={13} />,
    closed:  <UserCheck size={13} />,
  }
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
      {ACTIVITY.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          style={{ display: "flex", alignItems: "flex-start", gap: 14, background: C.surface, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: item.color + "20", color: item.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {iconMap[item.icon]}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: C.text1, marginBottom: 3 }}>{item.text}</p>
            <p style={{ fontSize: 11, color: C.text2 }}>{item.sub}</p>
          </div>
          <span style={{ fontSize: 11, color: C.text3, flexShrink: 0 }}>{item.time}</span>
        </motion.div>
      ))}
    </div>
  )
}

// ── Revenue ───────────────────────────────────────────────────────────────────
function Revenue() {
  const cards = [
    { label: "Today's Revenue",     value: "₦284,000", sub: "11 sales closed",     color: C.green },
    { label: "This Week",           value: "₦892,000", sub: "43 sales closed",     color: C.blue  },
    { label: "Pending Payments",    value: "₦245,000", sub: "7 awaiting",          color: C.amber },
    { label: "Est. Missed Revenue", value: "₦180,000", sub: "From no-reply leads", color: C.red   },
  ]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{ background: C.surface, borderRadius: 12, padding: "20px", border: `1px solid ${c.color}25` }}
          >
            <p style={{ fontSize: 11, color: C.text3, marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{c.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: c.color, marginBottom: 4, fontFamily: "'Space Grotesk', sans-serif" }}>{c.value}</p>
            <p style={{ fontSize: 11, color: C.text2 }}>{c.sub}</p>
          </motion.div>
        ))}
      </div>
      <div style={{ background: C.surface, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.text1, marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif" }}>Platform Breakdown</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(P).map(([key, p]) => {
            const pct = key === "whatsapp" ? 45 : key === "telegram" ? 25 : key === "instagram" ? 15 : 5
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 90, fontSize: 12, color: C.text2, flexShrink: 0 }}>{p.label}</span>
                <div style={{ flex: 1, height: 6, background: C.elevated, borderRadius: 3, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    style={{ height: "100%", background: p.color, borderRadius: 3 }}
                  />
                </div>
                <span style={{ width: 30, fontSize: 11, color: C.text3, textAlign: "right" as const }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Nav + Stats ───────────────────────────────────────────────────────────────
const NAV = [
  { id: "inbox",     Icon: MessageSquare, label: "Inbox",     badge: 89   },
  { id: "pipeline",  Icon: Flame,         label: "Pipeline",  badge: 4    },
  { id: "activity",  Icon: Activity,      label: "Activity",  badge: null },
  { id: "revenue",   Icon: DollarSign,    label: "Revenue",   badge: null },
  { id: "broadcast", Icon: Radio,         label: "Broadcast", badge: null },
  { id: "settings",  Icon: Settings,      label: "Settings",  badge: null },
]

const STATS = [
  { label: "Messages",  value: "89",       color: C.text1   },
  { label: "Hot Leads", value: "4",        color: "#FF4444" },
  { label: "Warm",      value: "12",       color: C.amber   },
  { label: "Closed",    value: "11",       color: C.green   },
  { label: "Revenue",   value: "₦284k",    color: C.green   },
  { label: "Platforms", value: "6 active", color: C.blue    },
]

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("inbox")

  const content: Record<string, React.ReactNode> = {
    inbox:     <Inbox />,
    pipeline:  <Pipeline />,
    activity:  <ActivityLog />,
    revenue:   <Revenue />,
    broadcast: (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 12 }}>
        <Radio size={40} color={C.red} />
        <p style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: "'Space Grotesk', sans-serif" }}>Broadcast</p>
        <p style={{ fontSize: 13, color: C.text2 }}>Send campaigns across all platforms at once. Coming Day 4.</p>
      </div>
    ),
    settings: (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 12 }}>
        <Settings size={40} color={C.text3} />
        <p style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: "'Space Grotesk', sans-serif" }}>Settings</p>
        <p style={{ fontSize: 13, color: C.text2 }}>Business profile, catalog, and integrations. Coming Day 5.</p>
      </div>
    ),
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: C.base, overflow: "hidden" }}>

      {/* Sidebar */}
      <aside style={{ width: 56, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, flexShrink: 0 }}>
          <Zap size={16} color="#fff" fill="#fff" />
        </div>
        {NAV.map(({ id, Icon, label, badge }) => {
          const isA = active === id
          return (
            <div key={id} style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setActive(id)}
                title={label}
                style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: isA ? C.red : "transparent", color: isA ? "#fff" : C.text3, transition: "all .15s", position: "relative" }}
              >
                <Icon size={18} />
                {badge && (
                  <span style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: "50%", background: isA ? "#ffffff55" : C.red, fontSize: 8, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </motion.button>
            </div>
          )
        })}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingBottom: 8 }}>
          <Bell size={16} color={C.text3} style={{ cursor: "pointer" }} />
          <RefreshCw size={14} color={C.text3} style={{ cursor: "pointer" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}`, marginTop: 4 }} />
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Stats bar */}
        <div style={{ height: 44, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 24 }}>
          {STATS.map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: C.text3 }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</span>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          {Object.entries(P).slice(0, 5).map(([key, p]) => (
            <div key={key} title={p.label} style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          ))}
          <span style={{ fontSize: 11, color: C.text3 }}>+2</span>
        </div>

        {/* Page header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: C.text1, fontFamily: "'Space Grotesk', sans-serif", textTransform: "capitalize" as const }}>
              {NAV.find(n => n.id === active)?.label}
            </h1>
            <p style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>SentryAI Demo Business</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.green + "15", border: `1px solid ${C.green}25`, padding: "5px 10px", borderRadius: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: C.green }}>Agent Active</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", padding: active === "inbox" ? 0 : 20 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ height: "100%", overflow: active === "inbox" ? "hidden" : "auto" }}
            >
              {content[active]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
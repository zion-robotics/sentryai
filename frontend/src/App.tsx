import React, { useState, useEffect, useContext, createContext, useMemo } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  MessageSquare, Flame, Activity, DollarSign,
  Radio, Settings, Search, Send, Zap,
  UserCheck, Clock, RefreshCw, Bell, Sun, Moon
} from "lucide-react"

// ── Font injection (Manrope / Inter / IBM Plex Mono) ───────────────────────────
function useFonts() {
  useEffect(() => {
    if (document.getElementById("sentryai-fonts")) return
    const link = document.createElement("link")
    link.id = "sentryai-fonts"
    link.rel = "stylesheet"
    link.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap"
    document.head.appendChild(link)
  }, [])
}

const FONT_DISPLAY = "'Manrope', sans-serif"
const FONT_BODY = "'Inter', sans-serif"
const FONT_MONO = "'IBM Plex Mono', monospace"

// ── Theme tokens ────────────────────────────────────────────────────────────────
const THEMES = {
  light: {
    mode: "light" as const,
    bg: "#F3F7F7",
    meshA: "#CFEFE9", meshB: "#E8F6F3",
    surface: "rgba(255,255,255,0.62)",
    surfaceStrong: "rgba(255,255,255,0.85)",
    elevated: "rgba(255,255,255,0.9)",
    border: "rgba(14,27,27,0.09)",
    hairline: "rgba(14,27,27,0.06)",
    ink: "#0E1B1B",
    muted: "#5C7370",
    faint: "#93A6A3",
    teal: "#0F9C93",
    tealDeep: "#0B7A73",
    tealSoft: "rgba(15,156,147,0.12)",
    red: "#E23744", redSoft: "rgba(226,55,68,0.10)",
    amber: "#C77700", amberSoft: "rgba(199,119,0,0.12)",
    blue: "#2563EB", blueSoft: "rgba(37,99,235,0.10)",
    green: "#0F9C63", greenSoft: "rgba(15,156,99,0.10)",
    neuLight: "rgba(255,255,255,0.95)",
    neuDark: "rgba(160,180,178,0.45)",
  },
  dark: {
    mode: "dark" as const,
    bg: "#0A1414",
    meshA: "#0F2B28", meshB: "#0A1B1A",
    surface: "rgba(20,36,36,0.55)",
    surfaceStrong: "rgba(22,40,40,0.78)",
    elevated: "rgba(26,46,46,0.85)",
    border: "rgba(234,246,244,0.09)",
    hairline: "rgba(234,246,244,0.06)",
    ink: "#EAF6F4",
    muted: "#8FA9A6",
    faint: "#5A716E",
    teal: "#2DD4C4",
    tealDeep: "#14B8A6",
    tealSoft: "rgba(45,212,196,0.14)",
    red: "#FF6B76", redSoft: "rgba(255,107,118,0.12)",
    amber: "#F5A623", amberSoft: "rgba(245,166,35,0.13)",
    blue: "#5B9CFF", blueSoft: "rgba(91,156,255,0.12)",
    green: "#3DDC97", greenSoft: "rgba(61,220,151,0.12)",
    neuLight: "rgba(40,64,64,0.5)",
    neuDark: "rgba(0,0,0,0.4)",
  },
}
type Theme = typeof THEMES.light

const ThemeCtx = createContext<{ t: Theme; mode: "light" | "dark"; toggle: () => void }>({
  t: THEMES.light, mode: "light", toggle: () => {},
})
const useTheme = () => useContext(ThemeCtx)

// Neumorphic soft-shadow helper (used sparingly: toggle, filter pills, nav icons)
function neu(t: Theme, pressed = false) {
  if (pressed) {
    return t.mode === "light"
      ? `inset 3px 3px 6px ${t.neuDark}, inset -3px -3px 6px ${t.neuLight}`
      : `inset 3px 3px 6px ${t.neuDark}, inset -2px -2px 5px ${t.neuLight}`
  }
  return t.mode === "light"
    ? `4px 4px 10px ${t.neuDark}, -4px -4px 10px ${t.neuLight}`
    : `4px 4px 10px ${t.neuDark}, -3px -3px 8px ${t.neuLight}`
}
function glass(t: Theme, strong = false) {
  return {
    background: strong ? t.surfaceStrong : t.surface,
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    border: `1px solid ${t.border}`,
  }
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
  { time: "2m ago",  icon: "reply",   text: "Replied to Chioma on WhatsApp",    sub: "Quoted ₦37,500 for 3 ankara pieces" },
  { time: "8m ago",  icon: "score",   text: "Classified David as Warm lead",     sub: "Follow-up scheduled for 24hrs" },
  { time: "22m ago", icon: "reply",   text: "Replied to Mr. Adeyemi via Email",  sub: "Requested measurements for bulk order" },
  { time: "41m ago", icon: "reply",   text: "Replied to Tunde on TikTok",        sub: "Confirmed Lagos Island delivery" },
  { time: "1h ago",  icon: "follow",  text: "Follow-up sent to Mrs. Bello",      sub: "48hr auto follow-up — no response yet" },
  { time: "2h ago",  icon: "payment", text: "Payment link sent to Emeka",        sub: "Paystack link — ₦25,000 pending" },
  { time: "3h ago",  icon: "closed",  text: "Kemi marked as Closed",             sub: "Payment confirmed, delivery scheduled" },
]

// ── Animated mesh background ───────────────────────────────────────────────────
function MeshBackground() {
  const { t } = useTheme()
  const reduce = useReducedMotion()
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", background: t.bg }}>
      <motion.div
        animate={reduce ? {} : { x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", top: "-20%", left: "-10%", width: "60%", height: "60%", borderRadius: "50%", background: `radial-gradient(circle, ${t.meshA} 0%, transparent 70%)`, filter: "blur(60px)", opacity: 0.6 }}
      />
      <motion.div
        animate={reduce ? {} : { x: [0, -30, 20, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", bottom: "-25%", right: "-10%", width: "55%", height: "55%", borderRadius: "50%", background: `radial-gradient(circle, ${t.meshB} 0%, transparent 70%)`, filter: "blur(70px)", opacity: 0.5 }}
      />
    </div>
  )
}

// ── Theme toggle (signature neumorphic element) ────────────────────────────────
function ThemeToggle() {
  const { t, mode, toggle } = useTheme()
  const reduce = useReducedMotion()
  const isDark = mode === "dark"
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 52, height: 28, borderRadius: 20, border: "none", cursor: "pointer",
        position: "relative", background: t.bg, boxShadow: neu(t, true),
        display: "flex", alignItems: "center", padding: 3, flexShrink: 0,
      }}
    >
      <motion.div
        layout
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30 }}
        style={{
          width: 22, height: 22, borderRadius: "50%",
          background: `linear-gradient(135deg, ${t.teal}, ${t.tealDeep})`,
          boxShadow: `0 2px 6px ${t.tealSoft}, 0 0 10px ${t.tealSoft}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginLeft: isDark ? 24 : 0,
        }}
      >
        {isDark ? <Moon size={12} color="#fff" /> : <Sun size={12} color="#fff" />}
      </motion.div>
    </button>
  )
}

// ── Small components ──────────────────────────────────────────────────────────
function PBadge({ platform }: { platform: string }) {
  const p = P[platform]
  if (!p) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      color: p.color, background: p.color + "18", border: `1px solid ${p.color}35`,
      whiteSpace: "nowrap" as const, fontFamily: FONT_BODY,
    }}>{p.label}</span>
  )
}

function SBadge({ score }: { score: string }) {
  const { t } = useTheme()
  const map: Record<string, { color: string; soft: string; label: string }> = {
    hot: { color: t.red, soft: t.redSoft, label: "Hot" },
    warm: { color: t.amber, soft: t.amberSoft, label: "Warm" },
    cold: { color: t.blue, soft: t.blueSoft, label: "Cold" },
  }
  const s = map[score]
  if (!s) return null
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: s.color, background: s.soft, fontFamily: FONT_BODY }}>
      {s.label}
    </span>
  )
}

function Avatar({ name, platform, size = 36 }: { name: string; platform: string; size?: number }) {
  const { t } = useTheme()
  const p = P[platform]
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: p ? p.color + "22" : t.tealSoft,
      border: `2px solid ${p ? p.color + "45" : t.teal + "40"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: p?.color || t.teal,
      flexShrink: 0, fontFamily: FONT_DISPLAY,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function Dot({ color, glow = true }: { color: string; glow?: boolean }) {
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: glow ? `0 0 6px ${color}` : "none", flexShrink: 0 }} />
}

// ── Inbox ─────────────────────────────────────────────────────────────────────
function Inbox() {
  const { t } = useTheme()
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
  const filterColor = (f: string) => f === "hot" ? t.red : f === "warm" ? t.amber : f === "cold" ? t.blue : t.teal

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.faint, fontSize: 13, fontFamily: FONT_BODY }}>
      Loading conversations…
    </div>
  )

  if (!loading && conversations.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
      <MessageSquare size={40} color={t.faint} aria-hidden="true" />
      <p style={{ color: t.ink, fontWeight: 700, fontFamily: FONT_DISPLAY }}>No conversations yet</p>
      <p style={{ color: t.faint, fontSize: 13, fontFamily: FONT_BODY }}>Send a message to your Telegram or WhatsApp bot to get started</p>
    </div>
  )

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%", gap: 14, padding: 14 }}>

      {/* List panel */}
      <div style={{ width: 300, flexShrink: 0, borderRadius: 18, display: "flex", flexDirection: "column", overflow: "hidden", ...glass(t) }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${t.hairline}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: t.bg, borderRadius: 10, padding: "9px 12px", boxShadow: neu(t, true) }}>
            <Search size={13} color={t.faint} aria-hidden="true" />
            <input aria-label="Search conversations" placeholder="Search conversations…" style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: t.ink, flex: 1, fontFamily: FONT_BODY }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "10px 14px", borderBottom: `1px solid ${t.hairline}` }}>
          {["all", "hot", "warm", "cold"].map(f => {
            const isF = filter === f
            const color = filterColor(f)
            return (
              <motion.button
                key={f}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(f)}
                aria-pressed={isF}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 10, border: "none",
                  cursor: "pointer", fontSize: 11, fontWeight: 700,
                  textTransform: "capitalize" as const, minHeight: 30,
                  background: t.bg,
                  boxShadow: isF ? neu(t, true) : neu(t, false),
                  color: isF ? color : t.muted,
                  fontFamily: FONT_BODY, transition: "color .15s",
                }}
              >{f}</motion.button>
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
                whileHover={{ x: 2 }}
                style={{
                  padding: "14px 16px", cursor: "pointer",
                  borderBottom: `1px solid ${t.hairline}`,
                  borderLeft: `3px solid ${isS ? t.teal : "transparent"}`,
                  background: isS ? t.tealSoft : "transparent",
                }}
              >
                <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <Avatar name={conv.customer_name || "?"} platform={conv.platform} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY }}>
                        {conv.customer_name}
                      </span>
                      <span style={{ fontSize: 11, color: t.faint, flexShrink: 0, marginLeft: 6, fontFamily: FONT_MONO }}>
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: t.muted, marginBottom: 7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, fontFamily: FONT_BODY }}>
                      No messages yet
                    </p>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <PBadge platform={conv.platform} />
                      <SBadge score={conv.lead_score} />
                      {conv.agent_active && <span style={{ fontSize: 10, color: t.green, fontFamily: FONT_BODY }}>✓ AI active</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Chat panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 18, ...glass(t) }}>
        {active ? (
          <>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${t.hairline}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={active.customer_name || "?"} platform={active.platform} size={40} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY }}>{active.customer_name}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <PBadge platform={active.platform} />
                    <SBadge score={active.lead_score} />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <motion.button whileTap={{ scale: 0.96 }} style={{ padding: "8px 16px", minHeight: 36, borderRadius: 10, fontSize: 12, fontWeight: 700, background: "transparent", border: `1px solid ${t.red}50`, color: t.red, cursor: "pointer", fontFamily: FONT_BODY }}>
                  Take Over
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} style={{ padding: "8px 16px", minHeight: 36, borderRadius: 10, fontSize: 12, fontWeight: 700, background: t.greenSoft, border: `1px solid ${t.green}35`, color: t.green, cursor: "pointer", fontFamily: FONT_BODY }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.green }} />
                    Agent Active
                  </span>
                </motion.button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" as const, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((msg: any) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  style={{ display: "flex", justifyContent: msg.direction === "inbound" ? "flex-start" : "flex-end" }}
                >
                  <div style={{
                    maxWidth: "65%",
                    background: msg.direction === "inbound" ? t.elevated : `linear-gradient(135deg, ${t.teal}, ${t.tealDeep})`,
                    borderRadius: msg.direction === "inbound" ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                    padding: "10px 14px", fontSize: 13, lineHeight: 1.5,
                    color: msg.direction === "inbound" ? t.ink : "#fff",
                    border: msg.direction === "inbound" ? `1px solid ${t.hairline}` : "none",
                    fontFamily: FONT_BODY,
                  }}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {messages.length === 0 && (
                <div style={{ textAlign: "center" as const, color: t.faint, fontSize: 13, marginTop: 40, fontFamily: FONT_BODY }}>
                  No messages in this conversation yet
                </div>
              )}
            </div>

            <div style={{ padding: "14px 20px", borderTop: `1px solid ${t.hairline}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: t.bg, borderRadius: 14, padding: "11px 16px", boxShadow: neu(t, true) }}>
                <input aria-label="Type a message" placeholder="Type to take over this conversation…" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: t.ink, fontFamily: FONT_BODY }} />
                <motion.button whileTap={{ scale: 0.9 }} aria-label="Send message" style={{ background: "none", border: "none", cursor: "pointer", color: t.teal, minWidth: 32, minHeight: 32 }}><Send size={16} /></motion.button>
              </div>
              <p style={{ fontSize: 10, color: t.faint, textAlign: "center" as const, marginTop: 6, fontFamily: FONT_BODY }}>Typing here pauses the AI and lets you respond manually</p>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <MessageSquare size={40} color={t.faint} aria-hidden="true" />
            <p style={{ color: t.muted, fontSize: 13, fontFamily: FONT_BODY }}>Select a conversation to view messages</p>
          </div>
        )}
      </div>

      {/* Lead panel */}
      {active && (
        <div style={{ width: 240, flexShrink: 0, padding: "20px 16px", overflowY: "auto" as const, display: "flex", flexDirection: "column", gap: 20, borderRadius: 18, ...glass(t) }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: t.faint, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 12, fontFamily: FONT_BODY }}>Lead Info</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Platform", value: <PBadge platform={active.platform} /> },
                { label: "Score",    value: <SBadge score={active.lead_score} /> },
                { label: "Status",   value: active.status },
                { label: "Agent",    value: active.agent_active ? "Active" : "Paused" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: t.faint, fontFamily: FONT_BODY }}>{label}</span>
                  <span style={{ fontSize: 11, color: t.muted, fontFamily: FONT_BODY }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: t.hairline }} />
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: t.faint, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 10, fontFamily: FONT_BODY }}>Quick Actions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { label: "Send Payment Link",   color: t.green, soft: t.greenSoft },
                { label: "Schedule Follow-up",  color: t.amber, soft: t.amberSoft },
                { label: "Mark as Closed",      color: t.red,   soft: t.redSoft   },
              ].map(({ label, color, soft }) => (
                <motion.button key={label} whileTap={{ scale: 0.97 }} whileHover={{ x: 2 }} style={{ padding: "10px 12px", minHeight: 40, borderRadius: 10, border: `1px solid ${color}30`, background: soft, color, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" as const, fontFamily: FONT_BODY }}>
                  {label}
                </motion.button>
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
  const { t } = useTheme()
  const cols = [
    { key: "hot",  label: "Hot Leads",  color: t.red,   leads: PIPELINE.hot  },
    { key: "warm", label: "Warm Leads", color: t.amber, leads: PIPELINE.warm },
    { key: "cold", label: "Cold Leads", color: t.blue,  leads: PIPELINE.cold },
  ]
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, height: "100%", overflow: "hidden" }}>
      {cols.map(col => (
        <div key={col.key} style={{ borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", ...glass(t) }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${t.hairline}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Dot color={col.color} />
              <span style={{ fontSize: 13, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY }}>{col.label}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: col.color + "18", color: col.color, fontFamily: FONT_MONO }}>{col.leads.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" as const, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {col.leads.map((lead, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 24 }}
                whileHover={{ scale: 1.02, y: -2 }}
                style={{ background: t.elevated, borderRadius: 12, padding: "12px 14px", border: `1px solid ${t.hairline}`, cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY }}>{lead.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: col.color, fontFamily: FONT_MONO }}>{lead.value}</span>
                </div>
                <p style={{ fontSize: 11, color: t.muted, marginBottom: 8, lineHeight: 1.4, fontFamily: FONT_BODY }}>{lead.note}</p>
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
  const { t } = useTheme()
  const iconMap: Record<string, { icon: React.ReactNode; color: string; soft: string }> = {
    reply:   { icon: <Send size={13} />,        color: t.green, soft: t.greenSoft },
    score:   { icon: <Zap size={13} />,         color: t.blue,  soft: t.blueSoft  },
    follow:  { icon: <Clock size={13} />,       color: t.amber, soft: t.amberSoft },
    payment: { icon: <DollarSign size={13} />,  color: t.red,   soft: t.redSoft   },
    closed:  { icon: <UserCheck size={13} />,   color: t.green, soft: t.greenSoft },
  }
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
      {ACTIVITY.map((item, i) => {
        const m = iconMap[item.icon]
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 260, damping: 24 }}
            whileHover={{ x: 3 }}
            style={{ display: "flex", alignItems: "flex-start", gap: 14, borderRadius: 14, padding: "14px 16px", ...glass(t) }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: m.soft, color: m.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {m.icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: t.ink, marginBottom: 3, fontFamily: FONT_BODY }}>{item.text}</p>
              <p style={{ fontSize: 11, color: t.muted, fontFamily: FONT_BODY }}>{item.sub}</p>
            </div>
            <span style={{ fontSize: 11, color: t.faint, flexShrink: 0, fontFamily: FONT_MONO }}>{item.time}</span>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Revenue ───────────────────────────────────────────────────────────────────
function Revenue() {
  const { t } = useTheme()
  const cards = [
    { label: "Today's Revenue",     value: "₦284,000", sub: "11 sales closed",     color: t.green },
    { label: "This Week",           value: "₦892,000", sub: "43 sales closed",     color: t.blue  },
    { label: "Pending Payments",    value: "₦245,000", sub: "7 awaiting",          color: t.amber },
    { label: "Est. Missed Revenue", value: "₦180,000", sub: "From no-reply leads", color: t.red   },
  ]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, type: "spring", stiffness: 260, damping: 24 }}
            whileHover={{ y: -3 }}
            style={{ borderRadius: 16, padding: 20, ...glass(t), borderColor: c.color + "30" }}
          >
            <p style={{ fontSize: 11, color: t.faint, marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: 0.5, fontFamily: FONT_BODY }}>{c.label}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: c.color, marginBottom: 4, fontFamily: FONT_DISPLAY }}>{c.value}</p>
            <p style={{ fontSize: 11, color: t.muted, fontFamily: FONT_BODY }}>{c.sub}</p>
          </motion.div>
        ))}
      </div>
      <div style={{ borderRadius: 16, padding: 20, ...glass(t) }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: t.ink, marginBottom: 16, fontFamily: FONT_DISPLAY }}>Platform Breakdown</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(P).map(([key, p]) => {
            const pct = key === "whatsapp" ? 45 : key === "telegram" ? 25 : key === "instagram" ? 15 : 5
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 90, fontSize: 12, color: t.muted, flexShrink: 0, fontFamily: FONT_BODY }}>{p.label}</span>
                <div style={{ flex: 1, height: 6, background: t.bg, borderRadius: 3, overflow: "hidden", boxShadow: `inset 0 1px 3px ${t.border}` }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    style={{ height: "100%", background: p.color, borderRadius: 3 }}
                  />
                </div>
                <span style={{ width: 34, fontSize: 11, color: t.faint, textAlign: "right" as const, fontFamily: FONT_MONO }}>{pct}%</span>
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

// ── App shell ─────────────────────────────────────────────────────────────────
function DashboardShell() {
  const { t } = useTheme()
  const [active, setActive] = useState("inbox")
  const reduce = useReducedMotion()

  const STATS = [
    { label: "Messages",  value: "89",       color: t.ink   },
    { label: "Hot Leads", value: "4",        color: t.red   },
    { label: "Warm",      value: "12",       color: t.amber },
    { label: "Closed",    value: "11",       color: t.green },
    { label: "Revenue",   value: "₦284k",    color: t.green },
    { label: "Platforms", value: "6 active", color: t.blue  },
  ]

  const content: Record<string, React.ReactNode> = {
    inbox:     <Inbox />,
    pipeline:  <Pipeline />,
    activity:  <ActivityLog />,
    revenue:   <Revenue />,
    broadcast: (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 12 }}>
        <Radio size={40} color={t.teal} aria-hidden="true" />
        <p style={{ fontSize: 15, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY }}>Broadcast</p>
        <p style={{ fontSize: 13, color: t.muted, fontFamily: FONT_BODY }}>Send campaigns across all platforms at once. Coming Day 4.</p>
      </div>
    ),
    settings: (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 12 }}>
        <Settings size={40} color={t.faint} aria-hidden="true" />
        <p style={{ fontSize: 15, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY }}>Settings</p>
        <p style={{ fontSize: 13, color: t.muted, fontFamily: FONT_BODY }}>Business profile, catalog, and integrations. Coming Day 5.</p>
      </div>
    ),
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative", fontFamily: FONT_BODY }}>
      <MeshBackground />

      {/* Sidebar */}
      <aside style={{ width: 64, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 6, position: "relative", zIndex: 1, margin: 10, borderRadius: 20, ...glass(t) }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${t.teal}, ${t.tealDeep})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, flexShrink: 0, boxShadow: `0 4px 12px ${t.tealSoft}` }}>
          <Zap size={17} color="#fff" fill="#fff" aria-hidden="true" />
        </div>
        {NAV.map(({ id, Icon, label, badge }) => {
          const isA = active === id
          return (
            <div key={id} style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setActive(id)}
                title={label}
                aria-label={label}
                aria-current={isA ? "page" : undefined}
                style={{
                  width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: t.bg, color: isA ? t.teal : t.muted,
                  boxShadow: isA ? neu(t, true) : "none",
                  transition: "color .15s", position: "relative",
                }}
              >
                <Icon size={18} aria-hidden="true" />
                {badge && (
                  <span style={{ position: "absolute", top: 2, right: 2, width: 15, height: 15, borderRadius: "50%", background: t.red, fontSize: 8, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO }}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </motion.button>
            </div>
          )
        })}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingBottom: 8 }}>
          <ThemeToggle />
          <button aria-label="Notifications" style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}><Bell size={16} color={t.faint} /></button>
          <button aria-label="Refresh" style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}><RefreshCw size={14} color={t.faint} /></button>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.green, boxShadow: `0 0 8px ${t.green}`, marginTop: 2 }} />
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1, margin: "10px 10px 10px 0", gap: 10 }}>

        {/* Stats bar */}
        <div style={{ height: 48, borderRadius: 16, display: "flex", alignItems: "center", padding: "0 20px", gap: 24, ...glass(t) }}>
          {STATS.map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: t.faint, fontFamily: FONT_BODY }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: FONT_MONO }}>{value}</span>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          {Object.entries(P).slice(0, 5).map(([key, p]) => (
            <div key={key} title={p.label} style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          ))}
          <span style={{ fontSize: 11, color: t.faint, fontFamily: FONT_BODY }}>+2</span>
        </div>

        {/* Page header */}
        <div style={{ padding: "14px 20px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "space-between", ...glass(t) }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: t.ink, fontFamily: FONT_DISPLAY, textTransform: "capitalize" as const }}>
              {NAV.find(n => n.id === active)?.label}
            </h1>
            <p style={{ fontSize: 11, color: t.faint, marginTop: 2, fontFamily: FONT_BODY }}>SentryAI Demo Business</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: t.greenSoft, border: `1px solid ${t.green}30`, padding: "6px 12px", borderRadius: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.green }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: t.green, fontFamily: FONT_BODY }}>Agent Active</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", borderRadius: 16 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              style={{ height: "100%", overflow: active === "inbox" ? "hidden" : "auto", padding: active === "inbox" ? 0 : 6 }}
            >
              {content[active]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ── Root with theme provider ────────────────────────────────────────────────────
export default function App() {
  useFonts()
  const [mode, setMode] = useState<"light" | "dark">("light")
  const t = useMemo(() => THEMES[mode], [mode])
  const toggle = () => setMode(m => m === "light" ? "dark" : "light")

  return (
    <ThemeCtx.Provider value={{ t, mode, toggle }}>
      <DashboardShell />
    </ThemeCtx.Provider>
  )
}
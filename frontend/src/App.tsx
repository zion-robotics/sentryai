import React, { useState, useEffect, useContext, createContext, useMemo } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  MessageSquare, Flame, Activity, DollarSign,
  Radio, Settings, Search, Send, Zap,
  UserCheck, Clock, RefreshCw, Bell, Sun, Moon,
  ChevronDown, ChevronsRight, ChevronsLeft, Info, X,
  Upload, CreditCard, Building2, Users as UsersIcon
} from "lucide-react"
import { queueMessage, flushQueue } from "./offlineQueue"

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
type Theme = typeof THEMES.light | typeof THEMES.dark

const ThemeCtx = createContext<{ t: Theme; mode: "light" | "dark"; toggle: () => void }>({
  t: THEMES.light, mode: "light", toggle: () => {},
})
const useTheme = () => useContext(ThemeCtx)

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

// Skeleton shimmer for loading states
function Skeleton({ w = "100%", h = 14, r = 6 }: { w?: number | string; h?: number; r?: number }) {
  const { t } = useTheme()
  const reduce = useReducedMotion()
  return (
    <motion.div
      animate={reduce ? {} : { opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ width: w, height: h, borderRadius: r, background: t.hairline }}
    />
  )
}

// ── Inbox ─────────────────────────────────────────────────────────────────────
function Inbox() {
  const { t } = useTheme()
  const API = import.meta.env.VITE_API_URL
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [platformFilter, setPlatformFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [draftMessage, setDraftMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [leadPanelOpen, setLeadPanelOpen] = useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const prevLenRef = React.useRef(0)
  const [atBottom, setAtBottom] = useState(true)
  const [newCount, setNewCount] = useState(0)

  function scrollToBottom(smooth = true) {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" })
    setNewCount(0)
    setAtBottom(true)
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const nowAtBottom = distance < 60
    setAtBottom(nowAtBottom)
    if (nowAtBottom) setNewCount(0)
  }

  useEffect(() => {
    const grew = messages.length - prevLenRef.current
    if (grew > 0) {
      if (atBottom) {
        requestAnimationFrame(() => scrollToBottom(prevLenRef.current === 0))
      } else {
        setNewCount(c => c + grew)
      }
    }
    prevLenRef.current = messages.length
  }, [messages]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setNewCount(0); setAtBottom(true); setLeadPanelOpen(false) }, [selId])

  // Listen for the header's platform quick-filter dots
  useEffect(() => {
    function onPlatformJump(e: any) {
      setPlatformFilter(e.detail)
    }
    window.addEventListener("sentryai:platform-filter", onPlatformJump)
    return () => window.removeEventListener("sentryai:platform-filter", onPlatformJump)
  }, [])

  async function loadConversations() {
    try {
      const res = await fetch(`${API}/api/conversations`)
      const data = await res.json()
      setConversations(data)
      setSelId(prev => prev ?? (data.length > 0 ? data[0].id : null))
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

  async function toggleTakeover(convId: string, currentState: boolean) {
    try {
      await fetch(`${API}/api/conversations/${convId}/takeover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_active: !currentState })
      })
      loadConversations()
    } catch (e) {
      console.error("Takeover toggle failed", e)
    }
  }

  async function sendManualMessage() {
    if (!draftMessage.trim() || !selId) return
    setSending(true)

    if (!navigator.onLine) {
      queueMessage(selId, draftMessage)
      setDraftMessage("")
      setSending(false)
      return
    }

    try {
      await fetch(`${API}/api/conversations/${selId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draftMessage })
      })
      setDraftMessage("")
      loadMessages(selId)
      loadConversations()
    } catch (e) {
      console.log("Send failed, queueing for later")
      queueMessage(selId, draftMessage)
      setDraftMessage("")
    } finally {
      setSending(false)
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

  const filtered = conversations
    .filter(c => filter === "all" || c.lead_score === filter)
    .filter(c => !platformFilter || c.platform === platformFilter)
  const active = conversations.find(c => c.id === selId)

  const filterColor = (f: string) => f === "hot" ? t.red : f === "warm" ? t.amber : f === "cold" ? t.blue : t.teal

  if (loading) return (
    <div style={{ display: "flex", flex: 1, gap: 14, padding: 14, height: "100%" }}>
      <div style={{ width: 300, flexShrink: 0, borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", gap: 14, ...glass(t) }}>
        <Skeleton h={36} r={10} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <Skeleton w={38} h={38} r={999} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton h={12} w="70%" />
              <Skeleton h={10} w="90%" />
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, borderRadius: 18, ...glass(t) }} />
    </div>
  )

  if (!loading && conversations.length === 0) return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%", gap: 14, padding: 14 }}>
      <div style={{ width: 300, flexShrink: 0, borderRadius: 18, display: "flex", flexDirection: "column", ...glass(t) }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${t.hairline}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: t.bg, borderRadius: 10, padding: "9px 12px", boxShadow: neu(t, true) }}>
            <Search size={13} color={t.faint} aria-hidden="true" />
            <input aria-label="Search conversations" placeholder="Search conversations…" disabled style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: t.faint, flex: 1, fontFamily: FONT_BODY }} />
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <p style={{ color: t.faint, fontSize: 12, textAlign: "center" as const, fontFamily: FONT_BODY }}>Conversations will appear here</p>
        </div>
      </div>
      <div style={{ flex: 1, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, ...glass(t) }}>
        <MessageSquare size={40} color={t.faint} aria-hidden="true" />
        <p style={{ color: t.ink, fontWeight: 700, fontFamily: FONT_DISPLAY }}>No conversations yet</p>
        <p style={{ color: t.faint, fontSize: 13, fontFamily: FONT_BODY }}>Send a message to your Telegram or WhatsApp bot to get started</p>
      </div>
    </div>
  )

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%", gap: 14, padding: 14, position: "relative" }}>

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

        {platformFilter && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderBottom: `1px solid ${t.hairline}` }}>
            <span style={{ fontSize: 11, color: t.muted, fontFamily: FONT_BODY }}>Filtering:</span>
            <PBadge platform={platformFilter} />
            <button onClick={() => setPlatformFilter(null)} aria-label="Clear platform filter" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: t.faint, display: "flex" }}>
              <X size={12} />
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto" as const }}>
          <AnimatePresence initial={false}>
            {filtered.map(conv => {
              const isS = selId === conv.id
              return (
                <motion.div
                  key={conv.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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
                        {conv.last_message || "No messages yet"}
                      </p>
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <PBadge platform={conv.platform} />
                        <SBadge score={conv.lead_score} />
                        {conv.agent_active ? (
                          <span style={{ fontSize: 10, color: t.green, fontFamily: FONT_BODY }}>✓ AI active</span>
                        ) : (
                          <span style={{ fontSize: 10, color: t.amber, fontFamily: FONT_BODY }}>⏸ Paused</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
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
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => toggleTakeover(active.id, active.agent_active)}
                  style={{
                    padding: "8px 16px", minHeight: 36, borderRadius: 10, fontSize: 12, fontWeight: 700,
                    background: active.agent_active ? "transparent" : t.greenSoft,
                    border: `1px solid ${active.agent_active ? t.red + "50" : t.green + "35"}`,
                    color: active.agent_active ? t.red : t.green,
                    cursor: "pointer", fontFamily: FONT_BODY,
                  }}
                >
                  {active.agent_active ? "Take Over" : "Resume Agent"}
                </motion.button>
                <span style={{
                  padding: "8px 16px", minHeight: 36, borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: active.agent_active ? t.greenSoft : t.amberSoft,
                  border: `1px solid ${active.agent_active ? t.green : t.amber}35`,
                  color: active.agent_active ? t.green : t.amber,
                  display: "flex", alignItems: "center", gap: 5, fontFamily: FONT_BODY,
                }}>
                  <motion.span
                    animate={active.agent_active ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: active.agent_active ? t.green : t.amber }}
                  />
                  {active.agent_active ? "Agent Active" : "You're in control"}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setLeadPanelOpen(o => !o)}
                  aria-label="Toggle lead info"
                  aria-expanded={leadPanelOpen}
                  title="Lead info"
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: leadPanelOpen ? t.tealSoft : t.bg,
                    color: leadPanelOpen ? t.teal : t.muted,
                    boxShadow: leadPanelOpen ? "none" : neu(t, false),
                  }}
                >
                  <Info size={16} />
                </motion.button>
              </div>
            </div>

            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              <div ref={scrollRef} onScroll={handleScroll} style={{ height: "100%", overflowY: "auto" as const, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
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
                      {msg.sender === "Business Owner" && (
                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4 }}>— you</div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {messages.length === 0 && (
                  <div style={{ textAlign: "center" as const, color: t.faint, fontSize: 13, marginTop: 40, fontFamily: FONT_BODY }}>
                    No messages in this conversation yet
                  </div>
                )}
              </div>

              <AnimatePresence>
                {!atBottom && messages.length > 0 && (
                  <motion.button
                    key="jump-to-bottom"
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => scrollToBottom(true)}
                    aria-label={newCount > 0 ? `${newCount} new messages, jump to latest` : "Jump to latest message"}
                    style={{
                      position: "absolute", bottom: 16, right: 20, border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6, padding: newCount > 0 ? "8px 14px" : "10px",
                      borderRadius: 30, background: `linear-gradient(135deg, ${t.teal}, ${t.tealDeep})`,
                      color: "#fff", boxShadow: `0 6px 18px ${t.tealSoft}`, fontFamily: FONT_BODY,
                    }}
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                    {newCount > 0 && <span style={{ fontSize: 12, fontWeight: 700 }}>{newCount} new</span>}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Lead info drawer — slides over the chat on demand, doesn't squeeze the layout */}
              <AnimatePresence>
                {leadPanelOpen && (
                  <>
                    <motion.div
                      key="lead-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setLeadPanelOpen(false)}
                      style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.12)", zIndex: 5 }}
                    />
                    <motion.div
                      key="lead-drawer"
                      initial={{ x: "100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "100%" }}
                      transition={{ type: "spring", stiffness: 340, damping: 34 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 6,
                        padding: 24,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        gap: 18,
                        background: t.mode === "light" ? "rgba(247, 252, 251, 0.96)" : "rgba(9, 17, 17, 0.96)",
                        backdropFilter: "blur(10px) saturate(130%)",
                        WebkitBackdropFilter: "blur(10px) saturate(130%)",
                        border: `1px solid ${t.border}`,
                        boxShadow: t.mode === "light"
                          ? "inset 0 1px 0 rgba(255,255,255,0.6), 0 18px 40px rgba(14,27,27,0.08)"
                          : "inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 40px rgba(0,0,0,0.28)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: t.faint, textTransform: "uppercase" as const, letterSpacing: 1, fontFamily: FONT_BODY }}>Lead Info</p>
                          <p style={{ fontSize: 20, fontWeight: 800, color: t.ink, fontFamily: FONT_DISPLAY, marginTop: 3 }}>{active.customer_name}</p>
                        </div>
                        <button onClick={() => setLeadPanelOpen(false)} aria-label="Close lead info" style={{ background: "none", border: "none", cursor: "pointer", color: t.faint, display: "flex" }}>
                          <X size={18} />
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 1fr)", gap: 18, minHeight: 0, flex: 1 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, alignContent: "start" }}>
                          {[
                            { label: "Platform", value: <PBadge platform={active.platform} /> },
                            { label: "Score",    value: <span className="lead-score-pop"><SBadge score={active.lead_score} /></span> },
                            { label: "Status",   value: active.status },
                            { label: "Agent",    value: active.agent_active ? "Active" : "Paused" },
                          ].map(({ label, value }) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.hairline}` }}>
                              <span style={{ fontSize: 11, color: t.faint, fontFamily: FONT_BODY, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>{label}</span>
                              <span style={{ fontSize: 12, color: t.muted, fontFamily: FONT_BODY }}>{value}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: `1px solid ${t.hairline}` }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: t.faint, textTransform: "uppercase" as const, letterSpacing: 1, fontFamily: FONT_BODY }}>Quick Actions</p>
                            <span style={{ fontSize: 11, color: t.faint, fontFamily: FONT_BODY }}>No internal scroll</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                            {[
                              { label: "Send Payment Link",   color: t.green, soft: t.greenSoft },
                              { label: "Schedule Follow-up",  color: t.amber, soft: t.amberSoft },
                              { label: "Mark as Closed",      color: t.red,   soft: t.redSoft   },
                            ].map(({ label, color, soft }) => (
                              <motion.button key={label} whileTap={{ scale: 0.98 }} whileHover={{ y: -1 }} style={{ padding: "14px 14px", minHeight: 48, borderRadius: 14, border: `1px solid ${color}35`, background: soft, color, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" as const, fontFamily: FONT_BODY, boxShadow: `0 8px 20px ${color}12` }}>
                                {label}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div style={{ padding: "14px 20px", borderTop: `1px solid ${t.hairline}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: t.bg, borderRadius: 14, padding: "11px 16px", boxShadow: neu(t, true) }}>
                <input
                  aria-label="Type a message"
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && draftMessage.trim() && !sending) sendManualMessage() }}
                  placeholder={active.agent_active ? "Type to take over this conversation…" : "Type your reply…"}
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: t.ink, fontFamily: FONT_BODY }}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  aria-label="Send message"
                  onClick={sendManualMessage}
                  disabled={sending || !draftMessage.trim()}
                  style={{ background: "none", border: "none", cursor: sending ? "wait" : "pointer", color: t.teal, minWidth: 32, minHeight: 32, opacity: draftMessage.trim() ? 1 : 0.4 }}
                >
                  <Send size={16} />
                </motion.button>
              </div>
              <p style={{ fontSize: 10, color: t.faint, textAlign: "center" as const, marginTop: 6, fontFamily: FONT_BODY }}>
                {active.agent_active ? "Sending a message here pauses the AI automatically" : "You're responding manually. AI is paused for this chat."}
              </p>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <MessageSquare size={40} color={t.faint} aria-hidden="true" />
            <p style={{ color: t.muted, fontSize: 13, fontFamily: FONT_BODY }}>Select a conversation to view messages</p>
          </div>
        )}
      </div>
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gridAutoRows: "1fr", gap: 16, height: "100%" }}>
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
  const API = import.meta.env.VITE_API_URL
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const iconMap: Record<string, { icon: React.ReactNode; color: string; soft: string }> = {
    reply:    { icon: <Send size={13} />,        color: t.green, soft: t.greenSoft },
    manual:   { icon: <UserCheck size={13} />,   color: t.blue,  soft: t.blueSoft  },
    follow:   { icon: <Clock size={13} />,       color: t.amber, soft: t.amberSoft },
    payment:  { icon: <DollarSign size={13} />,  color: t.red,   soft: t.redSoft   },
    broadcast:{ icon: <Radio size={13} />,       color: t.teal,  soft: t.tealSoft  },
    closed:   { icon: <UserCheck size={13} />,   color: t.green, soft: t.greenSoft },
  }

  function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return mins + "m ago"
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return hrs + "h ago"
    const days = Math.floor(hrs / 24)
    return days + "d ago"
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(API + "/api/activity/f5b6d17b-ce7c-4dfc-abc9-a19a6957fd4e")
        const data = await res.json()
        setActivity(data)
      } catch (e) {
        console.error("Failed to load activity", e)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, borderRadius: 14, padding: "14px 16px", ...glass(t) }}>
          <Skeleton w={32} h={32} r={10} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton h={12} w="60%" />
            <Skeleton h={10} w="40%" />
          </div>
        </div>
      ))}
    </div>
  )

  if (activity.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
      <Activity size={40} color={t.faint} aria-hidden="true" />
      <p style={{ color: t.ink, fontWeight: 700, fontFamily: FONT_DISPLAY }}>No activity yet</p>
      <p style={{ color: t.faint, fontSize: 13, fontFamily: FONT_BODY }}>Activity will show up here once the agent starts responding</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
      {activity.map((item, i) => {
        const m = iconMap[item.type] || iconMap.reply
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 260, damping: 24 }}
            whileHover={{ x: 3 }}
            style={{ display: "flex", alignItems: "flex-start", gap: 14, borderRadius: 14, padding: "14px 16px", ...glass(t) }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: m.soft, color: m.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {m.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: t.ink, marginBottom: 3, fontFamily: FONT_BODY }}>{item.text}</p>
              <p style={{ fontSize: 11, color: t.muted, fontFamily: FONT_BODY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.sub}</p>
            </div>
            <span style={{ fontSize: 11, color: t.faint, flexShrink: 0, fontFamily: FONT_MONO }}>{timeAgo(item.time)}</span>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
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
      <div style={{ borderRadius: 16, padding: 24, flex: 1, display: "flex", flexDirection: "column", ...glass(t) }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: t.ink, marginBottom: 20, fontFamily: FONT_DISPLAY }}>Platform Breakdown</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, justifyContent: "center" }}>
          {Object.entries(P).map(([key, p]) => {
            const pct = key === "whatsapp" ? 45 : key === "telegram" ? 25 : key === "instagram" ? 15 : 5
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 90, fontSize: 12, color: t.muted, flexShrink: 0, fontFamily: FONT_BODY }}>{p.label}</span>
                <div style={{ flex: 1, height: 8, background: t.bg, borderRadius: 4, overflow: "hidden", boxShadow: `inset 0 1px 3px ${t.border}` }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    style={{ height: "100%", background: p.color, borderRadius: 4 }}
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

// ── Broadcast ─────────────────────────────────────────────────────────────────
function Broadcast() {
  const { t } = useTheme()
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["whatsapp", "telegram", "email"])
  const [audience, setAudience] = useState("all")
  const [message, setMessage] = useState("")

  function togglePlatform(key: string) {
    setSelectedPlatforms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
  }

  const pastBroadcasts = [
    { title: "New Ankara collection launch", date: "3 days ago", reach: "412 contacts", platforms: ["whatsapp", "instagram"] },
    { title: "End of month discount — 15% off", date: "1 week ago", reach: "389 contacts", platforms: ["whatsapp", "telegram", "email"] },
    { title: "Eid delivery schedule update", date: "3 weeks ago", reach: "356 contacts", platforms: ["whatsapp", "telegram"] },
  ]

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(260px, 1fr)", gap: 20, alignItems: "start" }}>
      {/* Composer */}
      <div style={{ borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16, ...glass(t) }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>New Broadcast</p>
          <p style={{ fontSize: 11, color: t.faint, fontFamily: FONT_BODY }}>Send one message across every platform you pick, at once.</p>
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: t.faint, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8, fontFamily: FONT_BODY }}>Platforms</p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
            {Object.entries(P).map(([key, p]) => {
              const isSel = selectedPlatforms.includes(key)
              return (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => togglePlatform(key)}
                  aria-pressed={isSel}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 20,
                    border: `1px solid ${isSel ? p.color + "50" : t.hairline}`,
                    background: isSel ? p.color + "18" : t.bg,
                    color: isSel ? p.color : t.faint, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY,
                  }}
                >
                  <Dot color={p.color} glow={isSel} />
                  {p.label}
                </motion.button>
              )
            })}
          </div>
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: t.faint, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8, fontFamily: FONT_BODY }}>Audience</p>
          <div style={{ display: "flex", gap: 6 }}>
            {["all", "hot", "warm", "cold"].map(a => (
              <motion.button
                key={a}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAudience(a)}
                aria-pressed={audience === a}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 700, textTransform: "capitalize" as const,
                  background: t.bg, boxShadow: audience === a ? neu(t, true) : neu(t, false),
                  color: audience === a ? t.teal : t.muted, fontFamily: FONT_BODY,
                }}
              >{a}</motion.button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: t.faint, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8, fontFamily: FONT_BODY }}>Message</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your campaign message…"
            rows={5}
            style={{
              width: "100%", resize: "vertical" as const, background: t.bg, borderRadius: 12, border: "none",
              boxShadow: neu(t, true), padding: "12px 14px", fontSize: 13, color: t.ink, fontFamily: FONT_BODY, outline: "none",
            }}
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ y: -1 }}
          disabled={!message.trim() || selectedPlatforms.length === 0}
          style={{
            alignSelf: "flex-start", padding: "11px 22px", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${t.teal}, ${t.tealDeep})`, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: message.trim() ? "pointer" : "not-allowed",
            opacity: message.trim() && selectedPlatforms.length > 0 ? 1 : 0.5,
            boxShadow: `0 6px 16px ${t.tealSoft}`, fontFamily: FONT_BODY, display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <Radio size={15} /> Send Broadcast
        </motion.button>
      </div>

      {/* Past broadcasts */}
      <div style={{ borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12, ...glass(t) }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY }}>Past Broadcasts</p>
        {pastBroadcasts.map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            style={{ padding: "12px 14px", borderRadius: 12, background: t.elevated, border: `1px solid ${t.hairline}` }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, color: t.ink, marginBottom: 4, fontFamily: FONT_BODY }}>{b.title}</p>
            <p style={{ fontSize: 11, color: t.faint, marginBottom: 8, fontFamily: FONT_BODY }}>{b.date} · {b.reach}</p>
            <div style={{ display: "flex", gap: 5 }}>
              {b.platforms.map(pk => <PBadge key={pk} platform={pk} />)}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────
function Settings_() {
  const { t } = useTheme()
  const [businessName, setBusinessName] = useState("SentryAI Demo Business")
  const [tone, setTone] = useState("friendly")

  function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
      <div>
        <label style={{ fontSize: 11, color: t.faint, fontFamily: FONT_BODY, display: "block", marginBottom: 6 }}>{label}</label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", background: t.bg, borderRadius: 10, border: "none", boxShadow: neu(t, true), padding: "10px 12px", fontSize: 13, color: t.ink, fontFamily: FONT_BODY, outline: "none" }}
        />
      </div>
    )
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gridAutoRows: "1fr", gap: 20, height: "100%" }}>

      {/* Business profile */}
      <div style={{ borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14, ...glass(t) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={16} color={t.teal} />
          <p style={{ fontSize: 13, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY }}>Business Profile</p>
        </div>
        <Field label="Business name" value={businessName} onChange={setBusinessName} />
        <div>
          <label style={{ fontSize: 11, color: t.faint, fontFamily: FONT_BODY, display: "block", marginBottom: 6 }}>Reply tone</label>
          <div style={{ display: "flex", gap: 6 }}>
            {["friendly", "professional", "casual"].map(o => (
              <motion.button
                key={o}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTone(o)}
                aria-pressed={tone === o}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 700, textTransform: "capitalize" as const,
                  background: t.bg, boxShadow: tone === o ? neu(t, true) : neu(t, false),
                  color: tone === o ? t.teal : t.muted, fontFamily: FONT_BODY,
                }}
              >{o}</motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Catalog */}
      <div style={{ borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14, ...glass(t) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UsersIcon size={16} color={t.teal} />
          <p style={{ fontSize: 13, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY }}>Product Catalog</p>
        </div>
        <p style={{ fontSize: 12, color: t.muted, fontFamily: FONT_BODY, lineHeight: 1.5 }}>
          Upload your price list once — the agent uses it to answer product and pricing questions automatically.
        </p>
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "22px 0", borderRadius: 12, border: `1.5px dashed ${t.hairline}`,
            background: "transparent", color: t.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY,
          }}
        >
          <Upload size={16} /> Upload catalog (CSV or PDF)
        </motion.button>
      </div>

      {/* Integrations */}
      <div style={{ borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12, ...glass(t) }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY }}>Integrations</p>
        {Object.entries(P).map(([key, p]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${t.hairline}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Dot color={p.color} />
              <span style={{ fontSize: 12, color: t.ink, fontFamily: FONT_BODY }}>{p.label}</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.green, fontFamily: FONT_BODY }}>Connected</span>
          </div>
        ))}
      </div>

      {/* Payments */}
      <div style={{ borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14, ...glass(t) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CreditCard size={16} color={t.teal} />
          <p style={{ fontSize: 13, fontWeight: 700, color: t.ink, fontFamily: FONT_DISPLAY }}>Payment Providers</p>
        </div>
        {["Paystack", "Flutterwave"].map(name => (
          <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: t.ink, fontFamily: FONT_BODY }}>{name}</span>
            <div style={{ width: 40, height: 22, borderRadius: 20, background: t.greenSoft, border: `1px solid ${t.green}35`, position: "relative", display: "flex", alignItems: "center" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: t.green, marginLeft: 21 }} />
            </div>
          </div>
        ))}
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
  const [navOpen, setNavOpen] = useState(false)
  const reduce = useReducedMotion()

  const content: Record<string, React.ReactNode> = {
    inbox:     <Inbox />,
    pipeline:  <Pipeline />,
    activity:  <ActivityLog />,
    revenue:   <Revenue />,
    broadcast: <Broadcast />,
    settings:  <Settings_ />,
  }

  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100dvh", height: "100dvh", overflow: "hidden", position: "relative", fontFamily: FONT_BODY }}>
      <MeshBackground />

      {/* Sidebar — navigation only. Account-level controls (theme, notifications, refresh)
          live in the header, per convention (top-right is where people expect them). */}
      <motion.aside
        animate={{ width: navOpen ? 208 : 64 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 32 }}
        style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: navOpen ? "stretch" : "center", padding: "14px 10px", gap: 6, position: "relative", zIndex: 2, margin: 10, borderRadius: 20, overflow: "hidden", ...glass(t) }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingLeft: navOpen ? 4 : 0, justifyContent: navOpen ? "flex-start" : "center" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${t.teal}, ${t.tealDeep})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${t.tealSoft}`, overflow: "hidden", position: "relative" }}>
            {/* Reads the real favicon.svg from /public — falls back to the Zap glyph if it 404s */}
            <img
              src="/favicon.svg"
              alt="SentryAI"
              width={20} height={20}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none"
                const fallback = e.currentTarget.parentElement?.querySelector("[data-logo-fallback]") as HTMLElement | null
                if (fallback) fallback.style.display = "flex"
              }}
              style={{ display: "block" }}
            />
            <span data-logo-fallback style={{ display: "none", position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
              <Zap size={17} color="#fff" fill="#fff" aria-hidden="true" />
            </span>
          </div>
          {navOpen && <span style={{ fontSize: 14, fontWeight: 800, color: t.ink, fontFamily: FONT_DISPLAY, whiteSpace: "nowrap" }}>SentryAI</span>}
        </div>

        {NAV.map(({ id, Icon, label, badge }) => {
          const isA = active === id
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActive(id)}
              title={label}
              aria-label={label}
              aria-current={isA ? "page" : undefined}
              style={{
                width: "100%", minHeight: 44, borderRadius: 12, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: navOpen ? "flex-start" : "center",
                gap: 12, padding: navOpen ? "0 12px" : 0,
                background: t.bg, color: isA ? t.teal : t.muted,
                boxShadow: isA ? neu(t, true) : "none",
                transition: "color .15s", position: "relative", flexShrink: 0,
              }}
            >
              <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} aria-hidden="true" />
                {badge && (
                  <span style={{ position: "absolute", top: -6, right: -8, width: 15, height: 15, borderRadius: "50%", background: t.red, fontSize: 8, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO }}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              {navOpen && <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, whiteSpace: "nowrap" }}>{label}</span>}
            </motion.button>
          )
        })}

        {/* Sidebar footer — collapse control + connection status ONLY */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: navOpen ? "stretch" : "center", gap: 10, paddingTop: 8 }}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setNavOpen(o => !o)}
            aria-label={navOpen ? "Collapse navigation" : "Expand navigation"}
            title={navOpen ? "Collapse" : "Expand"}
            style={{
              width: navOpen ? "100%" : 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: navOpen ? "flex-start" : "center",
              gap: 10, padding: navOpen ? "0 12px" : 0, background: t.bg, boxShadow: neu(t, false), color: t.muted, alignSelf: navOpen ? "stretch" : "center",
            }}
          >
            {navOpen ? <ChevronsLeft size={16} aria-hidden="true" /> : <ChevronsRight size={16} aria-hidden="true" />}
            {navOpen && <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY }}>Collapse</span>}
          </motion.button>
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: "50%", background: t.green, boxShadow: `0 0 8px ${t.green}` }}
            title="Backend connected"
          />
        </div>
      </motion.aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1, margin: "10px 10px 10px 0", gap: 10 }}>

        {/* Page header — account-level controls live here (top-right), per convention */}
        <div className="animated-gradient-frame animated-gradient-frame--nav" style={{ padding: "14px 20px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "space-between", ...glass(t) }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: t.ink, fontFamily: FONT_DISPLAY, textTransform: "capitalize" as const }}>
              {NAV.find(n => n.id === active)?.label}
            </h1>
            <p style={{ fontSize: 11, color: t.faint, marginTop: 2, fontFamily: FONT_BODY }}>SentryAI Demo Business</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: t.greenSoft, border: `1px solid ${t.green}30`, padding: "6px 12px", borderRadius: 20 }}>
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: t.green }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: t.green, fontFamily: FONT_BODY }}>Agent Active</span>
            </div>
            <button aria-label="Notifications" title="Notifications" style={{ background: t.bg, boxShadow: neu(t, false), border: "none", borderRadius: 10, cursor: "pointer", padding: 8, display: "flex" }}>
              <Bell size={15} color={t.faint} />
            </button>
            <button aria-label="Refresh" title="Refresh" style={{ background: t.bg, boxShadow: neu(t, false), border: "none", borderRadius: 10, cursor: "pointer", padding: 8, display: "flex" }}>
              <RefreshCw size={14} color={t.faint} />
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", borderRadius: 16, position: "relative" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              style={
                active === "inbox"
                  ? { position: "absolute", inset: 0, overflow: "hidden" }
                  : { position: "absolute", inset: 0, overflow: "auto", borderRadius: 18, padding: 24, ...glass(t) }
              }
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

  useEffect(() => {
    import("./usePush").then(({ subscribeToPush }) => {
      subscribeToPush("f5b6d17b-ce7c-4dfc-abc9-a19a6957fd4e")
    })
  }, [])

  useEffect(() => {
    function handleOnline() {
      console.log("Back online, flushing queued messages")
      flushQueue(import.meta.env.VITE_API_URL)
    }
    window.addEventListener("online", handleOnline)
    flushQueue(import.meta.env.VITE_API_URL)
    return () => window.removeEventListener("online", handleOnline)
  }, [])

  return (
    <ThemeCtx.Provider value={{ t, mode, toggle }}>
      <DashboardShell />
    </ThemeCtx.Provider>
  )
}
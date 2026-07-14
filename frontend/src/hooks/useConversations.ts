import { useState, useEffect, useCallback } from "react"

const API = import.meta.env.VITE_API_URL

export function useConversations() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/conversations`)
      const data = await res.json()
      setConversations(data)
    } catch (err) {
      console.error("Failed to load conversations:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Poll every 5 seconds for new messages
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  return { conversations, loading, refetch: load }
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<any[]>([])

  const load = useCallback(async () => {
    if (!conversationId) return
    try {
      const res = await fetch(`${API}/api/conversations/${conversationId}/messages`)
      const data = await res.json()
      setMessages(data)
    } catch (err) {
      console.error("Failed to load messages:", err)
    }
  }, [conversationId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [load])

  return { messages, refetch: load }
}

export function useStats() {
  const [stats, setStats] = useState({
    messages: 0, hot: 0, warm: 0, cold: 0, closed: 0
  })

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/stats`)
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error("Failed to load stats:", err)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [load])

  return { stats, refetch: load }
}

export async function toggleTakeover(id: string, agentActive: boolean) {
  const res = await fetch(`${API}/api/conversations/${id}/takeover`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_active: agentActive })
  })
  return res.json()
}
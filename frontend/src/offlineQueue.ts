const QUEUE_KEY = "sentryai_offline_queue"

export function queueMessage(conversationId: string, message: string) {
  const existing = getQueue()
  existing.push({ conversationId, message, timestamp: Date.now() })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(existing))
}

export function getQueue(): { conversationId: string; message: string; timestamp: number }[] {
  const raw = localStorage.getItem(QUEUE_KEY)
  return raw ? JSON.parse(raw) : []
}

export function clearQueueItem(timestamp: number) {
  const existing = getQueue().filter(item => item.timestamp !== timestamp)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(existing))
}

export async function flushQueue(apiUrl: string) {
  const queue = getQueue()
  if (queue.length === 0) return

  for (const item of queue) {
    try {
      await fetch(apiUrl + "/api/conversations/" + item.conversationId + "/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: item.message })
      })
      clearQueueItem(item.timestamp)
    } catch (err) {
      console.log("Still offline, will retry later")
      break
    }
  }
}
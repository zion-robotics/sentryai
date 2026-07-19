export async function subscribeToPush(businessId: string) {
  const API = import.meta.env.VITE_API_URL

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push not supported in this browser")
    return
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    console.log("Notification permission denied")
    return
  }

  const registration = await navigator.serviceWorker.ready

  const keyRes = await fetch(API + "/api/push/vapid-public-key")
  const { key } = await keyRes.json()

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key)
  })

  await fetch(API + "/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, subscription })
  })

  console.log("Push subscription saved")
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

export async function sendUserMessageToAgent(userText: string): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/analyze/user-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: userText }),
    })
    if (!response.ok) {
      console.error('[conversation] user-message failed:', response.statusText)
    }
    // Response dialogue is delivered via backend HTTP push to port 7777 → show-dialogue
  } catch (err) {
    console.error('[conversation] error:', err)
  }
}

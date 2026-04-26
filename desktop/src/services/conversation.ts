/**
 * Service to handle bidirectional conversation with the agent.
 * Sends user input to backend and triggers dialogue display for agent response.
 */

const BACKEND_URL = (typeof process !== 'undefined' && process.env.VITE_BACKEND_URL) 
  ? process.env.VITE_BACKEND_URL 
  : 'http://localhost:8000'

export async function sendUserMessageToAgent(userText: string): Promise<void> {
  try {
    console.log('[conversation] sending user message:', userText)
    
    const response = await fetch(`${BACKEND_URL}/analyze/user-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: userText }),
    })

    if (!response.ok) {
      console.error('[conversation] user-message failed:', response.statusText)
      return
    }

    const data = await response.json()
    console.log('[conversation] agent response received:', data)

    if (data.triggered && data.dialogue) {
      // Emit the dialogue through IPC so the renderer can display it
      if (window.ipcRenderer) {
        window.ipcRenderer.send('show-dialogue-from-conversation', data.dialogue)
      }
    }
  } catch (err) {
    console.error('[conversation] error:', err)
  }
}

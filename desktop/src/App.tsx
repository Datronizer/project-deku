import { useEffect } from 'react'
import { DialogueBox } from './components/DialogueBox'
import { SettingsScreen } from './components/SettingsScreen'
import { useDialogue } from './hooks/useDialogue'
import { useSettings } from './hooks/useSettings'

function App() {
  const { payload, dismiss } = useDialogue()
  const { payload: settingsPayload, dismiss: dismissSettings, save } = useSettings()

  // Initialize conversation with the agent on app start
  useEffect(() => {
    const initConversation = async () => {
      try {
        const backendUrl = process.env.VITE_BACKEND_URL ?? 'http://localhost:8000'
        const response = await fetch(`${backendUrl}/analyze/init-conversation`, {
          method: 'POST',
        })
        if (response.ok) {
          const data = await response.json()
          console.log('[App] conversation initialized:', data.conversation_id)
        } else {
          console.warn('[App] failed to initialize conversation:', response.statusText)
        }
      } catch (err) {
        console.error('[App] conversation init error:', err)
      }
    }
    initConversation()
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none">
      {payload && (
        <DialogueBox payload={payload} onClose={dismiss} />
      )}
      {settingsPayload && (
        <SettingsScreen
          debugState={settingsPayload.debugState}
          settings={settingsPayload.settings}
          onClose={dismissSettings}
          onSave={save}
        />
      )}
    </div>
  )
}

export default App

//TEST
import { useEffect } from 'react'
import {
  useConversationControls,
  useConversationStatus,
} from '@elevenlabs/react'

import { DialogueBox } from './components/DialogueBox'
import { SettingsScreen } from './components/SettingsScreen'
import { useDialogue } from './hooks/useDialogue'
import { useSettings } from './hooks/useSettings'

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

function App() {
  const { payload, dismiss } = useDialogue()
  const { payload: settingsPayload, dismiss: dismissSettings, save } =
    useSettings()

  const { startSession } = useConversationControls()
  const { status } = useConversationStatus()

  // START ELEVENLABS AGENT SESSION (PRAAAAAYY)
  useEffect(() => {
    if (status === 'connected') return

    async function startAgent() {
      try {
        const res = await fetch(`${BACKEND_URL}/agent/token`, {
          method: 'POST',
        })

        if (!res.ok) {
          console.error('[App] Failed to get agent token')
          return
        }

        const { signed_url } = await res.json()

        await startSession({ signedUrl: signed_url })
        console.log('[App] ElevenLabs agent connected')
      } catch (err) {
        console.error('[App] Agent start error:', err)
      }
    }

    startAgent()
  }, [status, startSession])

  return (
    <>
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
    </>
  )
}

export default App
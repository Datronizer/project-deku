import { useEffect, useRef } from 'react'
import {
  useConversationControls,
  useConversationStatus,
} from '@elevenlabs/react'

import { DialogueBox } from './components/DialogueBox'
import { SettingsScreen } from './components/SettingsScreen'
import { useDialogue } from './hooks/useDialogue'
import { useSettings } from './hooks/useSettings'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

function App() {
  const { payload, dismiss } = useDialogue()
  const { payload: settingsPayload, dismiss: dismissSettings } = useSettings()

  const { startSession } = useConversationControls()
  const { status } = useConversationStatus()
  const connectingRef = useRef(false)

  useEffect(() => {
    if (status === 'connected') {
      // Unlock so a future disconnect can trigger a new attempt
      connectingRef.current = false
      return
    }
    if (connectingRef.current) return
    connectingRef.current = true

    async function startAgent() {
      try {
        const res = await fetch(`${BACKEND_URL}/agent/token`, { method: 'POST' })
        if (!res.ok) {
          console.error('[App] Failed to get agent token:', res.statusText)
          connectingRef.current = false
          return
        }
        const { signed_url } = await res.json()
        await startSession({ signedUrl: signed_url })
        // Don't reset here — wait for status to reach 'connected' above
      } catch (err) {
        console.error('[App] Agent start error:', err)
        connectingRef.current = false
      }
    }

    startAgent()
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {payload && <DialogueBox payload={payload} onClose={dismiss} />}
      {settingsPayload && (
        <SettingsScreen
          debugState={settingsPayload.debugState}
          onClose={dismissSettings}
        />
      )}
    </>
  )
}

export default App

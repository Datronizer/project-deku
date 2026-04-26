import { useState, useCallback } from 'react'
import type { DialoguePayload } from '../types'
import { useIpcListener } from './useIpcListener'

export function useDialogue() {
  const [payload, setPayload] = useState<DialoguePayload | null>(null)

  const handler = useCallback((data: DialoguePayload) => setPayload(data), [])
  useIpcListener('show-dialogue', handler)
  useIpcListener('show-dialogue-from-conversation', handler)

  function dismiss() {
    setPayload(null)
    window.ipcRenderer.send('dismiss-dialogue')
  }

  return { payload, dismiss }
}

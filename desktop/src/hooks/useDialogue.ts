import { useState, useEffect } from 'react'
import type { DialoguePayload } from '../types'

export function useDialogue() {
  const [payload, setPayload] = useState<DialoguePayload | null>(null)

  useEffect(() => {
    const handler = (_event: Electron.IpcRendererEvent, incoming: unknown) => {
      setPayload(incoming as DialoguePayload)
    }
    window.ipcRenderer.on('show-dialogue', handler)
    return () => { window.ipcRenderer.off('show-dialogue', handler) }
  }, [])

  function dismiss() {
    setPayload(null)
    window.ipcRenderer.send('dismiss-dialogue')
  }

  return { payload, dismiss }
}

import { useState, useEffect } from 'react'

interface DebugState {
  keyCount: number
  mouseClicks: number
  windowTitles: string[]
  lastWindow: string
  lastSummary: string
  lastCycleTime: string | null
  screenshotB64: string | null
}

export function useDebug() {
  const [state, setState] = useState<DebugState | null>(null)

  useEffect(() => {
    const handler = (_event: Electron.IpcRendererEvent, incoming: unknown) => {
      setState(incoming as DebugState)
    }
    window.ipcRenderer.on('show-debug', handler)
    return () => { window.ipcRenderer.off('show-debug', handler) }
  }, [])

  function dismiss() {
    setState(null)
    window.ipcRenderer.send('dismiss-debug')
  }

  return { state, dismiss }
}

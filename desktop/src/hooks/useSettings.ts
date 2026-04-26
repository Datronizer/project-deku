import { useState, useEffect } from 'react'

export interface AppSettings {
  summarizer: 'gemma' | 'simple'
}

export interface DebugState {
  keyCount: number
  mouseClicks: number
  windowTitles: string[]
  lastWindow: string
  lastSummary: string
  lastCycleTime: string | null
  tier3Cooldowns: Record<string, number>
}

interface SettingsPayload {
  debugState: DebugState
  settings: AppSettings
}

export function useSettings() {
  const [payload, setPayload] = useState<SettingsPayload | null>(null)

  useEffect(() => {
    const handler = (_event: Electron.IpcRendererEvent, incoming: unknown) => {
      setPayload(incoming as SettingsPayload)
    }
    window.ipcRenderer.on('show-settings', handler)
    return () => { window.ipcRenderer.off('show-settings', handler) }
  }, [])

  function dismiss() {
    setPayload(null)
    window.ipcRenderer.send('dismiss-settings')
  }

  function save(settings: AppSettings) {
    window.ipcRenderer.send('save-settings', settings)
    // Optimistically update local state
    if (payload) setPayload({ ...payload, settings })
  }

  return { payload, dismiss, save }
}

import { useState, useCallback } from 'react'
import type { AppSettings, DebugState } from '../types'
import { useIpcListener } from './useIpcListener'

interface SettingsPayload {
  debugState: DebugState
  settings: AppSettings
}

export function useSettings() {
  const [payload, setPayload] = useState<SettingsPayload | null>(null)

  const handler = useCallback((data: SettingsPayload) => setPayload(data), [])
  useIpcListener('show-settings', handler)

  function dismiss() {
    setPayload(null)
    window.ipcRenderer.send('dismiss-settings')
  }

  function save(settings: AppSettings) {
    window.ipcRenderer.send('save-settings', settings)
    if (payload) setPayload({ ...payload, settings })
  }

  return { payload, dismiss, save }
}

import { useState, useCallback } from 'react'
import type { DebugState } from '../types'
import { useIpcListener } from './useIpcListener'

interface SettingsPayload {
  debugState: DebugState
}

export function useSettings() {
  const [payload, setPayload] = useState<SettingsPayload | null>(null)

  const handler = useCallback((data: SettingsPayload) => setPayload(data), [])
  useIpcListener('show-settings', handler)

  function dismiss() {
    setPayload(null)
    window.ipcRenderer.send('dismiss-settings')
  }

  return { payload, dismiss }
}

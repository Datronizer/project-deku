import { useEffect } from 'react'

export function useIpcListener<T>(channel: string, handler: (data: T) => void) {
  useEffect(() => {
    const fn = (_e: Electron.IpcRendererEvent, data: unknown) => handler(data as T)
    window.ipcRenderer.on(channel, fn)
    return () => { window.ipcRenderer.off(channel, fn) }
  }, [channel, handler])
}

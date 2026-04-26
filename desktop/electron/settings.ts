import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

export interface AppSettings {
  summarizer: 'gemma' | 'simple'
}

const DEFAULTS: AppSettings = { summarizer: 'gemma' }

function settingsPath() {
  return path.join(app.getPath('userData'), 'deku-settings.json')
}

export function loadSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(s: AppSettings): void {
  fs.writeFileSync(settingsPath(), JSON.stringify(s, null, 2))
}

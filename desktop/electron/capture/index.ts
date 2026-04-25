import { createRequire } from 'node:module'
import { backend } from '../server.js'
import { GemmaSummarizer, SimpleSummarizer, type EventLog, type Summarizer } from './summarizer.js'

const require = createRequire(import.meta.url)

// Swap to SimpleSummarizer here if Gemma is causing problems
const summarizer: Summarizer = new GemmaSummarizer()

const INTERVAL_MS = 30_000
const MAX_WINDOW_HISTORY = 8

let keyCount = 0
let mouseClicks = 0
const windowTitles: string[] = []
let lastWindow = ''

function resetLog() {
  keyCount = 0
  mouseClicks = 0
  windowTitles.length = 0
  if (lastWindow) windowTitles.push(lastWindow)
}

function recordWindow(title: string) {
  if (title === lastWindow) return
  lastWindow = title
  windowTitles.push(title)
  if (windowTitles.length > MAX_WINDOW_HISTORY) windowTitles.shift()
}

export async function startCapture() {
  // uiohook-napi for keystrokes + mouse clicks
  const { uIOhook, UiohookKey } = require('uiohook-napi') as typeof import('uiohook-napi')

  uIOhook.on('keydown', () => { keyCount++ })
  uIOhook.on('click', () => { mouseClicks++ })
  uIOhook.start()

  // active-win polls for window title changes
  const activeWin = require('active-win') as typeof import('active-win')
  setInterval(async () => {
    try {
      const win = await activeWin()
      if (win) recordWindow(win.title ?? win.owner.name)
    } catch { /* ignore */ }
  }, 3_000)

  // 30s analysis cycle
  setInterval(() => void runCycle(), INTERVAL_MS)

  console.log('[deku] capture started')
}

async function runCycle() {
  const log: EventLog = {
    keyCount,
    mouseClicks,
    windowTitles: [...windowTitles],
    durationSeconds: INTERVAL_MS / 1000,
  }
  resetLog()

  const [summary, screenshot] = await Promise.all([
    summarizer.summarize(log),
    takeScreenshot(),
  ])

  const activeWindow = log.windowTitles.at(-1) ?? 'unknown'
  console.log(`[deku] cycle — "${summary}"`)

  try {
    await backend.analyze({ summary, active_window: activeWindow, screenshot_b64: screenshot })
  } catch (err) {
    console.warn('[deku] /analyze POST failed:', err)
  }
}

async function takeScreenshot(): Promise<string> {
  try {
    const screenshotDesktop = require('screenshot-desktop') as typeof import('screenshot-desktop')
    const buf: Buffer = await screenshotDesktop({ format: 'jpg' })
    return buf.toString('base64')
  } catch {
    return ''
  }
}

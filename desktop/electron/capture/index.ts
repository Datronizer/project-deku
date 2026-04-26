import { createRequire } from 'node:module'
import { backend } from '../server.js'
import { GemmaSummarizer, SimpleSummarizer, type EventLog, type Summarizer } from './summarizer.js'
import { URGENT_PATTERNS } from './patterns.js'
import { loadSettings } from '../settings.js'

const require = createRequire(import.meta.url)

function makeSummarizer(): Summarizer {
  return loadSettings().summarizer === 'simple' ? new SimpleSummarizer() : new GemmaSummarizer()
}

let summarizer: Summarizer = makeSummarizer()

export function reloadSummarizer() {
  summarizer = makeSummarizer()
  console.log(`[deku] summarizer reloaded: ${loadSettings().summarizer}`)
}

// ── Tier intervals & cooldowns ─────────────────────────────────────────────
const T1_MIN_MS  = 25 * 60_000      // Tier 1: random 25–45 min surprise
const T1_MAX_MS  = 45 * 60_000
const T1_COOLDOWN_MS = 20 * 60_000  // prevent accidental double-fire
const T2_MIN_MS = 5_000             // Tier 2: every 5-10 seconds for constant feedback
const T2_MAX_MS = 10_000
const T3_COOLDOWN_MS =  3 * 60_000  // Tier 3: per-category cooldown
const MAX_WINDOW_HISTORY = 8

// ── State ──────────────────────────────────────────────────────────────────
let keyCount = 0
let mouseClicks = 0
const windowTitles: string[] = []
let lastWindow = ''
let lastSummary = ''
let lastCycleTime: string | null = null
let lastTier1Time = 0
const lastTier3CategoryTime = new Map<string, number>()

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

function snapshotLog(durationMs: number): EventLog {
  return {
    keyCount,
    mouseClicks,
    windowTitles: [...windowTitles],
    durationSeconds: durationMs / 1000,
  }
}

// ── Startup ────────────────────────────────────────────────────────────────
export async function startCapture() {
  const { uIOhook } = require('uiohook-napi') as typeof import('uiohook-napi')
  uIOhook.on('keydown', () => { keyCount++ })
  uIOhook.on('click', () => { mouseClicks++ })
  uIOhook.start()

  const activeWin = require('active-win') as typeof import('active-win')
  setInterval(async () => {
    try {
      const win = await activeWin()
      if (win) {
        const title = win.title ?? win.owner.name
        recordWindow(title)
        checkTier3(title)
      }
    } catch { /* ignore */ }
  }, 3_000)

  startTier1()
  startTier2()

  console.log('[deku] capture started')
}

// ── Tier 1: random surprise (no screenshot, always fires) ─────────────────
function startTier1() {
  const delay = T1_MIN_MS + Math.random() * (T1_MAX_MS - T1_MIN_MS)
  setTimeout(async () => {
    const now = Date.now()
    if (now - lastTier1Time >= T1_COOLDOWN_MS) {
      const log = snapshotLog(delay)
      resetLog()
      lastTier1Time = Date.now()
      await runCycle(log, 1)
    }
    startTier1()
  }, delay)
}

// ── Tier 2: screen observer (screenshot + Vision API, ~40% trigger) ────────
function startTier2() {
  const scheduleNext = () => {
    const interval = T2_MIN_MS + Math.random() * (T2_MAX_MS - T2_MIN_MS)
    setTimeout(async () => {
      const log = snapshotLog(interval)
      resetLog()
      await runCycle(log, 2)
      scheduleNext()
    }, interval)
  }
  scheduleNext()
}

// ── Tier 3: urgent window detection ───────────────────────────────────────
function checkTier3(title: string) {
  for (const { pattern, category } of URGENT_PATTERNS) {
    if (!pattern.test(title)) continue
    const now = Date.now()
    if (now - (lastTier3CategoryTime.get(category) ?? 0) < T3_COOLDOWN_MS) return
    lastTier3CategoryTime.set(category, now)
    console.log(`[deku] tier3 — ${category} detected: "${title}"`)
    const log = snapshotLog(0)
    void runCycle(log, 3)
    return  // only one category per window change
  }
}

// ── Exports ────────────────────────────────────────────────────────────────
export async function triggerCycle() {
  const log = snapshotLog((T2_MIN_MS + T2_MAX_MS) / 2)
  resetLog()
  return runCycle(log, 2)
}

export function getDebugState() {
  const now = Date.now()
  return {
    keyCount,
    mouseClicks,
    windowTitles: [...windowTitles],
    lastWindow,
    lastSummary,
    lastCycleTime,
    tier3Cooldowns: Object.fromEntries(
      [...lastTier3CategoryTime.entries()].map(([cat, t]) => [
        cat,
        Math.max(0, Math.ceil((t + T3_COOLDOWN_MS - now) / 1000)),
      ])
    ),
  }
}

export async function captureScreenshot(): Promise<string> {
  return takeScreenshot()
}

// ── Core cycle ─────────────────────────────────────────────────────────────
async function runCycle(log: EventLog, tier: 1 | 2 | 3) {
  const summary = await summarizer.summarize(log)
  lastSummary = summary
  lastCycleTime = new Date().toISOString()

  const activeWindow = log.windowTitles.at(-1) ?? 'unknown'
  console.log(`[deku] tier${tier} — "${summary}"`)

  // Tier 1 skips screenshot (text-only, cheapest)
  const screenshot = tier === 1 ? '' : await takeScreenshot()

  try {
    await backend.analyze({ summary, active_window: activeWindow, screenshot_b64: screenshot, tier })
  } catch (err) {
    console.warn(`[deku] tier${tier} /analyze failed:`, err)
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

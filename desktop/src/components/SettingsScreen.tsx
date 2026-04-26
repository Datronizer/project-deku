import { useState } from 'react'
import type { DebugState } from '../types'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { resetAgentMemory } from '../services/conversation'

interface Props {
  debugState: DebugState
  onClose: () => void
}

function Shortcut({ keyCombo, label }: { keyCombo: string; label: string }) {
  return (
    <>
      <span className="text-green-500 font-bold">{keyCombo}</span>
      <span className="text-green-300">{label}</span>
    </>
  )
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <span className="text-green-600 text-xs">{label}</span>
      <span className="text-green-300 truncate text-xs">{value}</span>
    </>
  )
}

export function SettingsScreen({ debugState, onClose }: Props) {
  const [debugOpen, setDebugOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  useEscapeKey(onClose)

  const handleReset = async () => {
    setIsResetting(true)
    await resetAgentMemory()
    setIsResetting(false)
    setResetDone(true)
    setTimeout(() => setResetDone(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 pointer-events-auto flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 text-green-400 font-mono text-sm rounded-lg border border-green-700 shadow-2xl max-w-lg w-full mx-8 overflow-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-green-900">
          <span className="text-green-300 font-bold text-base">[deku settings]</span>
          <button
            className="text-green-600 hover:text-green-300 transition-colors text-lg leading-none"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Shortcuts section */}
          <div>
            <div className="text-green-700 text-xs uppercase tracking-widest mb-3">shortcuts</div>
            <div className="grid grid-cols-[1fr_2fr] gap-y-2 text-xs">
              <Shortcut keyCombo="Ctrl+Shift+9" label="force cycle (T2)" />
              <Shortcut keyCombo="Ctrl+Shift+8" label="force screenshot (T3)" />
              <Shortcut keyCombo="Ctrl+Shift+6" label="force text-only (T1)" />
              <Shortcut keyCombo="Ctrl+Shift+7" label="toggle settings" />
              <Shortcut keyCombo="Ctrl+Shift+0" label="panic (quit)" />
            </div>
          </div>

          {/* Actions section */}
          <div className="border-t border-green-900 pt-4">
            <div className="text-green-700 text-xs uppercase tracking-widest mb-3">actions</div>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="w-full bg-red-900/20 hover:bg-red-900/40 border border-red-700/50 text-red-400 text-xs py-2 rounded transition-all active:scale-95 disabled:opacity-50"
            >
              {isResetting ? 'RESETTING...' : resetDone ? '✓ MEMORY CLEARED' : 'RESET AGENT MEMORY'}
            </button>
            <p className="text-[10px] text-green-800 mt-2 italic">
              Clears Bakugou's short-term memory (helpful if he gets stuck on a topic).
            </p>
          </div>

          {/* Debug section (collapsible) */}
          <div className="border-t border-green-900 pt-4">
            <button
              className="flex items-center gap-2 text-green-600 text-xs uppercase tracking-widest hover:text-green-400 transition-colors w-full"
              onClick={() => setDebugOpen(o => !o)}
            >
              <span>{debugOpen ? '▾' : '▸'}</span>
              <span>debug info</span>
            </button>

            {debugOpen && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <Row label="keystrokes"   value={debugState.keyCount} />
                  <Row label="mouse clicks" value={debugState.mouseClicks} />
                  <Row label="active window" value={debugState.lastWindow || '—'} />
                  <Row label="last cycle"   value={debugState.lastCycleTime ? new Date(debugState.lastCycleTime).toLocaleTimeString() : '—'} />
                </div>

                {Object.keys(debugState.tier3Cooldowns).length > 0 && (
                  <div>
                    <div className="text-green-700 text-xs uppercase tracking-widest mb-1">tier 3 cooldowns</div>
                    {Object.entries(debugState.tier3Cooldowns).map(([cat, secs]) => (
                      <div key={cat} className="text-green-500 text-xs">
                        {cat}: {secs}s remaining
                      </div>
                    ))}
                  </div>
                )}

                {debugState.windowTitles.length > 0 && (
                  <div>
                    <div className="text-green-700 text-xs uppercase tracking-widest mb-1">window history</div>
                    <div className="space-y-0.5">
                      {debugState.windowTitles.map((t, i) => (
                        <div key={i} className="text-green-400 truncate text-xs">› {t}</div>
                      ))}
                    </div>
                  </div>
                )}

                {debugState.lastSummary && (
                  <div>
                    <div className="text-green-700 text-xs uppercase tracking-widest mb-1">last summary</div>
                    <div className="text-green-300 italic text-xs">"{debugState.lastSummary}"</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-green-900 text-green-800 text-xs text-center">
          esc · click outside · ✕ to close
        </div>
      </div>
    </div>
  )
}

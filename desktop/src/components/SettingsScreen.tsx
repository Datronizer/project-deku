import { useState, useEffect } from 'react'
import type { AppSettings, DebugState } from '../hooks/useSettings'

interface Props {
  debugState: DebugState
  settings: AppSettings
  onClose: () => void
  onSave: (s: AppSettings) => void
}

export function SettingsScreen({ debugState, settings, onClose, onSave }: Props) {
  const [summarizer, setSummarizer] = useState(settings.summarizer)
  const [debugOpen, setDebugOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleSave() {
    onSave({ summarizer })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const dirty = summarizer !== settings.summarizer

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
          {/* Summarizer setting */}
          <div>
            <div className="text-green-600 text-xs uppercase tracking-widest mb-3">activity summarizer</div>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="summarizer"
                  value="gemma"
                  checked={summarizer === 'gemma'}
                  onChange={() => setSummarizer('gemma')}
                  className="mt-0.5 accent-green-400"
                />
                <div>
                  <div className="text-green-200 group-hover:text-green-100 transition-colors">
                    Gemma via Ollama
                  </div>
                  <div className="text-green-700 text-xs mt-0.5">
                    better summaries — requires Ollama running locally
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="summarizer"
                  value="simple"
                  checked={summarizer === 'simple'}
                  onChange={() => setSummarizer('simple')}
                  className="mt-0.5 accent-green-400"
                />
                <div>
                  <div className="text-green-200 group-hover:text-green-100 transition-colors">
                    Simple (no dependencies)
                  </div>
                  <div className="text-green-700 text-xs mt-0.5">
                    always works — uses keystroke counts and window title directly
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!dirty && !saved}
            className={`px-4 py-1.5 rounded border text-xs font-bold transition-all ${
              saved
                ? 'border-green-500 text-green-400 bg-green-900/30'
                : dirty
                ? 'border-green-500 text-green-300 hover:bg-green-900/30 cursor-pointer'
                : 'border-green-900 text-green-800 cursor-default'
            }`}
          >
            {saved ? '✓ saved' : 'save'}
          </button>

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

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <span className="text-green-600 text-xs">{label}</span>
      <span className="text-green-300 truncate text-xs">{value}</span>
    </>
  )
}

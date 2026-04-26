interface DebugState {
  keyCount: number
  mouseClicks: number
  windowTitles: string[]
  lastWindow: string
  lastSummary: string
  lastCycleTime: string | null
  screenshotB64: string | null
}

interface Props {
  state: DebugState
  onClose: () => void
}

export function DebugScreen({ state, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 pointer-events-auto flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 text-green-400 font-mono text-sm rounded-lg border border-green-700 shadow-2xl max-w-3xl w-full mx-8 p-6 overflow-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-green-300 font-bold text-base">[deku debug]</span>
          <button
            className="text-green-600 hover:text-green-300 transition-colors text-lg leading-none"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4">
          <Row label="keystrokes" value={state.keyCount} />
          <Row label="mouse clicks" value={state.mouseClicks} />
          <Row label="active window" value={state.lastWindow || '—'} />
          <Row label="last cycle" value={state.lastCycleTime ? new Date(state.lastCycleTime).toLocaleTimeString() : '—'} />
        </div>

        {state.windowTitles.length > 0 && (
          <div className="mb-4">
            <div className="text-green-600 text-xs uppercase tracking-widest mb-1">window history</div>
            <div className="space-y-0.5">
              {state.windowTitles.map((t, i) => (
                <div key={i} className="text-green-300 truncate">› {t}</div>
              ))}
            </div>
          </div>
        )}

        {state.lastSummary && (
          <div className="mb-4">
            <div className="text-green-600 text-xs uppercase tracking-widest mb-1">last summary</div>
            <div className="text-green-200 italic">"{state.lastSummary}"</div>
          </div>
        )}

        {state.screenshotB64 && (
          <div>
            <div className="text-green-600 text-xs uppercase tracking-widest mb-2">screenshot</div>
            <img
              src={`data:image/jpeg;base64,${state.screenshotB64}`}
              alt="screenshot"
              className="w-full rounded border border-green-800 opacity-90"
            />
          </div>
        )}

        <div className="mt-4 text-green-700 text-xs text-center">click outside or ✕ to close</div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <span className="text-green-600">{label}</span>
      <span className="text-green-200 truncate">{value}</span>
    </>
  )
}

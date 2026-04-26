import { useEffect } from 'react'
import { useTypewriter } from '../hooks/useTypewriter'

interface Props {
  characterName: string
  text: string
  onClose: () => void
  onTypingDone?: () => void
  autoCloseProgress?: number | null
  onCloseHover?: () => void
  onCloseHoverEnd?: () => void
}

export function TextBox({ characterName, text, onClose, onTypingDone, autoCloseProgress = null, onCloseHover, onCloseHoverEnd }: Props) {
  const { displayed, done } = useTypewriter(text)

  useEffect(() => {
    if (done) onTypingDone?.()
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-1 flex-1 bg-black/70 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-white shadow-2xl">
      <span className="text-sm font-bold text-indigo-300 tracking-wide">{characterName}</span>
      <p className="text-base leading-relaxed flex-1 min-h-[3.5rem]">{displayed}</p>
      {done && (
        <>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-white/30">esc to dismiss</span>
            <button
              onClick={onClose}
              onMouseEnter={onCloseHover}
              onMouseLeave={onCloseHoverEnd}
              className="text-xs text-white/50 hover:text-white/90 transition-colors cursor-pointer"
            >
              [close]
            </button>
          </div>
          {autoCloseProgress != null && (
            <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400/50"
                style={{ width: `${autoCloseProgress}%` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

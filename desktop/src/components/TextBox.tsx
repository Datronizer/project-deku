import { useEffect } from 'react'
import { useTypewriter } from '../hooks/useTypewriter'

interface Props {
  characterName: string
  text: string
  onTypingDone?: () => void
  autoCloseProgress?: number | null
}

export function TextBox({ characterName, text, onTypingDone, autoCloseProgress = null }: Props) {
  const { displayed, done } = useTypewriter(text)

  useEffect(() => {
    if (done) onTypingDone?.()
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-1 flex-1 bg-black/70 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-white shadow-2xl">
      <span className="text-sm font-bold text-indigo-300 tracking-wide">{characterName}</span>
      <p className="text-base leading-relaxed flex-1 min-h-[3.5rem]">{displayed}</p>
      {done && autoCloseProgress != null && (
        <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-indigo-400/50"
            style={{ width: `${autoCloseProgress}%` }}
          />
        </div>
      )}
    </div>
  )
}

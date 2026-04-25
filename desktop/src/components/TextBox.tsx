import { useTypewriter } from '../hooks/useTypewriter'

interface Props {
  characterName: string
  text: string
  onClose: () => void
  onTypingDone?: () => void
}

export function TextBox({ characterName, text, onClose, onTypingDone }: Props) {
  const { displayed, done } = useTypewriter(text)

  if (done) onTypingDone?.()

  return (
    <div className="flex flex-col gap-1 flex-1 bg-black/70 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-white shadow-2xl">
      <span className="text-sm font-bold text-indigo-300 tracking-wide">{characterName}</span>
      <p className="text-base leading-relaxed flex-1 min-h-[3.5rem]">{displayed}</p>
      {done && (
        <button
          onClick={onClose}
          className="self-end text-xs text-white/50 hover:text-white/90 transition-colors cursor-pointer"
        >
          [close]
        </button>
      )}
    </div>
  )
}

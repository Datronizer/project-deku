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
    <div className="flex flex-col gap-1 flex-1 text-white dark:text-white light:text-black">
      <span className="text-base font-bold text-indigo-400 dark:text-indigo-400 light:text-indigo-700 tracking-widest uppercase">{characterName}</span>
      <p className="text-xl font-medium leading-relaxed flex-1 min-h-[4.5rem]">{displayed}</p>
      {done && autoCloseProgress != null && (
        <div className="w-full h-1 bg-white/10 dark:bg-white/10 light:bg-black/10 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-indigo-500"
            style={{ width: `${autoCloseProgress}%` }}
          />
        </div>
      )}
    </div>
  )
}

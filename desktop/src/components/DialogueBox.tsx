import { useState, useEffect } from 'react'
import { Portrait } from './Portrait'
import { TextBox } from './TextBox'
import type { DialoguePayload } from '../types'

const AUTO_CLOSE_MS = 5000
const TICK_MS = 50
const BASE_BOTTOM_PX = 80
// Estimated chars that fit on one line at 85vw — used to nudge the box up for longer text
const CHARS_PER_LINE = 80

interface Props {
  payload: DialoguePayload
  onClose: () => void
}

export function DialogueBox({ payload, onClose }: Props) {
  const [typingDone, setTypingDone] = useState(false)
  const [progress, setProgress] = useState(100)

  // ESC dismisses — but only after typing finishes
  useEffect(() => {
    if (!typingDone) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [typingDone, onClose])

  // 5s auto-close countdown after typing finishes
  useEffect(() => {
    if (!typingDone) return
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += TICK_MS
      setProgress(Math.max(0, 100 - (elapsed / AUTO_CLOSE_MS) * 100))
      if (elapsed >= AUTO_CLOSE_MS) {
        clearInterval(interval)
        onClose()
      }
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [typingDone, onClose])

  const estimatedLines = Math.ceil(payload.text.length / CHARS_PER_LINE)
  const bottomPx = Math.min(BASE_BOTTOM_PX + Math.max(0, (estimatedLines - 1) * 20), 240)

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-[85vw] flex items-end gap-4 pointer-events-auto select-none"
      style={{ bottom: bottomPx }}
    >
      <Portrait characterName={payload.characterName} expression={payload.expression} />
      <TextBox
        characterName={payload.characterName}
        text={payload.text}
        onClose={onClose}
        onTypingDone={() => setTypingDone(true)}
        autoCloseProgress={typingDone ? progress : null}
      />
    </div>
  )
}

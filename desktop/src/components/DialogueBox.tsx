import { useState, useEffect, useRef } from 'react'
import { Portrait } from './Portrait'
import { TextBox } from './TextBox'
import type { DialoguePayload } from '../types'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { sendUserMessageToAgent } from '../services/conversation'

const AUTO_CLOSE_MS = 8000
const TICK_MS = 50
const BASE_BOTTOM_PX = 80
const CHARS_PER_LINE = 80

const REST = { top: 84, left: 89 }

function randomDodgePos(current: { top: number; left: number }) {
  let top: number, left: number
  do {
    top  = 8  + Math.random() * 72
    left = 5  + Math.random() * 82
  } while (Math.abs(top - current.top) < 15 && Math.abs(left - current.left) < 15)
  return { top, left }
}

interface Props {
  payload: DialoguePayload
  onClose: () => void
}

export function DialogueBox({ payload, onClose }: Props) {
  const [typingDone, setTypingDone] = useState(false)
  const [progress, setProgress] = useState(100)
  const [expression, setExpression] = useState(payload.expression)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [dismissPos, setDismissPos] = useState(REST)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!payload.audioUrl) return
    const audio = new Audio(payload.audioUrl)
    audio.play().catch(() => {})
    return () => { audio.pause() }
  }, [payload.audioUrl])

  useEscapeKey(() => onClose(), typingDone)

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

  useEffect(() => {
    if (typingDone) inputRef.current?.focus()
  }, [typingDone])

  const handleSend = async () => {
    if (!replyText.trim() || sending) return
    setSending(true)
    await sendUserMessageToAgent(replyText.trim())
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSend()
    if (e.key === 'Escape') onClose()
  }

  const estimatedLines = Math.ceil(payload.text.length / CHARS_PER_LINE)
  const bottomPx = Math.min(BASE_BOTTOM_PX + Math.max(0, (estimatedLines - 1) * 20), 240)

  return (
    <>
      <div
        className="fixed left-1/2 -translate-x-1/2 w-[85vw] flex items-end gap-4 pointer-events-auto select-none"
        style={{ bottom: bottomPx }}
      >
        <Portrait characterName={payload.characterName} expression={expression} />
        <div className="flex flex-col gap-2 flex-1">
          <TextBox
            characterName={payload.characterName}
            text={payload.text}
            onTypingDone={() => setTypingDone(true)}
            autoCloseProgress={typingDone ? progress : null}
          />
          {typingDone && (
            <div className="flex gap-2 px-1">
              <input
                ref={inputRef}
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="talk back..."
                disabled={sending}
                className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-400 select-text"
              />
              <button
                onClick={() => void handleSend()}
                disabled={!replyText.trim() || sending}
                className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-default"
              >
                {sending ? '...' : 'send'}
              </button>
            </div>
          )}
        </div>
      </div>

      {typingDone && (
        <button
          onClick={onClose}
          onMouseEnter={() => {
            setExpression('mad')
            setDismissPos(pos => randomDodgePos(pos))
          }}
          onMouseLeave={() => setExpression(payload.expression)}
          className="fixed text-xs text-white/50 hover:text-white/90 pointer-events-auto select-none"
          style={{
            top: `${dismissPos.top}vh`,
            left: `${dismissPos.left}vw`,
            transition: 'top 0.15s ease-out, left 0.15s ease-out',
          }}
        >
          [dismiss]
        </button>
      )}
    </>
  )
}

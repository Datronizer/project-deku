import { useState, useEffect, useRef } from 'react'
import { Portrait } from './Portrait'
import { TextBox } from './TextBox'
import type { DialoguePayload } from '../types'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { sendUserMessageToAgent } from '../services/conversation'
import { useVoiceCapture } from '../hooks/useVoiceCapture'

const AUTO_CLOSE_MS = 12000
const TICK_MS = 50

const REST = { top: 10, left: 90 }

function randomDodgePos(current: { top: number; left: number }) {
  let top: number, left: number
  do {
    top  = 5  + Math.random() * 60
    left = 5  + Math.random() * 85
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

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceCapture()

  // Sync transcript to replyText when voice is active
  useEffect(() => {
    if (transcript) {
      setReplyText(transcript)
    }
  }, [transcript])

  useEffect(() => {
    if (!payload.audioUrl) return
    const audio = new Audio(payload.audioUrl)
    audio.play().catch(() => {})
    return () => { audio.pause() }
  }, [payload.audioUrl])

  useEscapeKey(() => onClose(), typingDone)

  useEffect(() => {
    // Only auto-close if not actively typing or recording
    if (!typingDone || isListening || replyText.length > 0) {
      if (!isListening && replyText.length === 0 && typingDone) {
         // resume timer if they clear text? maybe just keep it simple
      } else {
        setProgress(100)
        return
      }
    }

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
  }, [typingDone, onClose, isListening, replyText])

  useEffect(() => {
    if (typingDone) inputRef.current?.focus()
  }, [typingDone])

  const handleSend = async () => {
    const text = replyText.trim()
    if (!text || sending) return
    setSending(true)
    if (isListening) stopListening()
    await sendUserMessageToAgent(text)
    resetTranscript()
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSend()
    if (e.key === 'Escape') onClose()
  }

  const toggleMic = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <>
      <div
        className="fixed bottom-0 left-0 w-full flex items-center gap-8 pointer-events-auto select-none p-8 bg-black dark:bg-black light:bg-white border-t-8 border-white dark:border-white light:border-black shadow-[0_-20px_50px_rgba(0,0,0,0.5)] transition-all"
      >
        <Portrait characterName={payload.characterName} expression={expression} />
        <div className="flex flex-col gap-4 flex-1">
          <TextBox
            characterName={payload.characterName}
            text={payload.text}
            onTypingDone={() => setTypingDone(true)}
            autoCloseProgress={typingDone && !isListening && replyText.length === 0 ? progress : null}
          />
          {typingDone && (
            <div className="flex gap-4 items-center">
              <button
                onClick={toggleMic}
                className={`p-3 rounded-full border-2 transition-all ${
                  isListening 
                    ? 'bg-red-500 border-red-400 animate-pulse' 
                    : 'bg-indigo-600/20 border-indigo-500/40 hover:bg-indigo-600/40 text-white'
                }`}
                title={isListening ? 'Stop recording' : 'Speak reply'}
              >
                <MicIcon className={isListening ? 'text-white' : 'text-indigo-400'} />
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? 'Listening...' : 'Type or speak back...'}
                disabled={sending}
                className="flex-1 bg-white/10 dark:bg-white/10 light:bg-black/10 border-2 border-indigo-500/30 rounded-lg px-4 py-3 text-lg text-white dark:text-white light:text-black placeholder-white/30 dark:placeholder-white/30 light:placeholder-black/30 outline-none focus:border-indigo-500 select-text transition-all"
              />
              
              <button
                onClick={() => void handleSend()}
                disabled={!replyText.trim() || sending}
                className="px-8 py-3 bg-indigo-600 text-white font-bold text-lg rounded-lg hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-default shadow-lg"
              >
                {sending ? '...' : 'SEND'}
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
          className="fixed text-sm font-bold bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white px-3 py-1 rounded border-2 border-black dark:border-black light:border-white pointer-events-auto select-none shadow-xl transition-all hover:scale-110"
          style={{
            top: `${dismissPos.top}vh`,
            left: `${dismissPos.left}vw`,
            transition: 'top 0.15s ease-out, left 0.15s ease-out',
          }}
        >
          [DISMISS]
        </button>
      )}
    </>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  )
}

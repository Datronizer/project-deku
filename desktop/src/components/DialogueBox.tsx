import { useState, useEffect } from 'react'
import { Portrait } from './Portrait'
import { TextBox } from './TextBox'
import type { DialoguePayload } from '../types'
import { useVoiceCapture } from '../hooks/useVoiceCapture'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { sendUserMessageToAgent } from '../services/conversation'

const AUTO_CLOSE_MS = 8000
const TICK_MS = 50
const BASE_BOTTOM_PX = 80
const CHARS_PER_LINE = 80

// Default resting position — bottom-right corner near the dialogue box
const REST = { top: 84, left: 89 }

function randomDodgePos(current: { top: number; left: number }) {
  let top: number, left: number
  do {
    top  = 8  + Math.random() * 72  // 8–80vh
    left = 5  + Math.random() * 82  // 5–87vw
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
  const [showVoicePrompt, setShowVoicePrompt] = useState(false)
  const [dismissPos, setDismissPos] = useState(REST)
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useVoiceCapture()

  useEffect(() => {
    if (!payload.audioUrl) return
    const audio = new Audio(payload.audioUrl)
    audio.play().catch(() => {})
    return () => { audio.pause() }
  }, [payload.audioUrl])

  useEscapeKey(() => { stopListening(); onClose() }, typingDone)

  useEffect(() => {
    if (!typingDone) return
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += TICK_MS
      setProgress(Math.max(0, 100 - (elapsed / AUTO_CLOSE_MS) * 100))
      if (elapsed >= AUTO_CLOSE_MS) {
        clearInterval(interval)
        stopListening()
        onClose()
      }
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [typingDone, onClose, stopListening])

  useEffect(() => {
    if (typingDone && !showVoicePrompt) setShowVoicePrompt(true)
  }, [typingDone, showVoicePrompt])

  const handleSpeakClick = async () => {
    if (isListening) {
      stopListening()
      if (transcript.trim()) {
        await sendUserMessageToAgent(transcript)
        resetTranscript()
        onClose()
      }
    } else {
      startListening()
    }
  }

  const handleCancelVoice = () => {
    stopListening()
    resetTranscript()
    setShowVoicePrompt(false)
  }

  const estimatedLines = Math.ceil(payload.text.length / CHARS_PER_LINE)
  const bottomPx = Math.min(BASE_BOTTOM_PX + Math.max(0, (estimatedLines - 1) * 20), 240)

  return (
    <>
      {/* Dialogue box — stays put */}
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
          {showVoicePrompt && (
            <div className="flex gap-2 px-4 pb-2">
              {isListening ? (
                <>
                  <button
                    onClick={handleSpeakClick}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                  >
                    ⏹ Stop & Send
                  </button>
                  <button
                    onClick={handleCancelVoice}
                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                  >
                    ✕ Cancel
                  </button>
                  <span className="text-xs text-gray-300 self-center">
                    {transcript || 'Listening...'}
                  </span>
                </>
              ) : (
                <button
                  onClick={handleSpeakClick}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  🎤 Speak Back
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dodging dismiss button — floats freely */}
      {typingDone && (
        <button
          onClick={() => { stopListening(); onClose() }}
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

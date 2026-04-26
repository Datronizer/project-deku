import { useState, useEffect } from 'react'
import { Portrait } from './Portrait'
import { TextBox } from './TextBox'
import type { DialoguePayload } from '../types'
import { useVoiceCapture } from '../hooks/useVoiceCapture'
import { sendUserMessageToAgent } from '../services/conversation'

const AUTO_CLOSE_MS = 8000
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
  const [expression, setExpression] = useState(payload.expression)
  const [showVoicePrompt, setShowVoicePrompt] = useState(false)
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useVoiceCapture()

  // ESC dismisses — but only after typing finishes
  useEffect(() => {
    if (!typingDone) return
    const handler = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') {
        stopListening()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [typingDone, onClose, stopListening])

  // Auto-close countdown after typing finishes
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

  // Show voice prompt after typing finishes
  useEffect(() => {
    if (typingDone && !showVoicePrompt) {
      setShowVoicePrompt(true)
    }
  }, [typingDone, showVoicePrompt])

  const handleSpeakClick = async () => {
    if (isListening) {
      stopListening()
      // Send the transcript to the agent
      if (transcript.trim()) {
        await sendUserMessageToAgent(transcript)
        resetTranscript()
        onClose() // Close current dialogue, new one will appear with agent response
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
    <div
      className="fixed left-1/2 -translate-x-1/2 w-[85vw] flex items-end gap-4 pointer-events-auto select-none"
      style={{ bottom: bottomPx }}
    >
      <Portrait characterName={payload.characterName} expression={expression} />
      <div className="flex flex-col gap-2 flex-1">
        <TextBox
          characterName={payload.characterName}
          text={payload.text}
          onClose={onClose}
          onTypingDone={() => setTypingDone(true)}
          autoCloseProgress={typingDone ? progress : null}
          onCloseHover={() => setExpression('mad')}
          onCloseHoverEnd={() => setExpression(payload.expression)}
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
              <>
                <button
                  onClick={handleSpeakClick}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  🎤 Speak Back
                </button>
                <button
                  onClick={() => setShowVoicePrompt(false)}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  ✕ Dismiss
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

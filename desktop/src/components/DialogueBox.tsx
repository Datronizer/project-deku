import { useState } from 'react'
import { Portrait } from './Portrait'
import { TextBox } from './TextBox'
import type { DialoguePayload } from '../types'

interface Props {
  payload: DialoguePayload
  onClose: () => void
}

export function DialogueBox({ payload, onClose }: Props) {
  const [typingDone, setTypingDone] = useState(false)

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[640px] flex items-end gap-4 pointer-events-auto select-none">
      <Portrait characterName={payload.characterName} expression={payload.expression} />
      <TextBox
        characterName={payload.characterName}
        text={payload.text}
        onClose={onClose}
        onTypingDone={() => setTypingDone(true)}
      />
    </div>
  )
}

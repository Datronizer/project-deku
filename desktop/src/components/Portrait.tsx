import { useState, useEffect } from 'react'
import type { Expression } from '../types'

interface Props {
  characterName: string
  expression: Expression
}

const EXTS = ['png', 'jpg', 'webp']

function portraitCandidates(characterName: string, expression: Expression) {
  return EXTS.map(ext => `/characters/${characterName}/${expression}.${ext}`)
}

export function Portrait({ characterName, expression }: Props) {
  const [shown, setShown] = useState(expression)
  const [visible, setVisible] = useState(true)
  const [candidates, setCandidates] = useState(() => portraitCandidates(characterName, expression))

  useEffect(() => {
    if (expression === shown) return
    setVisible(false)
    const t = setTimeout(() => {
      setShown(expression)
      setCandidates(portraitCandidates(characterName, expression))
      setVisible(true)
    }, 120)
    return () => clearTimeout(t)
  }, [expression, shown, characterName])

  function handleError(e: React.SyntheticEvent<HTMLImageElement>) {
    if (candidates.length > 1) {
      setCandidates(candidates.slice(1))
    } else {
      e.currentTarget.src = '/characters/placeholder.jpg'
    }
  }

  return (
    <div className="flex-shrink-0 w-40 h-48 relative">
      <img
        src={candidates[0]}
        alt={`${characterName} ${shown}`}
        className={`w-full h-full object-contain drop-shadow-2xl transition-opacity duration-[120ms] ${visible ? 'opacity-100' : 'opacity-0'}`}
        draggable={false}
        onError={handleError}
      />
    </div>
  )
}

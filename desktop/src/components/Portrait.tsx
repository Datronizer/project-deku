import type { Expression } from '../types'

interface Props {
  characterName: string
  expression: Expression
}

// Map expression → image path under /public/characters/<name>/<expression>.png
function portraitSrc(characterName: string, expression: Expression) {
  return `/characters/${characterName}/${expression}.png`
}

export function Portrait({ characterName, expression }: Props) {
  return (
    <div className="flex-shrink-0 w-40 h-48 relative">
      <img
        src={portraitSrc(characterName, expression)}
        alt={`${characterName} ${expression}`}
        className="w-full h-full object-contain drop-shadow-2xl"
        draggable={false}
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/characters/placeholder.jpg' }}
      />
    </div>
  )
}

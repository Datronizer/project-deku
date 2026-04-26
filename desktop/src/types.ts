export type Expression = 'neutral' | 'mad' | 'smug' | 'surprised'

export interface DialoguePayload {
  text: string
  expression: Expression
  characterName: string
  audioUrl?: string
}

export interface AppSettings {
  summarizer: 'gemma' | 'simple'
}

export interface DebugState {
  keyCount: number
  mouseClicks: number
  windowTitles: string[]
  lastWindow: string
  lastSummary: string
  lastCycleTime: string | null
  tier3Cooldowns: Record<string, number>
}

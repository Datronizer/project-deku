export type Expression = 'neutral' | 'mad' | 'smug' | 'surprised'

export interface DialoguePayload {
  text: string
  expression: Expression
  characterName: string
  audioUrl?: string
}

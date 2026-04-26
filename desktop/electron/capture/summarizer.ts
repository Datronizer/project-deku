export interface EventLog {
  keyCount: number
  mouseClicks: number
  windowTitles: string[]  // last few distinct titles seen this interval
  durationSeconds: number
}

export interface Summarizer {
  summarize(log: EventLog): Promise<string>
}

export class SimpleSummarizer implements Summarizer {
  async summarize(log: EventLog): Promise<string> {
    const parts: string[] = []
    const window = log.windowTitles.at(-1) ?? 'unknown'

    if (log.keyCount > 0) parts.push(`typed ${log.keyCount} keys`)
    if (log.mouseClicks > 0) parts.push(`clicked ${log.mouseClicks} times`)
    if (log.windowTitles.length > 1) {
      parts.push(`switched apps ${log.windowTitles.length - 1} time${log.windowTitles.length > 2 ? 's' : ''}`)
    }

    const activity = parts.length > 0 ? parts.join(', ') : 'was idle'
    return `User ${activity} in ${window} over the last ${log.durationSeconds}s`
  }
}

export interface EventLog {
  keyCount: number
  mouseClicks: number
  windowTitles: string[]  // last few distinct titles seen this interval
  durationSeconds: number
}

export interface Summarizer {
  summarize(log: EventLog): Promise<string>
}

// --- Simple fallback: no ML, just format the counts ---

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

// --- Gemma via ollama REST API ---

const GEMMA_MODEL = 'gemma4:2b'

export class GemmaSummarizer implements Summarizer {
  private available: boolean | null = null

  async summarize(log: EventLog): Promise<string> {
    if (this.available === false) return new SimpleSummarizer().summarize(log)

    const prompt = [
      'Summarize the following desktop activity in one short, natural sentence (max 20 words).',
      'Be specific about what the user is doing. Output only the sentence, nothing else.',
      '',
      `Window: ${log.windowTitles.at(-1) ?? 'unknown'}`,
      `All windows seen: ${log.windowTitles.join(' → ')}`,
      `Keystrokes: ${log.keyCount}`,
      `Mouse clicks: ${log.mouseClicks}`,
      `Duration: ${log.durationSeconds}s`,
    ].join('\n')

    try {
      const { ollama } = await import('../server.js')
      const text = await ollama.generate({ model: GEMMA_MODEL, prompt })
      this.available = true
      return text
    } catch (err) {
      if (this.available === null) {
        console.warn('[deku] ollama/Gemma unavailable, falling back to simple summarizer:', err)
        this.available = false
      }
      return new SimpleSummarizer().summarize(log)
    }
  }
}

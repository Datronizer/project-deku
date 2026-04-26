export interface UrgentMatch {
  category: 'social' | 'streaming' | 'gaming'
}

export const URGENT_PATTERNS: Array<{ pattern: RegExp; category: UrgentMatch['category'] }> = [
  // Social media
  { pattern: /\btwitter\b|\bx\.com\b/i,  category: 'social' },
  { pattern: /\binstagram\b/i,            category: 'social' },
  { pattern: /\btiktok\b/i,               category: 'social' },
  { pattern: /\bfacebook\b/i,             category: 'social' },
  { pattern: /\breddit\b/i,               category: 'social' },
  { pattern: /\blinkedin\b/i,             category: 'social' },
  { pattern: /\bsnapchat\b/i,             category: 'social' },
  // Streaming / video
  { pattern: /\byoutube\b/i,              category: 'streaming' },
  { pattern: /\bnetflix\b/i,              category: 'streaming' },
  { pattern: /\btwitch\b/i,               category: 'streaming' },
  { pattern: /\bhulu\b/i,                 category: 'streaming' },
  { pattern: /disney\+|disney plus/i,     category: 'streaming' },
  // Gaming
  { pattern: /\bsteam\b/i,               category: 'gaming' },
  { pattern: /\bepic games\b/i,          category: 'gaming' },
  { pattern: /\bgog\b/i,                 category: 'gaming' },
  { pattern: /league of legends/i,        category: 'gaming' },
  { pattern: /\bminecraft\b/i,           category: 'gaming' },
  { pattern: /\bvalorant\b/i,            category: 'gaming' },
  { pattern: /\broblox\b/i,              category: 'gaming' },
]

/** Returns the first matching category for a window title, or null. */
export function matchUrgentPattern(title: string): UrgentMatch['category'] | null {
  for (const { pattern, category } of URGENT_PATTERNS) {
    if (pattern.test(title)) return category
  }
  return null
}

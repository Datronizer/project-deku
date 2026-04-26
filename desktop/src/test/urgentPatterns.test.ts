import { describe, it, expect } from 'vitest'
import { matchUrgentPattern, URGENT_PATTERNS } from '../../electron/capture/patterns'

describe('matchUrgentPattern', () => {
  describe('social media', () => {
    it.each([
      ['Twitter - Home',               'social'],
      ['X.com',                        'social'],
      ['Instagram • Photo',            'social'],
      ['TikTok - Make Your Day',       'social'],
      ['Facebook',                     'social'],
      ['Reddit - the front page',      'social'],
      ['LinkedIn',                     'social'],
      ['Snapchat',                     'social'],
    ])('matches %s as %s', (title, expected) => {
      expect(matchUrgentPattern(title)).toBe(expected)
    })
  })

  describe('streaming / video', () => {
    it.each([
      ['YouTube - cat videos',         'streaming'],
      ['Netflix',                      'streaming'],
      ['Twitch - Live Stream',         'streaming'],
      ['Hulu - Watch TV',              'streaming'],
      ['Disney+ - Home',               'streaming'],
      ['Disney Plus',                  'streaming'],
    ])('matches %s as %s', (title, expected) => {
      expect(matchUrgentPattern(title)).toBe(expected)
    })
  })

  describe('gaming', () => {
    it.each([
      ['Steam',                                   'gaming'],
      ['Epic Games Launcher',                     'gaming'],
      ['GOG Galaxy',                              'gaming'],
      ['League of Legends Client',                'gaming'],
      ['Minecraft',                               'gaming'],
      ['VALORANT',                                'gaming'],
      ['Roblox',                                  'gaming'],
    ])('matches %s as %s', (title, expected) => {
      expect(matchUrgentPattern(title)).toBe(expected)
    })
  })

  describe('non-matching titles', () => {
    it.each([
      'Visual Studio Code',
      'Google Docs',
      'Terminal',
      'Finder',
      'Slack',
      'Figma',
      '',
    ])('returns null for %s', (title) => {
      expect(matchUrgentPattern(title)).toBeNull()
    })
  })

  it('is case-insensitive', () => {
    expect(matchUrgentPattern('REDDIT')).toBe('social')
    expect(matchUrgentPattern('youtube')).toBe('streaming')
    expect(matchUrgentPattern('STEAM')).toBe('gaming')
  })

  it('matches on partial window title (browser tab format)', () => {
    expect(matchUrgentPattern('r/programming - Reddit')).toBe('social')
    expect(matchUrgentPattern('Watch History - YouTube')).toBe('streaming')
  })

  it('does not false-positive on similar words', () => {
    // \bsteam\b word boundary: "SteamWorld" has no boundary between m and W
    expect(matchUrgentPattern('SteamWorld Dig')).toBeNull()
    expect(matchUrgentPattern('Livestream recording')).toBeNull()  // not twitch
    expect(matchUrgentPattern('GoGo Penguin concert')).toBeNull()  // not GOG
  })

  it('returns the first matching category when multiple could match', () => {
    // A title that matches both twitter and something else should return 'social'
    const result = matchUrgentPattern('Twitter on Steam')
    expect(result).toBe('social')
  })
})

describe('URGENT_PATTERNS coverage', () => {
  it('covers all three categories', () => {
    const categories = new Set(URGENT_PATTERNS.map(p => p.category))
    expect(categories.has('social')).toBe(true)
    expect(categories.has('streaming')).toBe(true)
    expect(categories.has('gaming')).toBe(true)
  })

  it('has no duplicate regex patterns', () => {
    const sources = URGENT_PATTERNS.map(p => p.pattern.source)
    const unique = new Set(sources)
    expect(unique.size).toBe(URGENT_PATTERNS.length)
  })
})

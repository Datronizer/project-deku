import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { DialogueBox } from '../components/DialogueBox'
import type { DialoguePayload } from '../types'

// Fast-forward useTypewriter so tests don't wait for the interval
vi.mock('../hooks/useTypewriter', () => ({
  useTypewriter: (text: string) => ({ displayed: text, done: true }),
}))

const base: DialoguePayload = {
  characterName: 'klee',
  expression: 'smug',
  text: 'Still on that tab? Impressive.',
}

describe('DialogueBox', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('renders character name and text', () => {
    render(<DialogueBox payload={base} onClose={() => {}} />)
    expect(screen.getByText('klee')).toBeInTheDocument()
    expect(screen.getByText('Still on that tab? Impressive.')).toBeInTheDocument()
  })

  it('shows esc hint and close button after typing finishes', () => {
    render(<DialogueBox payload={base} onClose={() => {}} />)
    expect(screen.getByText('esc to dismiss')).toBeInTheDocument()
    expect(screen.getByText('[close]')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<DialogueBox payload={base} onClose={onClose} />)
    fireEvent.click(screen.getByText('[close]'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when ESC is pressed', () => {
    const onClose = vi.fn()
    render(<DialogueBox payload={base} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('auto-closes after 8 seconds', () => {
    const onClose = vi.fn()
    render(<DialogueBox payload={base} onClose={onClose} />)
    expect(onClose).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(8000) })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not auto-close before 8 seconds', () => {
    const onClose = vi.fn()
    render(<DialogueBox payload={base} onClose={onClose} />)
    act(() => { vi.advanceTimersByTime(7900) })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders long text without crashing', () => {
    const payload: DialoguePayload = {
      ...base,
      text: "You've been staring at this screen for so long that I've started to wonder if you're doing a performance art piece about the slow heat death of productivity. Anyway. Hi.",
    }
    render(<DialogueBox payload={payload} onClose={() => {}} />)
    expect(screen.getByText(payload.text)).toBeInTheDocument()
  })

  it('renders with each expression', () => {
    const expressions = ['neutral', 'mad', 'smug', 'surprised'] as const
    for (const expression of expressions) {
      const { unmount } = render(
        <DialogueBox payload={{ ...base, expression }} onClose={() => {}} />
      )
      expect(screen.getByAltText(`klee ${expression}`)).toBeInTheDocument()
      unmount()
    }
  })

  describe('close button hover — expression swap', () => {
    it('switches portrait to mad on hover', () => {
      render(<DialogueBox payload={{ ...base, expression: 'smug' }} onClose={() => {}} />)
      expect(screen.getByAltText('klee smug')).toBeInTheDocument()
      fireEvent.mouseEnter(screen.getByText('[close]'))
      act(() => { vi.advanceTimersByTime(120) })
      expect(screen.getByAltText('klee mad')).toBeInTheDocument()
    })

    it('restores original expression on mouse leave', () => {
      render(<DialogueBox payload={{ ...base, expression: 'smug' }} onClose={() => {}} />)
      const btn = screen.getByText('[close]')
      fireEvent.mouseEnter(btn)
      fireEvent.mouseLeave(btn)
      expect(screen.getByAltText('klee smug')).toBeInTheDocument()
    })

    it('restores to the payload expression, not always smug', () => {
      render(<DialogueBox payload={{ ...base, expression: 'surprised' }} onClose={() => {}} />)
      const btn = screen.getByText('[close]')
      fireEvent.mouseEnter(btn)
      act(() => { vi.advanceTimersByTime(120) })
      expect(screen.getByAltText('klee mad')).toBeInTheDocument()
      fireEvent.mouseLeave(btn)
      act(() => { vi.advanceTimersByTime(120) })
      expect(screen.getByAltText('klee surprised')).toBeInTheDocument()
    })
  })

  it('falls back gracefully when portrait image is missing', () => {
    render(<DialogueBox payload={{ ...base, characterName: 'nobody' }} onClose={() => {}} />)
    const img = screen.getByRole('img')
    // exhaust png → jpg → webp, each state update needs act() to flush
    act(() => { fireEvent.error(img) })
    act(() => { fireEvent.error(img) })
    act(() => { fireEvent.error(img) })
    expect(img.getAttribute('src')).toBe('/characters/placeholder.jpg')
  })
})

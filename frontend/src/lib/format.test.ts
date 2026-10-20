import { describe, expect, it } from 'vitest'
import {
  formatBitRate,
  formatCapacity,
  formatClock,
  formatDate,
  formatDateTime,
  formatDateWithWeekday,
} from './format'

// 2026-10-20 is a Tuesday. Local time on purpose: the formatters show the machine's clock.
const date = new Date(2026, 9, 20, 22, 17, 21)

describe('format', () => {
  it('formats dates and times', () => {
    expect(formatDate(date)).toBe('2026-10-20')
    expect(formatDateTime(new Date(2026, 0, 5, 3, 4, 5))).toBe('2026-01-05 03:04:05')
  })

  it('shows the weekday in the display locale', () => {
    expect(formatDateWithWeekday(date, 'ko-KR')).toBe('2026-10-20 (화)')
    expect(formatDateWithWeekday(date, 'en-US')).toBe('2026-10-20 (Tue)')
  })

  it('shows a 12 hour clock', () => {
    expect(formatClock(date, 'en-US')).toMatch(/^10:17:21\s?PM$/)
    expect(formatClock(date, 'ko-KR')).toContain('10:17:21')
  })

  it('switches to TB at 1000 GB', () => {
    expect(formatCapacity(912)).toBe('912.0 GB')
    expect(formatCapacity(1362)).toBe('1.3 TB')
  })

  it('scales a bit rate from bps to Mbps', () => {
    expect(formatBitRate(4.57)).toBe('4.57 Kbps')
    expect(formatBitRate(0)).toBe('0.00 bps')
    expect(formatBitRate(0.5)).toBe('500.00 bps')
    expect(formatBitRate(1500)).toBe('1.50 Mbps')
  })
})

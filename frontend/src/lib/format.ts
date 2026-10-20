/** The reference design shows Korean AM/PM and weekdays; one constant to change if that changes. */
export const DISPLAY_LOCALE = 'ko-KR'

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-10-20" */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "2026-10-20 16:35:23" */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** "오후 10:17:21" */
export function formatClock(date: Date, locale = DISPLAY_LOCALE): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date)
}

/** "2026-10-20 (화)" */
export function formatDateWithWeekday(date: Date, locale = DISPLAY_LOCALE): string {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
  return `${formatDate(date)} (${weekday})`
}

/** 912 -> "912.0 GB", 1331.2 -> "1.3 TB" */
export function formatCapacity(gb: number): string {
  return gb >= 1000 ? `${(gb / 1024).toFixed(1)} TB` : `${gb.toFixed(1)} GB`
}

/** A rate in Kbps as the monitor shows it: 4.57 -> "4.57 Kbps", 0 -> "0.00 bps", 0.5 -> "500.00 bps", 1500 -> "1.50 Mbps". */
export function formatBitRate(kbps: number): string {
  if (kbps <= 0) return '0.00 bps'
  if (kbps < 1) return `${(kbps * 1000).toFixed(2)} bps`
  if (kbps < 1000) return `${kbps.toFixed(2)} Kbps`
  return `${(kbps / 1000).toFixed(2)} Mbps`
}

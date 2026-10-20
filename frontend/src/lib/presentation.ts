import type { Channel, InspectionKind, WorkState } from '@/api/types'

/**
 * How domain values look. The class names are written out in full on purpose: Tailwind finds
 * classes by scanning the source for whole strings, so `bg-work-${state}` would not exist.
 */
export const workStateClass: Record<WorkState, string> = {
  none: 'bg-work-none',
  work: 'bg-work-work',
  error: 'bg-work-error',
  complete: 'bg-work-complete',
}

export const workStateLabel: Record<WorkState, string> = {
  none: 'None',
  work: 'Work',
  error: 'Error',
  complete: 'Complete',
}

export const inspectionKindClass: Record<InspectionKind, string> = {
  bright: 'bg-kind-bright',
  dark: 'bg-kind-dark',
  chain: 'bg-kind-chain',
  skeleton: 'bg-kind-skeleton',
  barcode: 'bg-kind-barcode',
  srShift: 'bg-kind-sr-shift',
}

export const inspectionKindLabel: Record<InspectionKind, string> = {
  bright: 'Bright',
  dark: 'Dark',
  chain: 'Chain',
  skeleton: 'Skeleton',
  barcode: 'Barcode',
  srShift: 'SR Shift',
}

export const channelLabel: Record<Channel, string> = {
  red: 'Red',
  green: 'Green',
  blue: 'Blue',
}

export const channelTextClass: Record<Channel, string> = {
  red: 'text-light-red',
  green: 'text-light-green',
  blue: 'text-light-blue',
}

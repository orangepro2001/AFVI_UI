import type {
  AnalysisChannelId,
  AnalysisRow,
  AnalysisTone,
  LightAnalysis,
  NodeAnalysis,
} from '../types'

type RowSpec = [name: string, value: string | boolean, min?: string]

/** Numbers the rows 1..n and gives them one name colour. */
function rows(specs: RowSpec[], tone: AnalysisTone): AnalysisRow[] {
  return specs.map(([name, value, min], index) => {
    const row: AnalysisRow = { no: index + 1, name, value, tone }
    if (min !== undefined) row.min = min
    return row
  })
}

/** Joins blocks of rows into one table and numbers it 1..n again. */
function renumber(blocks: AnalysisRow[]): AnalysisRow[] {
  return blocks.map((row, index) => ({ ...row, no: index + 1 }))
}

/** The first table of a pad: two mask switches (green), two chain switches (yellow), then the sizes. */
function padUpper(): AnalysisRow[] {
  return renumber([
    ...rows(
      [
        ['Mask Inspection(Bright)', true],
        ['Mask Inspection(Dark)', true],
      ],
      'green',
    ),
    ...rows(
      [
        ['Chain Align', true],
        ['Chain Inspection', false],
      ],
      'yellow',
    ),
    ...rows(
      [
        ['Max Pad Size', '100.000'],
        ['Adjust Mask', '-2.000'],
        ['Adjust Margin Mask', '-2.000'],
        ['Remove SR Edge', '6.000'],
        ['Remove Hole Edge', '0.000'],
      ],
      'plain',
    ),
  ])
}

function padLower(): AnalysisRow[] {
  return rows(
    [
      ['Adjust Inner Chain(Align)', '-3.000'],
      ['Adjust Outer Chain(Align)', '1.000'],
      ['Inner Chain Weight(Align)', '1.700'],
      ['Outer Chain Weight(Align)', '1.000'],
      ['Chain Search Range(Align)', '15.000'],
      ['Chain Step(Align)', '3.000'],
      ['Chain Search TH(Align)', '0.000'],
      ['Adjust Inner Chain(Insp)', '-3.000'],
      ['Adjust Outer Chain(Insp)', '2.000'],
    ],
    'yellow',
  )
}

/** The 18 defect thresholds of a pad: a Bright and a Dark block of nine, every Min is 0.000. */
function padChannel(): AnalysisRow[] {
  const zero = '0.000'
  return rows(
    [
      ['Bright Defect(TH)', zero, zero],
      ['Bright Defect Margine(TH)', zero, zero],
      ['Bright Defect Size(Pixel)', zero, zero],
      ['Bright Defect Offest1(%)', zero, zero],
      ['Bright Defect Offset1 Size(Pixel)', zero, zero],
      ['Bright Defect Offest2(TH)', zero, zero],
      ['Bright Defect Offset2 Size(Pixel)', zero, zero],
      ['Bright Defect Pad Offest(TH)', zero, zero],
      ['Bright Defect Pad Offset Size(Pixel)', zero, zero],
      ['Dark Defect(TH)', '20.000', zero],
      ['Dark Defect Margine(TH)', zero, zero],
      ['Dark Defect Size(Pixel)', '30.000', zero],
      ['Dark Defect Offset1(%)', zero, zero],
      ['Dark Defect Offset1 Size(Pixel)', zero, zero],
      ['Dark Defect Offset2(TH)', zero, zero],
      ['Dark Defect Offset2 Size(Pixel)', zero, zero],
      ['Dark Defect Pad Offset(TH)', zero, zero],
      ['Dark Defect Pad Offset Size(Pixel)', zero, zero],
    ],
    'green',
  )
}

function nonMetalUpper(): AnalysisRow[] {
  return renumber([
    ...rows(
      [
        ['Mask Inspection(Bright)', true],
        ['Mask Inspection(Dark)', false],
      ],
      'green',
    ),
    ...rows(
      [
        ['Adjust Mask', '-10.000'],
        ['Remove Metal Edge', '0.000'],
      ],
      'plain',
    ),
  ])
}

function nonMetalChannel(): AnalysisRow[] {
  const zero = '0.000'
  return rows(
    [
      ['Bright Defect(TH)', '255.000', zero],
      ['Bright Defect Size(Pixel)', zero, zero],
      ['Bright Defect Offset1(%)', zero, zero],
      ['Bright Defect Offset1 Size(Pixel)', zero, zero],
      ['Bright Defect Offset2(TH)', zero, zero],
      ['Bright Defect Offset2 Size(Pixel)', zero, zero],
    ],
    'green',
  )
}

function userMaskChannel(): AnalysisRow[] {
  const zero = '0.000'
  return rows(
    [
      ['Cell ID', zero, zero],
      ['Barcode Area Left', zero, zero],
      ['Barcode Area Top', zero, zero],
      ['Barcode Area Right', zero, zero],
      ['Barcode Area Bottom', zero, zero],
    ],
    'plain',
  )
}

function dmgChannel(): AnalysisRow[] {
  return rows([['Min Defect Size(Pixel)', '25.000', '0.000']], 'plain')
}

const EMPTY_CHANNELS = (): Record<AnalysisChannelId, AnalysisRow[]> => ({
  red: [],
  green: [],
  blue: [],
})

/** Only the Light-2 tab has rows; Green and Blue show the Red rows (the mock has one set). */
function light2(upper: AnalysisRow[], lower: AnalysisRow[], channel: AnalysisRow[]): LightAnalysis {
  return {
    upper,
    lower,
    channels: {
      red: channel,
      green: channel.map((row) => ({ ...row })),
      blue: channel.map((row) => ({ ...row })),
    },
  }
}

function emptyLight(): LightAnalysis {
  return { upper: [], lower: [], channels: EMPTY_CHANNELS() }
}

function forLight2(light: LightAnalysis): NodeAnalysis {
  return { 1: emptyLight(), 2: light, 3: emptyLight() }
}

/** The leaf ids without their `u-`/`d-` prefix that carry a pad's tables. */
const PAD = /^(au|osp)-(cpad|bpad|lpad)$/
const NON_METAL = /^nonmetal-.+/

/**
 * The tables of one node. Pads, NonMetal items, User Mask and DMG have rows; the groups, Drill,
 * Metal, SR and unknown ids show empty tables (the reference design has no picture of those).
 */
export function createNodeAnalysis(nodeId: string): NodeAnalysis {
  const id = nodeId.replace(/^[ud]-/, '')
  if (PAD.test(id)) return forLight2(light2(padUpper(), padLower(), padChannel()))
  if (NON_METAL.test(id)) return forLight2(light2(nonMetalUpper(), [], nonMetalChannel()))
  if (id === 'etc-user-mask') return forLight2(light2([], [], userMaskChannel()))
  if (id === 'dmg') return forLight2(light2([], [], dmgChannel()))
  return { 1: emptyLight(), 2: emptyLight(), 3: emptyLight() }
}

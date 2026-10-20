import type { AlignLine, SpecNode, SpecSet, SpecTone, TeachSnapshot } from '@/api/types'

/** A node description used to build the trees: the id gets its `u-`/`d-` prefix. */
interface NodeSpec {
  id: string
  name: string
  tone: SpecTone
  /** Omitted for nodes without a checkbox (the children of Align / ROI). */
  checked?: boolean
  children?: NodeSpec[]
}

const GLOBAL_ALIGN: AlignLine[] = [
  { light: 1, channel: 'Red' },
  { light: 2, channel: 'Red' },
  { light: 3, channel: 'Green' },
]

const SR_ALIGN: AlignLine[] = [{ light: 1, channel: 'Red' }]

/** Items of a group: every item carries its own checkbox, unchecked unless said otherwise. */
function items(pairs: [string, string][], checkedId?: string): NodeSpec[] {
  return pairs.map(([id, name]) => ({
    id,
    name,
    tone: 'gold',
    checked: id === checkedId,
  }))
}

const UNIT_TREE: NodeSpec[] = [
  {
    id: 'align-roi',
    name: 'Align / ROI',
    tone: 'root',
    children: [
      { id: 'metal', name: 'Metal', tone: 'gold' },
      { id: 'sr', name: 'SR', tone: 'green' },
      { id: 'dmg', name: 'DMG', tone: 'silver' },
    ],
  },
  {
    id: 'au',
    name: 'AU',
    tone: 'gold',
    checked: false,
    children: items([
      ['au-cpad', 'C-Pad'],
      ['au-bpad', 'B-Pad'],
      ['au-lpad', 'L-Pad'],
    ]),
  },
  {
    id: 'osp',
    name: 'OSP',
    tone: 'gold',
    checked: false,
    children: items(
      [
        ['osp-cpad', 'C-Pad'],
        ['osp-bpad', 'B-Pad'],
        ['osp-lpad', 'L-Pad'],
      ],
      'osp-lpad',
    ),
  },
  {
    id: 'drill',
    name: 'Drill',
    tone: 'gold',
    checked: false,
    children: items([
      ['drill-hole', 'Hole'],
      ['drill-vent', 'Vent'],
    ]),
  },
  {
    id: 'nonmetal',
    name: 'NonMetal',
    tone: 'green',
    checked: false,
    children: [
      { id: 'nonmetal-sr-all', name: 'SR All', tone: 'green', checked: false },
      { id: 'nonmetal-pattern1', name: 'Pattern1', tone: 'green', checked: false },
      { id: 'nonmetal-patternthick', name: 'PatternThick', tone: 'green', checked: false },
      { id: 'nonmetal-space1', name: 'Space1', tone: 'green', checked: false },
      { id: 'nonmetal-spacethick', name: 'SpaceThick', tone: 'green', checked: false },
      { id: 'nonmetal-open1', name: 'Open1', tone: 'green', checked: false },
      { id: 'nonmetal-etchback', name: 'EtchBack', tone: 'green', checked: false },
      { id: 'nonmetal-open2', name: 'Open2', tone: 'green', checked: false },
    ],
  },
  {
    id: 'etc',
    name: 'ETC',
    tone: 'violet',
    checked: false,
    children: [
      { id: 'etc-sr-shift', name: 'SR Shift', tone: 'violet', checked: false },
      { id: 'etc-barcode', name: 'Barcode', tone: 'violet', checked: false },
      { id: 'etc-user-mask', name: 'User Mask', tone: 'violet', checked: false },
    ],
  },
]

const DUMMY_TREE: NodeSpec[] = [
  {
    id: 'au',
    name: 'AU',
    tone: 'gold',
    checked: false,
    children: items([
      ['au-cpad', 'C-Pad'],
      ['au-lpad', 'L-Pad'],
    ]),
  },
  {
    id: 'drill',
    name: 'Drill',
    tone: 'gold',
    checked: false,
    children: items([
      ['drill-hole', 'Hole'],
      ['drill-vent', 'Vent'],
    ]),
  },
  {
    id: 'nonmetal',
    name: 'NonMetal',
    tone: 'green',
    checked: false,
    children: [
      { id: 'nonmetal-sr-all', name: 'SR All', tone: 'green', checked: false },
      { id: 'nonmetal-pattern1', name: 'Pattern1', tone: 'green', checked: false },
      { id: 'nonmetal-space1', name: 'Space1', tone: 'green', checked: false },
      { id: 'nonmetal-open1', name: 'Open1', tone: 'green', checked: false },
      { id: 'nonmetal-open2', name: 'Open2', tone: 'green', checked: false },
    ],
  },
  {
    id: 'etc',
    name: 'ETC',
    tone: 'violet',
    checked: false,
    children: [
      { id: 'etc-sr-shift', name: 'SR Shift', tone: 'violet', checked: false },
      { id: 'etc-barcode', name: 'Barcode', tone: 'violet', checked: false },
      { id: 'etc-user-mask', name: 'User Mask', tone: 'violet', checked: false },
    ],
  },
]

/** Prefixes every id so that Unit and Dummy ids stay unique (the store keeps one checkbox map). */
function toSpecNodes(nodes: NodeSpec[], prefix: 'u-' | 'd-'): SpecNode[] {
  return nodes.map((node) => {
    const result: SpecNode = {
      id: `${prefix}${node.id}`,
      name: node.name,
      tone: node.tone,
    }
    if (node.checked !== undefined) result.checked = node.checked
    if (node.children) result.children = toSpecNodes(node.children, prefix)
    return result
  })
}

function toSpecSet(tree: NodeSpec[], prefix: 'u-' | 'd-'): SpecSet {
  return {
    globalAlign: GLOBAL_ALIGN.map((line) => ({ ...line })),
    srAlign: SR_ALIGN.map((line) => ({ ...line })),
    overlay: { mk: true, ac: false, ic: false, sk: false },
    tree: toSpecNodes(tree, prefix),
  }
}

export function createTeachSnapshot(): TeachSnapshot {
  return {
    unit: toSpecSet(UNIT_TREE, 'u-'),
    dummy: toSpecSet(DUMMY_TREE, 'd-'),
  }
}

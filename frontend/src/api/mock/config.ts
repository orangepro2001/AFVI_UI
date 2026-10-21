import type { ConfigEntry, ConfigGroup } from '../types'

function text(key: string, label: string, value: string): ConfigEntry {
  return { key, label, kind: 'text', value }
}

function number(key: string, label: string, value: string): ConfigEntry {
  return { key, label, kind: 'number', value }
}

function toggle(key: string, label: string, value: boolean): ConfigEntry {
  return { key, label, kind: 'toggle', value }
}

function choice(key: string, label: string, value: string, options: string[]): ConfigEntry {
  return { key, label, kind: 'choice', value, options }
}

/**
 * The configuration panel of the design (design/reference/left-block-menu-setting): the rows and
 * values are the ones on the screenshot; the choices of the `choice` rows are a guess, the design
 * only shows the current one.
 */
export function createConfig(): ConfigGroup[] {
  return [
    {
      id: 'language',
      title: 'Language',
      entries: [choice('language.code', 'Code', 'English', ['English', 'Korean', 'Chinese'])],
    },
    {
      id: 'export',
      title: 'Export',
      entries: [
        text('export.ip', 'IP Address', '192.168.1.203'),
        text('export.directory', 'Directory', 'Pixel\\ResultData\\Data'),
      ],
    },
    {
      id: 'backup',
      title: 'Backup',
      entries: [
        text('backup.ip', 'IP Address', '192.168.200.10'),
        text('backup.directory', 'Directory', 'PxData\\StripImage'),
      ],
    },
    {
      id: 'result3d',
      title: '3DResult',
      entries: [
        toggle('result3d.enable', '3D Enable', false),
        text('result3d.ip', 'IP Address', '192.168.1.4'),
        text('result3d.directory', 'Directory', '3d_xml server'),
      ],
    },
    {
      id: 'strip',
      title: 'Strip saving',
      entries: [
        toggle('strip.enable', 'Enable', false),
        number('strip.scale', 'Scale', '5'),
        choice('strip.light', 'Light', 'Light1', ['Light1', 'Light2', 'Light3', 'Light4']),
        choice('strip.channel', 'Color Channel', 'Color', ['Color', 'Red', 'Green', 'Blue']),
      ],
    },
    {
      id: 'format',
      title: 'Data Format',
      entries: [
        toggle('format.tavis', 'Tavis Format', false),
        toggle('format.json', 'Json Format', false),
        toggle('format.tw', 'TW Format', false),
      ],
    },
    {
      id: 'misc',
      title: 'Miscellaneous',
      entries: [
        number('misc.logCount', 'Max Log Count (Auto Save)', '50'),
        number('misc.defectCount', 'Max Defect Count', '50000'),
        number('misc.defectSize', 'Defect Image Size', '400'),
        number('misc.alignOffset', 'Align Search Offset', '100'),
        number('misc.alignScore', 'Align Minimum Score', '50'),
        number('misc.subPixelSize', 'SubPixelSize', '7'),
        number('misc.subPixelInterval', 'SubPixelInterval', '0.2'),
        choice('misc.alignMethod', 'Align Method', 'FFTW', ['FFTW', 'NCC']),
        number('misc.alignScale', 'Align Model Scale', '1.0'),
        number('misc.unitAlign', 'Unit Align', '0'),
        number('misc.autofocusLight', 'Autofocus Light', '1'),
        choice('misc.defectFormat', 'Defect Image Format', 'BMP', ['BMP', 'PNG', 'JPG']),
        number('misc.keepFolders', 'Keep Folder Count', '11'),
        number('misc.cameraUserset', 'Camera Userset', '2'),
      ],
    },
  ]
}

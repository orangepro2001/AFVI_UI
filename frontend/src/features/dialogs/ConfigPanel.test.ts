import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import ConfigPanel from './ConfigPanel.vue'

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountPanel() {
  const wrapper = mount(ConfigPanel, {
    props: { open: true },
    global: { provide: { [apiKey as symbol]: createMockApi({ live: false }) } },
    attachTo: document.body,
  })
  // reka-ui mounts the portal a tick later, and the mock answers a tick after that.
  await flushPromises()
  return wrapper
}

const text = () => document.body.textContent ?? ''
const search = () => document.body.querySelector('input[aria-label="Search"]') as HTMLInputElement
const valueButton = (value: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === value,
  )!

async function type(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

describe('ConfigPanel', () => {
  it('lists the headings and values of the design', async () => {
    const wrapper = await mountPanel()
    for (const part of [
      'Language',
      '3DResult',
      'Strip saving',
      'Miscellaneous',
      'Max Log Count (Auto Save)',
      '192.168.1.203',
      'Pixel\\ResultData\\Data',
      'FFTW',
    ]) {
      expect(text()).toContain(part)
    }
    wrapper.unmount()
  })

  it('shows the toggles as switches that read Off', async () => {
    const wrapper = await mountPanel()
    const switches = document.body.querySelectorAll('[role="switch"]')
    expect(switches).toHaveLength(5)
    expect(Array.from(switches).every((s) => s.getAttribute('aria-checked') === 'false')).toBe(true)
    expect(Array.from(switches).map((s) => s.nextElementSibling?.textContent)).toEqual(
      new Array(5).fill('Off'),
    )

    ;(switches[0] as HTMLButtonElement).click()
    await flushPromises()
    expect(document.body.querySelectorAll('[role="switch"][aria-checked="true"]')).toHaveLength(1)
    expect(switches[0]!.nextElementSibling?.textContent).toBe('On')
    wrapper.unmount()
  })

  it('filters the rows with the search field', async () => {
    const wrapper = await mountPanel()
    await type(search(), 'directory')

    expect(text()).toContain('Export')
    expect(text()).toContain('Backup')
    expect(text()).not.toContain('Strip saving')
    expect(text()).not.toContain('Max Log Count')
    wrapper.unmount()
  })

  it('folds and unfolds a group', async () => {
    const wrapper = await mountPanel()
    const heading = valueButton('Export')
    expect(heading.getAttribute('aria-expanded')).toBe('true')

    heading.click()
    await flushPromises()
    expect(text()).not.toContain('192.168.1.203')
    expect(valueButton('Export').getAttribute('aria-expanded')).toBe('false')

    valueButton('Export').click()
    await flushPromises()
    expect(text()).toContain('192.168.1.203')
    wrapper.unmount()
  })

  it('sorts without headings with the A-Z button and goes back', async () => {
    const wrapper = await mountPanel()
    ;(document.body.querySelector('[aria-label="Alphabetical"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(text()).not.toContain('Miscellaneous')
    expect(text()).toContain('Camera Userset')

    ;(document.body.querySelector('[aria-label="Categorized"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(text()).toContain('Miscellaneous')
    wrapper.unmount()
  })

  it('edits a text value and commits it with Enter', async () => {
    const wrapper = await mountPanel()
    valueButton('192.168.1.203').click()
    await flushPromises()

    const editor = document.body.querySelector<HTMLInputElement>('input[data-editor]')!
    expect(editor.value).toBe('192.168.1.203')
    await type(editor, '10.0.0.7')
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()

    expect(document.body.querySelector('input[data-editor]')).toBeNull()
    expect(text()).toContain('10.0.0.7')
    expect(text()).not.toContain('192.168.1.203')
    wrapper.unmount()
  })

  it('keeps the old value when a number row gets something else', async () => {
    const wrapper = await mountPanel()
    valueButton('50000').click()
    await flushPromises()

    const editor = document.body.querySelector<HTMLInputElement>('input[data-editor]')!
    await type(editor, 'many')
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()

    expect(text()).toContain('50000')
    expect(text()).not.toContain('many')
    wrapper.unmount()
  })

  it('picks a value of a choice row from a list', async () => {
    const wrapper = await mountPanel()
    valueButton('BMP').click()
    await flushPromises()

    const select = document.body.querySelector<HTMLSelectElement>('select[data-editor]')!
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['BMP', 'PNG', 'JPG'])
    select.value = 'PNG'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()

    expect(document.body.querySelector('select')).toBeNull()
    expect(text()).toContain('PNG')
    wrapper.unmount()
  })

  it('starts every opening with an empty search field', async () => {
    const wrapper = await mountPanel()
    await type(search(), 'zzz')
    expect(text()).not.toContain('Language')

    await wrapper.setProps({ open: false })
    await flushPromises()
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(search().value).toBe('')
    expect(text()).toContain('Language')
    wrapper.unmount()
  })
})

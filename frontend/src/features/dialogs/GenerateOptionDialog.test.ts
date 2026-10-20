import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import GenerateOptionDialog from './GenerateOptionDialog.vue'
import { canGenerate, defaultGenerateOptions } from './generate-options'

afterEach(() => {
  document.body.innerHTML = ''
})

function checkbox(label: string): HTMLButtonElement {
  return document.body.querySelector(
    `[role="checkbox"][aria-label="${label}"]`,
  ) as HTMLButtonElement
}

function radio(label: string): HTMLButtonElement {
  return document.body.querySelector(`[role="radio"][aria-label="${label}"]`) as HTMLButtonElement
}

function button(text: string): HTMLButtonElement {
  return Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement
}

async function mountDialog() {
  const wrapper = mount(GenerateOptionDialog, {
    props: { open: true },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('GenerateOptionDialog', () => {
  it('starts with #2, All off, MT and SR on, OK enabled', async () => {
    const wrapper = await mountDialog()
    expect(radio('2').getAttribute('aria-checked')).toBe('true')
    expect(radio('1').getAttribute('aria-checked')).toBe('false')
    expect(radio('3').getAttribute('aria-checked')).toBe('false')
    expect(checkbox('All').getAttribute('aria-checked')).toBe('false')
    expect(checkbox('MT').getAttribute('aria-checked')).toBe('true')
    expect(checkbox('SR').getAttribute('aria-checked')).toBe('true')
    expect(button('OK').disabled).toBe(false)
    wrapper.unmount()
  })

  it('selects #1 when clicked', async () => {
    const wrapper = await mountDialog()
    radio('1').click()
    await wrapper.vm.$nextTick()
    expect(radio('1').getAttribute('aria-checked')).toBe('true')
    expect(radio('2').getAttribute('aria-checked')).toBe('false')
    wrapper.unmount()
  })

  it('toggles All and restores the previous radio', async () => {
    const wrapper = await mountDialog()
    radio('1').click()
    await wrapper.vm.$nextTick()
    checkbox('All').click()
    await wrapper.vm.$nextTick()
    expect(checkbox('All').getAttribute('aria-checked')).toBe('true')
    expect(radio('1').getAttribute('aria-checked')).toBe('false')
    expect(radio('2').getAttribute('aria-checked')).toBe('false')
    expect(radio('3').getAttribute('aria-checked')).toBe('false')

    checkbox('All').click()
    await wrapper.vm.$nextTick()
    expect(checkbox('All').getAttribute('aria-checked')).toBe('false')
    expect(radio('1').getAttribute('aria-checked')).toBe('true')
    wrapper.unmount()
  })

  it('disables OK when no area is selected', async () => {
    const wrapper = await mountDialog()
    checkbox('MT').click()
    await wrapper.vm.$nextTick()
    checkbox('SR').click()
    await wrapper.vm.$nextTick()
    expect(button('OK').disabled).toBe(true)
    wrapper.unmount()
  })

  it('emits confirm with the options and closes', async () => {
    const wrapper = await mountDialog()
    button('OK').click()
    await wrapper.vm.$nextTick()
    const emitted = wrapper.emitted('confirm')
    expect(emitted).toBeDefined()
    expect(emitted![0]).toEqual([{ light: 2, mt: true, sr: true }])
    const openEmitted = wrapper.emitted('update:open')
    expect(openEmitted).toBeDefined()
    expect(openEmitted![0]).toEqual([false])
    wrapper.unmount()
  })

  it('does not emit confirm on Cancel', async () => {
    const wrapper = await mountDialog()
    button('Cancel').click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('confirm')).toBeUndefined()
    const openEmitted = wrapper.emitted('update:open')
    expect(openEmitted).toBeDefined()
    expect(openEmitted![0]).toEqual([false])
    wrapper.unmount()
  })

  it('resets to defaults when reopened', async () => {
    const wrapper = await mountDialog()
    radio('3').click()
    checkbox('MT').click()
    await wrapper.vm.$nextTick()

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(radio('2').getAttribute('aria-checked')).toBe('true')
    expect(radio('3').getAttribute('aria-checked')).toBe('false')
    expect(checkbox('All').getAttribute('aria-checked')).toBe('false')
    expect(checkbox('MT').getAttribute('aria-checked')).toBe('true')
    expect(checkbox('SR').getAttribute('aria-checked')).toBe('true')
    wrapper.unmount()
  })
})

describe('generate-options', () => {
  it('returns a fresh default object each call', () => {
    const a = defaultGenerateOptions()
    const b = defaultGenerateOptions()
    expect(a).toEqual({ light: 2, mt: true, sr: true })
    expect(a).not.toBe(b)
  })

  it('canGenerate reflects the area flags', () => {
    expect(canGenerate({ light: 2, mt: true, sr: true })).toBe(true)
    expect(canGenerate({ light: 2, mt: true, sr: false })).toBe(true)
    expect(canGenerate({ light: 2, mt: false, sr: true })).toBe(true)
    expect(canGenerate({ light: 2, mt: false, sr: false })).toBe(false)
  })
})

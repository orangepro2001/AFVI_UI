import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import MedianDialog from './MedianDialog.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountDialog() {
  const wrapper = mount(MedianDialog, {
    props: { open: true },
    global: { provide: { [apiKey as symbol]: createMockApi({ live: false }) } },
    attachTo: document.body,
  })
  // reka-ui mounts the portal a tick later, and the mock answers a tick after that.
  await flushPromises()
  return wrapper
}

const button = (text: string) =>
  Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement

const checkbox = (label: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="checkbox"]')).find(
    (b) => b.textContent?.trim() === label,
  )!

const cell = (index: number) =>
  document.body.querySelector<SVGRectElement>(`[data-cell="${index}"]`)!

const selectedCount = () => document.body.querySelectorAll('rect[aria-checked="true"]').length

describe('MedianDialog', () => {
  it('shows the title, the four lights and the 6 x 32 unit map', async () => {
    const wrapper = await mountDialog()
    const text = document.body.textContent ?? ''
    expect(text).toContain('Median')
    for (const label of ['Light1', 'Light2', 'Light3', 'Light4']) expect(text).toContain(label)
    expect(document.body.querySelectorAll('rect[data-cell]')).toHaveLength(192)

    expect(checkbox('Light1').getAttribute('aria-checked')).toBe('false')
    expect(checkbox('Light2').getAttribute('aria-checked')).toBe('true')
    expect(checkbox('Light3').getAttribute('aria-checked')).toBe('true')
    expect(checkbox('Light4').disabled).toBe(true)

    wrapper.unmount()
  })

  it('starts with no unit selected and the random field disabled at 55', async () => {
    const wrapper = await mountDialog()
    expect(selectedCount()).toBe(0)
    const field = document.body.querySelector('input') as HTMLInputElement
    expect(field.disabled).toBe(true)
    expect(field.value).toBe('55')
    wrapper.unmount()
  })

  it('toggles a unit by clicking it', async () => {
    const wrapper = await mountDialog()
    cell(7).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(cell(7).getAttribute('aria-checked')).toBe('true')
    expect(selectedCount()).toBe(1)

    cell(7).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(selectedCount()).toBe(0)
    wrapper.unmount()
  })

  it('selects and clears every unit', async () => {
    const wrapper = await mountDialog()
    button('Select All').click()
    await wrapper.vm.$nextTick()
    expect(selectedCount()).toBe(192)

    button('Clear All').click()
    await wrapper.vm.$nextTick()
    expect(selectedCount()).toBe(0)
    wrapper.unmount()
  })

  it('picks the number of random units once the box is checked', async () => {
    const wrapper = await mountDialog()
    checkbox('Select Random Units :').click()
    await wrapper.vm.$nextTick()

    const field = document.body.querySelector('input') as HTMLInputElement
    expect(field.disabled).toBe(false)
    expect(selectedCount()).toBe(55)

    field.value = '10'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(selectedCount()).toBe(10)
    wrapper.unmount()
  })

  it('keeps only digits in the random field', async () => {
    const wrapper = await mountDialog()
    checkbox('Select Random Units :').click()
    await wrapper.vm.$nextTick()

    const field = document.body.querySelector('input') as HTMLInputElement
    field.value = '1a2b'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(field.value).toBe('12')
    wrapper.unmount()
  })

  it('hands the lights and units over on SAVE and closes', async () => {
    const wrapper = await mountDialog()
    cell(0).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    cell(191).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    checkbox('Light1').click()
    checkbox('Light2').click()
    await wrapper.vm.$nextTick()

    button('SAVE').click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('save')).toEqual([[{ lights: [1, 3], cells: [0, 191] }]])
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
    wrapper.unmount()
  })

  it('closes with the close button', async () => {
    const wrapper = await mountDialog()
    ;(document.body.querySelector('[aria-label="Close"]') as HTMLButtonElement).click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
    wrapper.unmount()
  })
})

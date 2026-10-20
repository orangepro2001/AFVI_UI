import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import ModelSelectDialog from './ModelSelectDialog.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountDialog(api = createMockApi({ live: false })) {
  const pinia = createPinia()
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)

  const wrapper = mount(ModelSelectDialog, {
    props: { open: false },
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
    attachTo: document.body,
  })
  await wrapper.setProps({ open: true })
  await flushPromises()
  return wrapper
}

function buttons(): HTMLButtonElement[] {
  return Array.from(document.body.querySelectorAll('button'))
}

function findButton(label: string): HTMLButtonElement | undefined {
  return buttons().find((b) => b.textContent?.trim() === label)
}

function rows(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll('[role="option"]'))
}

describe('ModelSelectDialog', () => {
  it('shows the title, the panel title and the five headers', async () => {
    const wrapper = await mountDialog()
    const text = document.body.textContent ?? ''
    expect(text).toContain('Choose Model Names')
    expect(text).toContain('Product - Model')
    expect(text).toContain('Index')
    expect(text).toContain('Creation Date/Time')
    expect(text).toContain('Name')
    expect(text).toContain('State')
    expect(text).toContain('Resolution')

    expect(rows()).toHaveLength(64)
    expect(text).toContain('21csp043-09')
    wrapper.unmount()
  })

  it('enables Apply after a click and emits the model', async () => {
    const wrapper = await mountDialog()
    const applyButton = findButton('Apply')!
    expect(applyButton).toBeDefined()
    expect(applyButton.disabled).toBe(true)

    const first = rows()[0]!
    await first.click()
    expect(first.getAttribute('aria-selected')).toBe('true')
    expect(first.className).toContain('bg-dialog-border/45')
    expect(applyButton.disabled).toBe(false)

    await applyButton.click()

    const applied = wrapper.emitted('apply')
    expect(applied).toBeDefined()
    expect((applied![0]![0] as { name: string }).name).toBe('21csp043-09')

    const opened = wrapper.emitted('update:open')
    expect(opened).toBeDefined()
    expect(opened!.at(-1)).toEqual([false])

    wrapper.unmount()
  })

  it('applies on a double click', async () => {
    const wrapper = await mountDialog()
    const first = rows()[0]!
    first.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await flushPromises()

    const applied = wrapper.emitted('apply')
    expect(applied).toBeDefined()
    expect((applied![0]![0] as { index: string }).index).toBe('01')
    expect(wrapper.emitted('update:open')!.at(-1)).toEqual([false])

    wrapper.unmount()
  })

  it('closes without applying on Cancel', async () => {
    const wrapper = await mountDialog()
    const first = rows()[0]!
    await first.click()
    await findButton('Cancel')!.click()

    expect(wrapper.emitted('apply')).toBeUndefined()
    expect(wrapper.emitted('update:open')!.at(-1)).toEqual([false])

    wrapper.unmount()
  })

  it('clears the selection when reopened', async () => {
    const wrapper = await mountDialog()
    await rows()[0]!.click()
    expect(findButton('Apply')!.disabled).toBe(false)

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(findButton('Apply')!.disabled).toBe(true)
    expect(rows()[0]!.getAttribute('aria-selected')).toBe('false')

    wrapper.unmount()
  })

  it('shows an empty list when getModels rejects', async () => {
    const mock = createMockApi({ live: false })
    const api = { ...mock, getModels: () => Promise.reject(new Error('x')) }
    const wrapper = await mountDialog(api)
    await flushPromises()

    expect(rows()).toHaveLength(0)
    expect(findButton('Apply')!.disabled).toBe(true)

    wrapper.unmount()
  })

  it('ignores a slow earlier load that resolves after a later open', async () => {
    const mock = createMockApi({ live: false })
    let resolveFirst: ((value: Awaited<ReturnType<typeof mock.getModels>>) => void) | undefined
    let call = 0
    const api = {
      ...mock,
      getModels: () => {
        call++
        if (call === 1) {
          return new Promise<Awaited<ReturnType<typeof mock.getModels>>>((resolve) => {
            resolveFirst = resolve
          })
        }
        return mock.getModels()
      },
    }

    const pinia = createPinia()
    const app = createApp({}).provide(apiKey, api)
    app.use(pinia)
    setActivePinia(pinia)

    const wrapper = mount(ModelSelectDialog, {
      props: { open: false },
      global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
      attachTo: document.body,
    })

    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(rows()).toHaveLength(0)

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(rows()).toHaveLength(64)

    const stale = await mock.getModels()
    resolveFirst?.([stale[0]!])
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(rows()).toHaveLength(64)
    expect(document.body.textContent).toContain('21csp043-09')

    wrapper.unmount()
  })

  it('does not emit a second apply after it has closed', async () => {
    const wrapper = await mountDialog()
    // Keep the row: once Apply has closed the dialog, the rows are gone from the document.
    const first = rows()[0]!
    await first.click()
    await findButton('Apply')!.click()
    await flushPromises()

    expect(wrapper.emitted('apply')).toHaveLength(1)

    first.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('apply')).toHaveLength(1)

    wrapper.unmount()
  })

  it('moves the selection with the keyboard and applies it with Enter', async () => {
    const wrapper = await mountDialog()
    const listbox = document.body.querySelector<HTMLElement>('[role="listbox"]')!
    expect(listbox).not.toBeNull()

    function press(key: string) {
      listbox.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    }

    press('ArrowDown')
    await flushPromises()
    let list = rows()
    expect(list[0]!.getAttribute('aria-selected')).toBe('true')
    expect(listbox.getAttribute('aria-activedescendant')).toBe(list[0]!.id)

    press('ArrowDown')
    await flushPromises()
    list = rows()
    expect(list[1]!.getAttribute('aria-selected')).toBe('true')
    expect(listbox.getAttribute('aria-activedescendant')).toBe(list[1]!.id)

    press('End')
    await flushPromises()
    list = rows()
    expect(list).toHaveLength(64)
    expect(list[63]!.getAttribute('aria-selected')).toBe('true')
    expect(listbox.getAttribute('aria-activedescendant')).toBe(list[63]!.id)

    press('Enter')
    await flushPromises()
    const applied = wrapper.emitted('apply')
    expect(applied).toBeDefined()
    expect((applied![0]![0] as { index: string }).index).toBe('64')

    wrapper.unmount()
  })

  it('does not apply on Enter without a selection', async () => {
    const wrapper = await mountDialog()
    const listbox = document.body.querySelector<HTMLElement>('[role="listbox"]')!
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('apply')).toBeUndefined()

    wrapper.unmount()
  })
})

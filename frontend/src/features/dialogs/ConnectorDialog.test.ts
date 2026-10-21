import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiKey, type ApiClient } from '@/api/client'
import { createMockApi } from '@/api/mock'
import type { ConnectorConfig, ConnectorInput } from '@/api/types'
import ConnectorDialog from './ConnectorDialog.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountDialog(api: ApiClient = createMockApi({ live: false })) {
  const pinia = createPinia()
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)

  const wrapper = mount(ConnectorDialog, {
    props: { open: false },
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
    attachTo: document.body,
  })
  await wrapper.setProps({ open: true })
  await flushPromises()
  return wrapper
}

function findButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  )
}

function folderInput(id: string): HTMLInputElement {
  const input = document.body.querySelector<HTMLInputElement>(`input[aria-label="${id} folder"]`)
  if (!input) throw new Error(`input for ${id} not found`)
  return input
}

function radio(id: string): HTMLButtonElement {
  const button = document.body.querySelector<HTMLButtonElement>(`button[aria-label="Use ${id}"]`)
  if (!button) throw new Error(`radio for ${id} not found`)
  return button
}

async function setPath(id: string, path: string) {
  const input = folderInput(id)
  input.value = path
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  await flushPromises()
}

describe('ConnectorDialog', () => {
  it('shows the title and the hint', async () => {
    const wrapper = await mountDialog()
    const text = document.body.textContent ?? ''
    expect(text).toContain('Connector')
    expect(text).toContain(
      'Choose the folder of each host. It must contain PxInventory and PxRepository.',
    )
    wrapper.unmount()
  })

  it('shows the three hosts with FM1 ok and active, FM2 and BM unset', async () => {
    const wrapper = await mountDialog()
    expect(folderInput('FM1').value).toBe('D:\\AFVI\\FM1')
    expect(folderInput('FM2').value).toBe('')
    expect(folderInput('BM').value).toBe('')

    const text = document.body.textContent ?? ''
    expect(text).toContain('OK')
    expect(text).toContain('Not configured')
    expect(radio('FM1').getAttribute('aria-checked')).toBe('true')

    wrapper.unmount()
  })

  it('checks FM2 and lets the operator pick it as the active host', async () => {
    const wrapper = await mountDialog()
    await setPath('FM2', '/data/fm2')

    expect(document.body.textContent).toContain('OK')
    // A valid row does not steal the active host.
    expect(radio('FM2').getAttribute('aria-checked')).toBe('false')

    await radio('FM2').click()
    await flushPromises()
    expect(radio('FM2').getAttribute('aria-checked')).toBe('true')
    expect(radio('FM1').getAttribute('aria-checked')).toBe('false')

    wrapper.unmount()
  })

  it('rejects a relative path and disables that row and Apply', async () => {
    const wrapper = await mountDialog()
    await setPath('FM2', 'rel')

    expect(document.body.textContent).toContain('path must be absolute')
    expect(radio('FM2').disabled).toBe(true)
    expect(findButton('Apply')!.disabled).toBe(true)

    wrapper.unmount()
  })

  it('keeps Apply disabled while the field was edited and not checked yet', async () => {
    const wrapper = await mountDialog()
    expect(findButton('Apply')!.disabled).toBe(false)

    // Typing alone (no change event yet): the old OK result is about the old folder.
    const input = folderInput('FM1')
    input.value = '/somewhere/else'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    expect(findButton('Apply')!.disabled).toBe(true)
    expect(radio('FM2').disabled).toBe(true)

    // The check of the new folder re-enables it.
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    expect(findButton('Apply')!.disabled).toBe(false)

    wrapper.unmount()
  })

  it('clears the active host when its folder is emptied', async () => {
    const wrapper = await mountDialog()
    await setPath('FM1', '')

    expect(radio('FM1').getAttribute('aria-checked')).toBe('false')
    expect(findButton('Apply')!.disabled).toBe(true)
    expect(document.body.textContent).toContain('Not configured')

    wrapper.unmount()
  })

  it('fills the path from Browse and checks it', async () => {
    const mock = createMockApi({ live: false })
    const api = { ...mock, pickFolder: vi.fn(async () => '/picked') }
    const wrapper = await mountDialog(api)

    const browse = Array.from(document.body.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Browse…',
    )
    await browse[1]!.click()
    await flushPromises()

    expect(folderInput('FM2').value).toBe('/picked')
    expect(api.pickFolder).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('keeps the path when Browse is cancelled', async () => {
    const mock = createMockApi({ live: false })
    const api = { ...mock, pickFolder: vi.fn(async () => '') }
    const wrapper = await mountDialog(api)

    const browse = Array.from(document.body.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Browse…',
    )
    await browse[1]!.click()
    await flushPromises()

    expect(folderInput('FM2').value).toBe('')
    wrapper.unmount()
  })

  it('shows the reason Browse failed in that row', async () => {
    const mock = createMockApi({ live: false })
    const api = {
      ...mock,
      pickFolder: vi.fn(async () => {
        throw new Error('no window')
      }),
    }
    const wrapper = await mountDialog(api)

    const browse = Array.from(document.body.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Browse…',
    )
    await browse[1]!.click()
    await flushPromises()

    expect(document.body.textContent).toContain('no window')
    wrapper.unmount()
  })

  it('saves the draft and emits applied', async () => {
    const mock = createMockApi({ live: false })
    let saved: ConnectorInput | null = null
    const api = {
      ...mock,
      saveConnector: vi.fn(async (input: ConnectorInput): Promise<ConnectorConfig> => {
        saved = input
        return { ...(await mock.getConnector()), active: input.active }
      }),
    }
    const wrapper = await mountDialog(api)

    await setPath('FM2', '/data/fm2')
    await findButton('Apply')!.click()
    await flushPromises()

    expect(saved).toEqual({
      machines: [
        { id: 'FM1', path: 'D:\\AFVI\\FM1' },
        { id: 'FM2', path: '/data/fm2' },
        { id: 'BM', path: '' },
      ],
      active: 'FM1',
    })
    expect(wrapper.emitted('applied')).toHaveLength(1)
    expect(wrapper.emitted('update:open')!.at(-1)).toEqual([false])

    wrapper.unmount()
  })

  it('stays open and shows the error when saving fails', async () => {
    const mock = createMockApi({ live: false })
    const api = {
      ...mock,
      saveConnector: vi.fn(async () => {
        throw new Error('FM2: PxRepository is missing')
      }),
    }
    const wrapper = await mountDialog(api)

    await findButton('Apply')!.click()
    await flushPromises()

    expect(wrapper.emitted('applied')).toBeUndefined()
    expect(document.body.textContent).toContain('FM2: PxRepository is missing')

    wrapper.unmount()
  })

  it('shows the reason when getConnector rejects', async () => {
    const mock = createMockApi({ live: false })
    const api = { ...mock, getConnector: () => Promise.reject(new Error('offline')) }
    const wrapper = await mountDialog(api)

    expect(document.body.textContent).toContain('offline')
    expect(folderInput('FM1').value).toBe('')
    expect(findButton('Apply')!.disabled).toBe(true)

    wrapper.unmount()
  })

  it('drops an unsaved draft when reopened', async () => {
    const wrapper = await mountDialog()
    await setPath('FM2', '/data/fm2')
    expect(folderInput('FM2').value).toBe('/data/fm2')

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(folderInput('FM2').value).toBe('')
    wrapper.unmount()
  })
})

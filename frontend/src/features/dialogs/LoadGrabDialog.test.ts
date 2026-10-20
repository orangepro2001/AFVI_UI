import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import LoadGrabDialog from './LoadGrabDialog.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountDialog() {
  const wrapper = mount(LoadGrabDialog, {
    props: { open: true },
    attachTo: document.body,
  })
  // reka-ui mounts the portal a tick later.
  await flushPromises()
  return wrapper
}

describe('LoadGrabDialog', () => {
  it('shows the title and an empty list box', async () => {
    const wrapper = await mountDialog()
    const text = document.body.textContent ?? ''
    expect(text).toContain('Load grab images')

    const list = document.body.querySelector('[role="listbox"]')
    expect(list).not.toBeNull()
    expect(list!.children.length).toBe(0)

    wrapper.unmount()
  })

  it('keeps Load disabled and closes on Cancel', async () => {
    const wrapper = await mountDialog()
    const buttons = Array.from(document.body.querySelectorAll('button')).map((b) =>
      b.textContent?.trim(),
    )
    const load = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Load',
    ) as HTMLButtonElement
    const cancel = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement

    expect(buttons).toContain('Load')
    expect(buttons).toContain('Cancel')
    expect(load.disabled).toBe(true)

    cancel.click()
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:open')
    expect(emitted).toBeDefined()
    expect(emitted![0]).toEqual([false])

    wrapper.unmount()
  })
})

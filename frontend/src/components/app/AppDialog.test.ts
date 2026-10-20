import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import AppDialog from './AppDialog.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AppDialog', () => {
  it('draws the title, the veil and the content, and closes', async () => {
    const wrapper = mount(AppDialog, {
      props: { open: true, title: 'Hello' },
      slots: { default: '<p id="inner">x</p>' },
      attachTo: document.body,
    })
    // reka-ui mounts the portal a tick later.
    await flushPromises()

    // The dialog is teleported to <body>.
    const body = document.body
    expect(body.textContent).toContain('Hello')
    expect(
      Array.from(body.querySelectorAll('*')).some((el) =>
        el.classList.contains('bg-dialog-veil/40'),
      ),
    ).toBe(true)
    expect(body.querySelector('.w-\\[440px\\]')).not.toBeNull()
    expect(body.querySelector('.h-\\[292px\\]')).not.toBeNull()
    expect(body.querySelector('#inner')).not.toBeNull()

    const close = body.querySelector('[aria-label="Close"]') as HTMLElement
    expect(close).not.toBeNull()
    close.click()
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:open')
    expect(emitted).toBeDefined()
    expect(emitted![0]).toEqual([false])

    wrapper.unmount()
  })
})

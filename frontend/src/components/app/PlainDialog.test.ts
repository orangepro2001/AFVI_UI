import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import PlainDialog from './PlainDialog.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('PlainDialog', () => {
  it('draws the title, the shell and the slot, and closes', async () => {
    const wrapper = mount(PlainDialog, {
      props: { open: true, title: 'Generate Option' },
      slots: { default: '<p id="inner">x</p>' },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body
    expect(body.textContent).toContain('Generate Option')
    expect(
      Array.from(body.querySelectorAll('*')).some((el) => el.classList.contains('bg-dialog-veil')),
    ).toBe(false)
    expect(body.querySelector('.w-\\[253px\\]')).not.toBeNull()
    expect(body.querySelector('.h-\\[302px\\]')).not.toBeNull()
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

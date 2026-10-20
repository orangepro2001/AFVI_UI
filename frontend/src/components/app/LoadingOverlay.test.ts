import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LoadingOverlay from './LoadingOverlay.vue'

function dotOpacity(dot: Element): number {
  return Number((dot as HTMLElement).style.opacity)
}

describe('LoadingOverlay', () => {
  it('renders a status region with the busy text', () => {
    const wrapper = mount(LoadingOverlay)
    const status = wrapper.find('[role="status"]')
    expect(status.exists()).toBe(true)
    expect(status.attributes('aria-busy')).toBe('true')
    expect(wrapper.text()).toContain('Please wait...')
    wrapper.unmount()
  })

  it('renders 14 dots with falling opacity', () => {
    const wrapper = mount(LoadingOverlay)
    const dots = wrapper.findAll('.busy-ring .rounded-full')
    expect(dots.length).toBe(14)

    const first = dotOpacity(dots[0].element)
    const last = dotOpacity(dots[13].element)
    expect(first).toBeCloseTo(1, 5)
    expect(last).toBeCloseTo(0.15, 5)

    for (let i = 1; i < dots.length; i++) {
      expect(dotOpacity(dots[i].element)).toBeLessThan(dotOpacity(dots[i - 1].element))
    }
    wrapper.unmount()
  })

  it('is transparent and covers the viewport', () => {
    const wrapper = mount(LoadingOverlay)
    const status = wrapper.find('[role="status"]')
    const classes = status.classes()
    expect(classes).toContain('fixed')
    expect(classes).toContain('inset-0')
    expect(classes.some((c) => c.startsWith('bg-'))).toBe(false)
    wrapper.unmount()
  })

  it('takes the keyboard focus on mount', async () => {
    const wrapper = mount(LoadingOverlay, { attachTo: document.body })
    await wrapper.vm.$nextTick()

    const status = document.body.querySelector('[role="status"]')
    expect(status).not.toBeNull()
    expect(status!.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(status)

    wrapper.unmount()
    document.body.innerHTML = ''
  })
})

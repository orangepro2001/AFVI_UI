import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StripViewer from './StripViewer.vue'

const grayOfImage = vi.hoisted(() => vi.fn())
vi.mock('@/lib/gray', () => ({ grayOfImage }))

const image = { url: 'median.png', width: 200, height: 100 }

/** A 4 x 2 gray picture: the left half is 10, the right half 200. */
function pixels() {
  return { data: new Uint8Array([10, 10, 200, 200, 10, 10, 200, 200]), width: 4, height: 2 }
}

function mountViewer(sample: boolean) {
  const wrapper = mount(StripViewer, { props: { image, sample } })
  const img = wrapper.find('img').element
  // happy-dom has no layout: the picture is 200 x 100 at (50, 20) of the page.
  img.getBoundingClientRect = () =>
    ({ left: 50, top: 20, width: 200, height: 100, right: 250, bottom: 120 }) as DOMRect
  return wrapper
}

function move(wrapper: ReturnType<typeof mount>, x: number, y: number) {
  return wrapper.trigger('pointermove', { clientX: x, clientY: y })
}

afterEach(() => grayOfImage.mockReset())

describe('StripViewer', () => {
  it('reports the pointer in pixels of the shown picture', async () => {
    const wrapper = mountViewer(false)
    await move(wrapper, 80, 70)
    expect(wrapper.emitted('pointer')).toEqual([[30, 50, undefined]])
    expect(grayOfImage).not.toHaveBeenCalled()
  })

  it('ignores the pointer outside the picture', async () => {
    const wrapper = mountViewer(true)
    await move(wrapper, 10, 70)
    await move(wrapper, 80, 130)
    expect(wrapper.emitted('pointer')).toBeUndefined()
  })

  it('adds the gray value under the pointer when the picture is sampled', async () => {
    grayOfImage.mockReturnValue(pixels())
    const wrapper = mountViewer(true)

    await move(wrapper, 70, 40)
    await move(wrapper, 230, 100)
    await move(wrapper, 250, 120)

    expect(wrapper.emitted('pointer')).toEqual([
      [20, 20, 10],
      [180, 80, 200],
      [200, 100, 200],
    ])
    // The values are read once for the picture, not for every move.
    expect(grayOfImage).toHaveBeenCalledTimes(1)
  })

  it('reads the values again for another picture', async () => {
    grayOfImage.mockReturnValue(pixels())
    const wrapper = mountViewer(true)
    await move(wrapper, 70, 40)
    await wrapper.setProps({ image: { ...image, url: 'other.png' } })
    wrapper.find('img').element.getBoundingClientRect = () =>
      ({ left: 50, top: 20, width: 200, height: 100, right: 250, bottom: 120 }) as DOMRect
    await move(wrapper, 70, 40)
    expect(grayOfImage).toHaveBeenCalledTimes(2)
  })

  it('has no gray value where the picture cannot be read', async () => {
    grayOfImage.mockReturnValue(null)
    const wrapper = mountViewer(true)
    await move(wrapper, 70, 40)
    expect(wrapper.emitted('pointer')).toEqual([[20, 20, undefined]])
  })
})

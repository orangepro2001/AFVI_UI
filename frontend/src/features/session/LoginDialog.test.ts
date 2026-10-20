import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { apiKey } from '@/api/client'
import { createMockApi } from '@/api/mock'
import { useAppStore } from '@/stores/app'
import LoginDialog from './LoginDialog.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountDialog() {
  const api = createMockApi({ live: false })
  const pinia = createPinia()
  // Stores read the api through inject: create the one this dialog needs inside an app that has it.
  const app = createApp({}).provide(apiKey, api)
  app.use(pinia)
  setActivePinia(pinia)
  await app.runWithContext(() => useAppStore()).load()

  const wrapper = mount(LoginDialog, {
    props: { open: true },
    global: { plugins: [pinia], provide: { [apiKey as symbol]: api } },
    attachTo: document.body,
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('LoginDialog', () => {
  it('lists the users and the labels', async () => {
    const wrapper = await mountDialog()
    const text = document.body.textContent ?? ''
    expect(text).toContain('Login - Users')
    expect(text).toContain('Admin')
    expect(text).toContain('Master')
    expect(text).toContain('Login')
    expect(text).toContain('01')
    expect(text).toContain('User name or ID :')
    expect(text).toContain('Password :')

    const buttons = Array.from(document.body.querySelectorAll('button')).map((b) =>
      b.textContent?.trim(),
    )
    expect(buttons).toContain('Logout')
    expect(buttons).toContain('Cancel')

    wrapper.unmount()
  })

  it('closes when Cancel is clicked', async () => {
    const wrapper = await mountDialog()
    const cancel = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement
    expect(cancel).toBeDefined()
    cancel.click()
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:open')
    expect(emitted).toBeDefined()
    expect(emitted![0]).toEqual([false])

    wrapper.unmount()
  })

  it('toggles the password visibility', async () => {
    const wrapper = await mountDialog()
    const password = document.body.querySelector('input[aria-label="Password"]') as HTMLInputElement
    expect(password).not.toBeNull()
    expect(password.type).toBe('password')

    const eye = document.body.querySelector(
      'button[aria-label="Show password"]',
    ) as HTMLButtonElement
    expect(eye).not.toBeNull()
    eye.click()
    await wrapper.vm.$nextTick()
    const after = document.body.querySelector('input[aria-label="Password"]') as HTMLInputElement
    expect(after.type).toBe('text')
    expect(document.body.querySelector('button[aria-label="Hide password"]')).not.toBeNull()

    wrapper.unmount()
  })

  it('forgets what was typed once it closes', async () => {
    const wrapper = await mountDialog()
    const name = document.body.querySelector('input[aria-label="User name or ID"]')
    const password = document.body.querySelector('input[aria-label="Password"]')
    ;(name as HTMLInputElement).value = 'Admin'
    name!.dispatchEvent(new Event('input'))
    ;(password as HTMLInputElement).value = 'secret'
    password!.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await flushPromises()

    const again = document.body.querySelector('input[aria-label="Password"]') as HTMLInputElement
    expect(again.value).toBe('')
    expect(
      (document.body.querySelector('input[aria-label="User name or ID"]') as HTMLInputElement)
        .value,
    ).toBe('')

    wrapper.unmount()
  })

  it('puts the focus on the user name field', async () => {
    const wrapper = await mountDialog()
    await flushPromises()
    expect(document.activeElement).toBe(
      document.body.querySelector('input[aria-label="User name or ID"]'),
    )
    wrapper.unmount()
  })
})

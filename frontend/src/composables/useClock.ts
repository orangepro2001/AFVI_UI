import { onScopeDispose, ref, type Ref } from 'vue'

/** The current time, refreshed every second, until the owner (component, store) goes away. */
export function useClock(intervalMs = 1000): Ref<Date> {
  const now = ref(new Date())
  const timer = setInterval(() => {
    now.value = new Date()
  }, intervalMs)
  onScopeDispose(() => clearInterval(timer))
  return now
}

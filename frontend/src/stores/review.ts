import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/api'
import type { DefectRow } from '@/api/types'

/** The REVIEW right-hand panel: the defects of the strip. */
export const useReviewStore = defineStore('review', () => {
  const api = useApi()

  const defects = ref<DefectRow[]>([])
  const loaded = ref(false)

  /** Loads the defects once; later calls return at once. */
  async function load() {
    if (loaded.value) return
    defects.value = await api.getDefects()
    loaded.value = true
  }

  return { defects, loaded, load }
})

<script setup lang="ts">
import { onMounted } from 'vue'
import LightChecks from '@/features/settings/LightChecks.vue'
import MaskGeneration from '@/features/settings/MaskGeneration.vue'
import SpecManagement from '@/features/settings/SpecManagement.vue'
import { useSettingsStore } from '@/stores/settings'

const store = useSettingsStore()
onMounted(() => void store.load())
</script>

<template>
  <div v-if="store.snapshot" class="relative -ml-px h-full w-[504px] bg-card">
    <MaskGeneration
      kind="metal"
      title="Defect Mask Generation (Metal)"
      class="absolute top-0 left-0"
    />
    <MaskGeneration
      kind="sr"
      title="Defect Mask Generation (SR)"
      class="absolute top-[223px] left-0"
    />
    <LightChecks
      title="Inspcetion Light"
      mode="check"
      :items="
        store.inspectionLights.map((light) => ({
          light: light.light,
          available: light.available,
          selected: light.enabled,
        }))
      "
      class="absolute top-[467px] left-0"
      @select="
        (light) => {
          const entry = store.inspectionLights.find((item) => item.light === light)
          store.setInspectionLight(light, !entry?.enabled)
        }
      "
    />
    <LightChecks
      title="Global Align Light"
      mode="radio"
      :items="
        store.globalAlignOptions.map((option) => ({
          light: option.light,
          available: option.available,
          selected: option.light === store.globalAlignLight,
        }))
      "
      class="absolute top-[529px] left-0"
      @select="store.setGlobalAlignLight"
    />
    <div class="absolute top-[615px] left-0 h-[3px] w-full bg-background" />
    <SpecManagement class="absolute top-[639px] left-0" />
  </div>
</template>

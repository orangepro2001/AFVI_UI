<script setup lang="ts">
import { onMounted } from 'vue'
import CalibrationTable from '@/features/calibrate/CalibrationTable.vue'
import LightImage from '@/features/calibrate/LightImage.vue'
import PowerSwitch from '@/features/calibrate/PowerSwitch.vue'
import { useCalibrationStore } from '@/stores/calibration'

const store = useCalibrationStore()
onMounted(() => void store.load())
</script>

<template>
  <div v-if="store.snapshot" class="relative -ml-px h-full w-[504px] bg-card">
    <LightImage :image="store.snapshot.lightImage" class="absolute top-0 left-0 h-[275px] w-full" />
    <PowerSwitch
      v-model:enabled="store.enabled"
      v-model:page-index="store.pageIndex"
      class="absolute top-[275px] left-0 h-[32px] w-full"
    />
    <CalibrationTable
      :channels="store.channels"
      class="absolute top-[312px] bottom-[12px] left-0 h-auto w-full"
      @update:on="store.setChannelOn"
      @update:brightness="store.setBrightness"
    />

    <button
      type="button"
      disabled
      class="absolute bottom-[3px] left-[4px] h-[22px] w-[93px] border border-grid bg-sheet-row text-3xs text-foreground/35"
    >
      Auto
    </button>
    <button
      type="button"
      class="absolute bottom-[3px] left-[205px] h-[22px] w-[93px] border border-grid bg-sheet-row text-3xs text-foreground"
    >
      Reload
    </button>
    <button
      type="button"
      class="absolute bottom-[3px] left-[406px] h-[22px] w-[94px] border border-grid bg-sheet-row text-3xs text-foreground"
    >
      Save
    </button>
  </div>
</template>

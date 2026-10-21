<script setup lang="ts">
import LogConsole from '@/components/app/LogConsole.vue'
import ComponentListPanel from '@/features/home/ComponentListPanel.vue'
import CpuPanel from '@/features/home/CpuPanel.vue'
import DataManagerPanel from '@/features/home/DataManagerPanel.vue'
import InspectionAreaPanel from '@/features/home/InspectionAreaPanel.vue'
import MemoryPanel from '@/features/home/MemoryPanel.vue'
import ModelBar from '@/features/home/ModelBar.vue'
import NetworkPanel from '@/features/home/NetworkPanel.vue'
import ProductInfoPanel from '@/features/home/ProductInfoPanel.vue'
import StoragePanel from '@/features/home/StoragePanel.vue'
import WorkStatusPanel from '@/features/home/WorkStatusPanel.vue'
import { useAppStore } from '@/stores/app'
import { useMachineStore } from '@/stores/machine'

const app = useAppStore()
const machine = useMachineStore()
</script>

<template>
  <div v-if="machine.snapshot && machine.stats" class="flex size-full gap-gap">
    <div class="flex min-w-0 flex-1 flex-col gap-[3px]">
      <ModelBar
        class="mb-[1px]"
        :model="app.model?.base ?? machine.snapshot.model"
        :lot="machine.snapshot.lot"
        :dmg="machine.snapshot.dmg"
      />
      <WorkStatusPanel :strips="machine.snapshot.strips" />
      <InspectionAreaPanel class="min-h-0 flex-1" :area="machine.snapshot.inspection" />
      <LogConsole :entries="machine.logs" class="mt-[1px] h-[157px] shrink-0" />
    </div>

    <aside class="flex w-aside shrink-0 flex-col gap-[3px] bg-card px-[3px] pt-[3px] pb-[3px]">
      <ProductInfoPanel :product="machine.snapshot.product" />
      <ComponentListPanel :components="machine.snapshot.components" />
      <CpuPanel :cpu="machine.stats.cpu" />
      <MemoryPanel :memory="machine.stats.memory" />
      <div class="flex h-[146px] shrink-0 gap-[3px]">
        <NetworkPanel
          v-for="network in machine.stats.networks"
          :key="network.ip"
          :network="network"
          class="flex-1"
        />
      </div>
      <div class="flex min-h-0 flex-1 gap-[3px]">
        <StoragePanel :storage="machine.stats.storage" class="flex-1" />
        <DataManagerPanel class="flex-1" />
      </div>
    </aside>
  </div>
</template>

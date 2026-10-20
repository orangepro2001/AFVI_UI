<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AnalysisPanel from '@/features/teach/AnalysisPanel.vue'
import SpecAlign from '@/features/teach/SpecAlign.vue'
import SpecTabs from '@/features/teach/SpecTabs.vue'
import SpecTree from '@/features/teach/SpecTree.vue'
import { useTeachStore } from '@/stores/teach'

const teach = useTeachStore()
onMounted(() => void teach.load())

/** The spec of the selected mode with the overlay flags the operator has toggled. */
const spec = computed(() =>
  teach.spec && teach.overlay ? { ...teach.spec, overlay: teach.overlay[teach.mode] } : null,
)
</script>

<template>
  <div v-if="spec" class="relative -ml-[2px] h-full w-[507px] bg-card">
    <SpecTabs
      v-model:section="teach.section"
      v-model:mode="teach.mode"
      v-model:light="teach.light"
    />
    <!-- Specification: x 1275..1488, y 197..925 -->
    <div class="absolute top-[79px] bottom-0 left-[4px] w-[214px] bg-muted">
      <SpecAlign :spec="spec" @toggle-overlay="teach.toggleOverlay" />
      <SpecTree
        class="absolute top-[152px] bottom-[3px] left-0 h-auto w-[214px]"
        :nodes="spec.tree"
        :checked="teach.checked"
        @toggle="teach.toggleChecked"
      />
    </div>
    <!-- Image Analysis: x 1492..1771 -->
    <AnalysisPanel
      class="absolute top-[79px] bottom-0 left-[221px] h-auto"
      :light="teach.light"
      :channel="teach.channel"
      :rows="[]"
      @update:channel="teach.channel = $event"
    />
  </div>
</template>

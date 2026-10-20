<script setup lang="ts">
import { onMounted } from 'vue'
import DefectTable from '@/features/review/DefectTable.vue'
import { useReviewStore } from '@/stores/review'

const store = useReviewStore()
onMounted(() => void store.load())
</script>

<template>
  <DefectTable :rows="store.defects" class="-ml-px w-[504px]" />
</template>

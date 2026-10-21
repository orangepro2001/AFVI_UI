<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ConnectorConfig, MachineId, PathCheck } from '@/api/types'
import { useApi } from '@/api'
import AppDialog from '@/components/app/AppDialog.vue'
import DialogButton from '@/components/app/DialogButton.vue'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ applied: [config: ConnectorConfig] }>()

const api = useApi()

/** One host of the draft: its folder, the result of the last check (null: not configured), the
 * folder that result is about (the field may have been edited since) and whether a check is
 * running. */
interface DraftRow {
  id: MachineId
  path: string
  check: PathCheck | null
  checked: string
  busy: boolean
}

const MACHINES: MachineId[] = ['FM1', 'FM2', 'BM']

function emptyRows(): DraftRow[] {
  return MACHINES.map((id) => ({ id, path: '', check: null, checked: '', busy: false }))
}

function rowsFrom(config: ConnectorConfig): DraftRow[] {
  return config.machines.map((machine) => {
    const check: PathCheck | null =
      machine.status === 'ok'
        ? { ok: true, message: '' }
        : machine.status === 'invalid'
          ? { ok: false, message: machine.message }
          : null
    return { id: machine.id, path: machine.path, check, checked: machine.path.trim(), busy: false }
  })
}

const rows = ref<DraftRow[]>(emptyRows())
const active = ref<MachineId | ''>('')
const saving = ref(false)
const saveError = ref('')

// Guards against a slow, earlier load overwriting the state of a later open.
let loadSeq = 0
// One sequence per row, so an outdated check result of that row is dropped.
const checkSeq: Record<MachineId, number> = { FM1: 0, FM2: 0, BM: 0 }
// Guards against a save that finishes after the dialog was closed.
let saveSeq = 0

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function rowOf(id: MachineId): DraftRow | undefined {
  return rows.value.find((row) => row.id === id)
}

async function load() {
  const seq = ++loadSeq
  saveError.value = ''
  saving.value = false
  saveSeq++
  rows.value = emptyRows()
  active.value = ''
  try {
    const config = await api.getConnector()
    if (seq !== loadSeq) return
    rows.value = rowsFrom(config)
    active.value = config.active
  } catch (error) {
    if (seq !== loadSeq) return
    rows.value = emptyRows()
    active.value = ''
    saveError.value = errorText(error)
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    void load()
  } else {
    // Invalidate any request still in flight when the dialog closes.
    loadSeq++
    saveSeq++
  }
})

async function validate(row: DraftRow) {
  const seq = ++checkSeq[row.id]
  const path = row.path.trim()
  if (path === '') {
    row.check = null
    row.checked = ''
    row.busy = false
    if (active.value === row.id) active.value = ''
    return
  }
  row.busy = true
  try {
    const result = await api.checkMachinePath(path)
    if (seq !== checkSeq[row.id]) return
    row.check = result
    row.checked = path
    if (result.ok) {
      if (active.value === '') active.value = row.id
    } else if (active.value === row.id) {
      active.value = ''
    }
  } catch (error) {
    if (seq !== checkSeq[row.id]) return
    row.check = { ok: false, message: errorText(error) }
    if (active.value === row.id) active.value = ''
  } finally {
    if (seq === checkSeq[row.id]) row.busy = false
  }
}

function onPathChange(row: DraftRow) {
  void validate(row)
}

async function browse(row: DraftRow) {
  try {
    const dir = await api.pickFolder(row.path)
    if (dir === '') return
    row.path = dir
    await validate(row)
  } catch (error) {
    row.check = { ok: false, message: errorText(error) }
    row.busy = false
    if (active.value === row.id) active.value = ''
  }
}

function selectRow(row: DraftRow) {
  if (!canSelect(row)) return
  active.value = row.id
}

/** The folder of the row passed the check, and the field has not been edited since. */
function verified(row: DraftRow): boolean {
  return row.check?.ok === true && row.checked === row.path.trim()
}

function canSelect(row: DraftRow): boolean {
  return verified(row) && row.path.trim() !== ''
}

function rowClass(row: DraftRow): string {
  return active.value === row.id ? 'bg-dialog-border/45' : ''
}

function statusText(row: DraftRow): string {
  if (row.busy) return 'Checking...'
  // A failed Browse leaves a message on a row that has no folder yet: show it.
  if (row.check === null) return 'Not configured'
  if (row.check.ok) return 'OK'
  return row.check.message
}

function statusClass(row: DraftRow): string {
  if (row.busy || row.check === null) return 'text-dialog-text-dim'
  if (row.check.ok) return 'text-analysis-green'
  return 'text-work-error'
}

const canApply = computed(() => {
  if (saving.value) return false
  if (rows.value.some((row) => row.busy)) return false
  for (const row of rows.value) {
    if (row.path.trim() === '') continue
    if (!verified(row)) return false
  }
  if (active.value === '') return false
  const current = rowOf(active.value)
  return current !== undefined && current.path.trim() !== ''
})

async function apply() {
  if (!canApply.value) return
  const seq = ++saveSeq
  saving.value = true
  saveError.value = ''
  try {
    const config = await api.saveConnector({
      machines: rows.value.map((row) => ({ id: row.id, path: row.path.trim() })),
      active: active.value,
    })
    if (seq !== saveSeq) return
    emit('applied', config)
    open.value = false
  } catch (error) {
    if (seq !== saveSeq) return
    saveError.value = errorText(error)
  } finally {
    if (seq === saveSeq) saving.value = false
  }
}
</script>

<template>
  <AppDialog v-model:open="open" title="Connector">
    <p class="text-2xs text-dialog-text-dim absolute top-[8px] left-[6px] w-[424px] leading-[12px]">
      Choose the folder of each host. It must contain PxInventory and PxRepository.
    </p>

    <!-- Hosts panel: origin (6, 36), 424 x 199 -->
    <div
      class="bg-dialog-list-body absolute top-[36px] left-[6px] h-[199px] w-[424px] overflow-hidden"
    >
      <!-- Title bar -->
      <div class="bg-sheet-head absolute top-0 left-0 h-[18px] w-full">
        <p class="text-2xs text-foreground absolute top-1/2 left-[5px] -translate-y-1/2">Hosts</p>
      </div>
      <!-- Rule under the title bar -->
      <div class="bg-dialog-list-rule absolute top-[18px] left-0 h-[2px] w-full" />

      <div
        v-for="(row, index) in rows"
        :key="row.id"
        :class="['absolute left-0 h-[52px] w-full', rowClass(row)]"
        :style="{ top: `${24 + index * 52}px` }"
      >
        <!-- The radio dot that makes this host the active one -->
        <button
          type="button"
          role="radio"
          :aria-checked="active === row.id"
          :aria-label="`Use ${row.id}`"
          :disabled="!canSelect(row)"
          :class="[
            'border-dialog-line absolute top-[8px] left-[8px] flex size-[12px] items-center justify-center rounded-full border outline-none',
            canSelect(row) ? '' : 'opacity-40',
          ]"
          @click="selectRow(row)"
        >
          <span v-if="active === row.id" class="size-[6px] rounded-full bg-white" />
        </button>

        <p class="text-2xs absolute top-[6px] left-[28px] w-[36px] text-white">
          {{ row.id }}
        </p>

        <div class="bg-dialog-field absolute top-[3px] left-[66px] h-[22px] w-[270px]">
          <input
            v-model="row.path"
            type="text"
            spellcheck="false"
            :aria-label="`${row.id} folder`"
            class="text-2xs h-full w-full bg-transparent px-2 text-white outline-none"
            @change="onPathChange(row)"
            @keydown.enter.prevent="onPathChange(row)"
          />
        </div>

        <DialogButton class="absolute top-[3px] left-[342px] w-[70px]" @click="browse(row)">
          Browse…
        </DialogButton>

        <p
          :class="['text-2xs absolute top-[29px] left-[66px] w-[346px] truncate', statusClass(row)]"
          :title="statusText(row)"
        >
          {{ statusText(row) }}
        </p>
      </div>
    </div>

    <!-- The reason the last save failed, if any -->
    <p
      class="text-2xs text-work-error absolute top-[247px] left-[6px] w-[224px] truncate"
      :title="saveError"
    >
      {{ saveError }}
    </p>

    <DialogButton class="absolute top-[243px] left-[239px]" :disabled="!canApply" @click="apply">
      Apply
    </DialogButton>
    <DialogButton primary class="absolute top-[243px] left-[338px]" @click="open = false">
      Cancel
    </DialogButton>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Search } from '@lucide/vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import type { ConfigEntry } from '@/api/types'
import ToggleSwitch from '@/components/app/ToggleSwitch.vue'
import { useConfigStore } from '@/stores/config'
import { buildConfigRows } from './config-rows'

const open = defineModel<boolean>('open', { required: true })

const config = useConfigStore()

const panel = ref<HTMLElement | null>(null)
const query = ref('')
const sorted = ref(false)
const collapsed = ref(new Set<string>())

/** The row being edited and what has been typed so far. */
const editingKey = ref<string | null>(null)
const draft = ref('')

const rows = computed(() =>
  buildConfigRows(config.groups, {
    query: query.value,
    collapsed: collapsed.value,
    sorted: sorted.value,
  }),
)

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    query.value = ''
    editingKey.value = null
    void config.load()
  },
  { immediate: true },
)

function toggleGroup(id: string) {
  const next = new Set(collapsed.value)
  if (!next.delete(id)) next.add(id)
  collapsed.value = next
}

function startEdit(entry: ConfigEntry) {
  editingKey.value = entry.key
  draft.value = String(entry.value)
  void nextTick(() => panel.value?.querySelector<HTMLElement>('[data-editor]')?.focus())
}

function commit() {
  const key = editingKey.value
  if (key === null) return
  editingKey.value = null
  const entry = config.groups.flatMap((group) => group.entries).find((e) => e.key === key)
  const text = draft.value.trim()
  // A number row keeps its old value when what was typed is not a number.
  if (!entry || (entry.kind === 'number' && !/^-?\d+(\.\d+)?$/.test(text))) return
  config.setValue(key, text)
}

function pick(entry: ConfigEntry, event: Event) {
  config.setValue(entry.key, (event.target as HTMLSelectElement).value)
  editingKey.value = null
}

// Escape drops an edit in progress; the next one closes the panel.
function onEscape(event: KeyboardEvent) {
  if (editingKey.value === null) return
  event.preventDefault()
  editingKey.value = null
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="bg-dialog-veil/40 fixed inset-0 z-50" />
      <DialogContent
        class="border-sheet-head bg-sheet-row w-prop fixed top-0 right-0 bottom-0 z-50 border-l outline-none"
        @interact-outside="(event) => editingKey !== null && event.preventDefault()"
        @escape-key-down="onEscape"
      >
        <DialogTitle class="sr-only">Configuration</DialogTitle>
        <DialogDescription class="sr-only">Machine settings</DialogDescription>

        <div ref="panel" class="absolute inset-0">
          <button
            type="button"
            :class="[
              'absolute top-[3px] left-[7px] flex size-[19px] items-center justify-center outline-none',
              sorted ? '' : 'bg-prop-tool-on',
            ]"
            aria-label="Categorized"
            :aria-pressed="!sorted"
            @click="sorted = false"
          >
            <svg viewBox="0 0 14 14" class="size-[14px]" fill="none" stroke-width="1">
              <rect x="1.5" y="2.5" width="3" height="3" class="stroke-muted-foreground" />
              <rect x="1.5" y="8.5" width="3" height="3" class="stroke-muted-foreground" />
              <path d="M6.5 3.5h6M6.5 5.5h6M6.5 9.5h6M6.5 11.5h6" class="stroke-muted-foreground" />
            </svg>
          </button>
          <button
            type="button"
            :class="[
              'absolute top-[3px] left-[28px] flex size-[19px] items-center justify-center outline-none',
              sorted ? 'bg-prop-tool-on' : '',
            ]"
            aria-label="Alphabetical"
            :aria-pressed="sorted"
            @click="sorted = true"
          >
            <svg viewBox="0 0 14 14" class="size-[14px]" fill="none" stroke-width="1.5">
              <path d="M1 6 3 1l2 5M1.9 4.2h2.2" class="stroke-prop-sort-a" />
              <path d="M1 8h4l-4 5h4" class="stroke-prop-sort-z" />
              <path
                d="M10 1v11M8 9.5l2 2.5 2-2.5"
                class="stroke-muted-foreground"
                stroke-width="1"
              />
            </svg>
          </button>

          <div
            class="border-sheet-line absolute top-[1px] right-[2px] left-[53px] h-[23px] border-2"
          >
            <input
              v-model="query"
              type="text"
              placeholder="Search"
              aria-label="Search"
              class="text-2xs text-foreground placeholder:text-muted-foreground absolute inset-0 bg-transparent pr-[22px] pl-[4px] outline-none"
            />
            <Search
              class="text-prop-search absolute top-[3px] right-[3px] size-[13px]"
              :stroke-width="2"
            />
          </div>

          <div class="absolute top-[27px] right-0 bottom-[46px] left-0 overflow-y-auto">
            <div
              v-for="row in rows"
              :key="row.type === 'group' ? `g-${row.id}` : `e-${row.entry.key}`"
              class="text-2xs text-foreground h-prop-row relative flex items-center"
            >
              <button
                v-if="row.type === 'group'"
                type="button"
                class="flex h-full w-full items-center pl-[20px] text-left font-semibold outline-none"
                :aria-expanded="!row.collapsed"
                @click="toggleGroup(row.id)"
              >
                <svg viewBox="0 0 8 8" class="absolute top-[5px] left-[5px] size-[8px]">
                  <path
                    v-if="row.collapsed"
                    d="M2 1 6.5 4 2 7z"
                    class="stroke-prop-arrow"
                    fill="none"
                    stroke-width="1"
                  />
                  <path v-else d="M7 1v6H1z" class="fill-prop-arrow" />
                </svg>
                {{ row.title }}
              </button>

              <template v-else>
                <span class="w-[191px] shrink-0 truncate pl-[20px]">{{ row.entry.label }}</span>

                <template v-if="row.entry.kind === 'toggle'">
                  <ToggleSwitch
                    variant="prop"
                    :model-value="row.entry.value === true"
                    :label="row.entry.label"
                    class="mr-[3px] -ml-px"
                    @update:model-value="config.setValue(row.entry.key, $event)"
                  />
                  <span>{{ row.entry.value ? 'On' : 'Off' }}</span>
                </template>

                <template v-else-if="editingKey === row.entry.key">
                  <select
                    v-if="row.entry.kind === 'choice'"
                    data-editor
                    :value="row.entry.value"
                    class="border-dialog-line-dim bg-dialog-field text-2xs text-foreground mr-[4px] h-[16px] min-w-0 flex-1 border outline-none"
                    @change="pick(row.entry, $event)"
                    @blur="editingKey = null"
                  >
                    <option v-for="option in row.entry.options" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </select>
                  <input
                    v-else
                    v-model="draft"
                    data-editor
                    type="text"
                    class="border-dialog-line-dim bg-dialog-field text-2xs text-foreground mr-[4px] h-[16px] min-w-0 flex-1 border px-[3px] outline-none"
                    @keydown.enter="commit"
                    @blur="commit"
                  />
                </template>

                <button
                  v-else
                  type="button"
                  class="mr-[4px] h-full min-w-0 flex-1 truncate text-left outline-none"
                  @click="startEdit(row.entry)"
                >
                  {{ row.entry.value }}
                </button>
              </template>
            </div>
          </div>

          <div class="bg-prop-split absolute right-0 bottom-[45px] left-0 h-px" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

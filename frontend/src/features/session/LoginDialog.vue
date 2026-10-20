<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Eye, EyeOff } from '@lucide/vue'
import AppDialog from '@/components/app/AppDialog.vue'
import DialogButton from '@/components/app/DialogButton.vue'
import { useAppStore } from '@/stores/app'

const open = defineModel<boolean>('open', { required: true })

const app = useAppStore()

const users = computed(() => app.session?.users ?? [])
const userName = ref('')
const password = ref('')
const passwordVisible = ref(false)

function close() {
  open.value = false
}

// A closed dialog forgets what was typed.
watch(open, (isOpen) => {
  if (isOpen) return
  userName.value = ''
  password.value = ''
  passwordVisible.value = false
})

// Logging out for real will be handled by the Go backend; for now it only closes the dialog.
function logout() {
  close()
}
</script>

<template>
  <AppDialog v-model:open="open" title="Log in/out">
    <!-- User list: origin (6, 5) of the body, 425 x 167; its texts are placed from the panel's own corner -->
    <div class="bg-muted absolute top-[5px] left-[6px] h-[167px] w-[425px]">
      <p class="text-2xs text-white absolute top-[10px] left-[4px] -translate-y-1/2">
        Login - Users
      </p>

      <p
        class="text-2xs text-white absolute top-[29.5px] left-[-33px] w-[120px] -translate-y-1/2 text-center"
      >
        Index
      </p>
      <p
        class="text-2xs text-white absolute top-[29.5px] left-[69.5px] w-[120px] -translate-y-1/2 text-center"
      >
        User name or ID
      </p>
      <p
        class="text-2xs text-white absolute top-[29.5px] left-[171.5px] w-[120px] -translate-y-1/2 text-center"
      >
        Level
      </p>
      <p
        class="text-2xs text-white absolute top-[29.5px] left-[236.5px] w-[120px] -translate-y-1/2 text-center"
      >
        State
      </p>

      <div v-for="(user, index) in users" :key="user.index" class="text-2xs text-analysis-plain">
        <p
          class="absolute left-[-33.5px] w-[120px] -translate-y-1/2 text-center"
          :style="{ top: `${47.5 + index * 22}px` }"
        >
          {{ user.index }}
        </p>
        <p
          class="absolute left-[58.5px] -translate-y-1/2"
          :style="{ top: `${47.5 + index * 22}px` }"
        >
          {{ user.name }}
        </p>
        <p
          class="absolute left-[172px] w-[120px] -translate-y-1/2 text-center"
          :style="{ top: `${47.5 + index * 22}px` }"
        >
          {{ user.level }}
        </p>
        <p
          class="absolute left-[237px] w-[120px] -translate-y-1/2 text-center"
          :style="{ top: `${47.5 + index * 22}px` }"
        >
          {{ user.state }}
        </p>
      </div>
    </div>

    <!-- User name: label right edge at x=192.5, centre y=189 -->
    <p
      class="text-2xs text-white absolute top-[189px] right-[calc(436px-192.5px)] -translate-y-1/2"
    >
      User name or ID :
    </p>
    <div class="bg-dialog-field absolute top-[178px] left-[199px] h-[22px] w-[232px]">
      <input
        v-model="userName"
        type="text"
        data-autofocus
        class="text-2xs text-white h-full w-full bg-transparent px-2 outline-none"
        aria-label="User name or ID"
      />
    </div>

    <!-- Password: label right edge at x=192.5, centre y=217 -->
    <p
      class="text-2xs text-white absolute top-[217px] right-[calc(436px-192.5px)] -translate-y-1/2"
    >
      Password :
    </p>
    <div class="bg-dialog-field absolute top-[206px] left-[199px] h-[22px] w-[232px]">
      <input
        v-model="password"
        :type="passwordVisible ? 'text' : 'password'"
        class="text-2xs text-white h-full w-full bg-transparent px-2 pr-8 outline-none"
        aria-label="Password"
      />
      <button
        type="button"
        class="text-muted-foreground absolute top-[3px] right-[3px]"
        :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
        @click="passwordVisible = !passwordVisible"
      >
        <component :is="passwordVisible ? EyeOff : Eye" class="size-4" :stroke-width="1.5" />
      </button>
    </div>

    <DialogButton primary class="absolute top-[243px] left-[239px]" @click="logout">
      Logout
    </DialogButton>
    <DialogButton class="absolute top-[243px] left-[338px]" @click="close">Cancel</DialogButton>
  </AppDialog>
</template>

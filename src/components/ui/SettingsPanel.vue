<template>
  <DialogRoot :open="open" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="settings-panel-backdrop" />
      <DialogContent class="settings-panel">
        <header class="settings-panel-header">
          <div>
            <p class="settings-panel-eyebrow">{{ t('settings_label') }}</p>
            <DialogTitle class="settings-panel-title">{{ title }}</DialogTitle>
          </div>
          <DialogClose as-child>
            <UiButton
              size="icon"
              variant="surface"
              class="settings-panel-close"
              :aria-label="t('settings_close')"
            >
              <IconTablerX class="settings-panel-close-icon" />
            </UiButton>
          </DialogClose>
        </header>
        <div class="settings-panel-body">
          <slot />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'radix-vue'
import IconTablerX from '../icons/IconTablerX.vue'
import { useUiI18n } from '../../composables/useUiI18n'
import UiButton from './UiButton.vue'

const { t } = useUiI18n()

const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
  'update:open': [value: boolean]
}>()

function onOpenChange(value: boolean): void {
  emit('update:open', value)
  if (!value && props.open) emit('close')
}
</script>

<style scoped>
@reference "tailwindcss";

.settings-panel-backdrop {
  @apply fixed inset-0 z-[120];
  background: rgba(0, 0, 0, 0.48);
  backdrop-filter: blur(10px);
}

.settings-panel {
  @apply fixed right-0 top-0 z-[121] flex h-full w-full max-w-md flex-col border-l px-5 py-5 outline-none;
  border-color: var(--border-subtle);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 97%, transparent), var(--surface-base));
  box-shadow: -28px 0 60px rgba(0, 0, 0, 0.28);
}

.settings-panel-header {
  @apply sticky top-0 z-[1] flex items-start justify-between gap-4 pb-5;
  border-bottom: 1px solid var(--border-subtle);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 97%, transparent), var(--surface-base));
}

.settings-panel-eyebrow {
  @apply m-0 text-[11px] font-semibold uppercase tracking-[0.22em];
  color: var(--text-muted);
}

.settings-panel-title {
  @apply m-0 pt-1 text-xl font-black tracking-[-0.03em];
  color: var(--text-default);
  font-family: var(--font-display);
}

.settings-panel-close {
  @apply shrink-0;
}

.settings-panel-close-icon {
  @apply h-4 w-4;
}

.settings-panel-body {
  @apply mt-1 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pt-5 pr-2;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
</style>

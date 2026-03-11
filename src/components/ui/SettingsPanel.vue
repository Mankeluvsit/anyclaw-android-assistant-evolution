<template>
  <div v-if="open" class="settings-panel-backdrop" @click="$emit('close')">
    <aside class="settings-panel" @click.stop>
      <header class="settings-panel-header">
        <div>
          <p class="settings-panel-eyebrow">{{ t('settings_label') }}</p>
          <h2 class="settings-panel-title">{{ title }}</h2>
        </div>
        <button
          type="button"
          class="settings-panel-close"
          :aria-label="t('settings_close')"
          @click="$emit('close')"
        >
          <IconTablerX class="settings-panel-close-icon" />
        </button>
      </header>
      <div class="settings-panel-body">
        <slot />
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import IconTablerX from '../icons/IconTablerX.vue'
import { useUiI18n } from '../../composables/useUiI18n'

const { t } = useUiI18n()

defineProps<{
  open: boolean
  title: string
}>()

defineEmits<{
  close: []
}>()
</script>

<style scoped>
@reference "tailwindcss";

.settings-panel-backdrop {
  @apply fixed inset-0 z-[120] flex justify-end;
  background: rgba(0, 0, 0, 0.48);
  backdrop-filter: blur(10px);
}

.settings-panel {
  @apply h-full w-full max-w-md border-l px-5 py-5;
  border-color: var(--border-subtle);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 97%, transparent), var(--surface-base));
  box-shadow: -28px 0 60px rgba(0, 0, 0, 0.28);
}

.settings-panel-header {
  @apply flex items-start justify-between gap-4 pb-5;
  border-bottom: 1px solid var(--border-subtle);
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
  @apply inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-200;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-muted);
}

.settings-panel-close:hover {
  background: var(--surface-hover);
  color: var(--text-default);
}

.settings-panel-close-icon {
  @apply h-4 w-4;
}

.settings-panel-body {
  @apply flex flex-col gap-6 pt-5;
}
</style>

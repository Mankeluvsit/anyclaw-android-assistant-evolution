<template>
  <ToggleGroupRoot
    class="theme-switcher"
    type="single"
    :model-value="modelValue"
    :aria-label="t('theme_label')"
    @update:model-value="onThemeChange"
  >
    <ToggleGroupItem
      v-for="option in options"
      :key="option.value"
      class="theme-switcher-button"
      :value="option.value"
    >
      {{ option.label }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'radix-vue'
import { useUiI18n } from '../../composables/useUiI18n'
import type { ThemePreference } from '../../composables/useUiTheme'

const { t } = useUiI18n()

defineProps<{
  modelValue: ThemePreference
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ThemePreference]
}>()

const options = computed<Array<{ value: ThemePreference; label: string }>>(() => [
  { value: 'system', label: t('theme_system') },
  { value: 'dark', label: t('theme_dark') },
  { value: 'light', label: t('theme_light') },
])

function onThemeChange(value: string | string[] | undefined): void {
  if (Array.isArray(value)) return
  if (value === 'system' || value === 'dark' || value === 'light') {
    emit('update:modelValue', value)
  }
}
</script>

<style scoped>
@reference "tailwindcss";

.theme-switcher {
  @apply inline-flex items-center gap-1 rounded-full border px-1 py-1;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-soft);
}

.theme-switcher-button {
  @apply rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] outline-none transition-colors duration-200;
  color: var(--text-muted);
}

.theme-switcher-button:hover {
  background: var(--surface-hover);
  color: var(--text-default);
}

.theme-switcher-button[data-state='on'] {
  background: var(--accent-primary);
  color: var(--accent-on-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-primary) 45%, transparent);
}
</style>

<template>
  <div class="theme-switcher" role="group" :aria-label="t('theme_label')">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="theme-switcher-button"
      :class="{ 'is-active': modelValue === option.value }"
      :aria-pressed="modelValue === option.value"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiI18n } from '../../composables/useUiI18n'
import type { ThemePreference } from '../../composables/useUiTheme'

const { t } = useUiI18n()

defineProps<{
  modelValue: ThemePreference
}>()

defineEmits<{
  'update:modelValue': [value: ThemePreference]
}>()

const options = computed<Array<{ value: ThemePreference; label: string }>>(() => [
  { value: 'system', label: t('theme_system') },
  { value: 'dark', label: t('theme_dark') },
  { value: 'light', label: t('theme_light') },
])
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
  @apply rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200;
  color: var(--text-muted);
}

.theme-switcher-button:hover {
  background: var(--surface-hover);
  color: var(--text-default);
}

.theme-switcher-button.is-active {
  background: var(--accent-primary);
  color: var(--accent-on-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-primary) 45%, transparent);
}
</style>

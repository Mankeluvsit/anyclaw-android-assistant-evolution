<template>
  <label class="ui-switch-row">
    <span class="ui-switch-copy">
      <span class="ui-switch-label">{{ label }}</span>
      <span v-if="description" class="ui-switch-description">{{ description }}</span>
    </span>
    <SwitchRoot
      class="ui-switch-root"
      :checked="modelValue"
      @update:checked="onChange"
    >
      <SwitchThumb class="ui-switch-thumb" />
    </SwitchRoot>
  </label>
</template>

<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'radix-vue'

defineProps<{
  modelValue: boolean
  label: string
  description?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function onChange(value: boolean): void {
  emit('update:modelValue', value)
}
</script>

<style scoped>
@reference "tailwindcss";

.ui-switch-row {
  @apply grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-2xl border px-4 py-3;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-elevated) 90%, transparent);
}

.ui-switch-copy {
  @apply flex min-w-0 flex-col gap-1;
}

.ui-switch-label {
  @apply break-words text-sm font-semibold;
  color: var(--text-default);
}

.ui-switch-description {
  @apply break-words text-xs leading-5;
  color: var(--text-muted);
}

.ui-switch-root {
  @apply relative h-6 w-11 shrink-0 rounded-full border outline-none transition-colors duration-200;
  border-color: var(--border-subtle);
  background: var(--surface-hover);
}

.ui-switch-root[data-state='checked'] {
  border-color: color-mix(in srgb, var(--accent-success) 36%, var(--border-strong));
  background: color-mix(in srgb, var(--accent-success) 72%, var(--surface-hover));
}

.ui-switch-thumb {
  @apply block h-4.5 w-4.5 translate-x-0.5 rounded-full transition-transform duration-200;
  margin-top: 1px;
  background: #fff;
}

.ui-switch-thumb[data-state='checked'] {
  transform: translateX(20px);
}
</style>

<template>
  <UiSelect
    class="composer-dropdown"
    :model-value="modelValue"
    :options="options"
    :placeholder="placeholder"
    :disabled="disabled"
    :side="openDirection === 'up' ? 'top' : 'bottom'"
    :trigger-class="'composer-dropdown-trigger'"
    :content-class="'composer-dropdown-menu'"
    @update:model-value="onSelect"
  />
</template>

<script setup lang="ts">
import UiSelect from '../ui/UiSelect.vue'

type DropdownOption = {
  value: string
  label: string
}

defineProps<{
  modelValue: string
  options: DropdownOption[]
  placeholder?: string
  disabled?: boolean
  openDirection?: 'up' | 'down'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onSelect(value: string): void {
  emit('update:modelValue', value)
}
</script>

<style scoped>
@reference "tailwindcss";

.composer-dropdown {
  @apply inline-flex min-w-0;
}

.composer-dropdown :deep(.composer-dropdown-trigger) {
  @apply h-7 gap-1 border-0 bg-transparent p-0 text-sm leading-none;
  color: var(--text-muted);
  box-shadow: none;
}

.composer-dropdown :deep(.composer-dropdown-trigger:hover) {
  color: var(--text-default);
}

.composer-dropdown :deep(.composer-dropdown-trigger[data-placeholder]) {
  color: var(--text-muted);
}

.composer-dropdown :deep(.composer-dropdown-menu) {
  @apply min-w-40 rounded-xl;
}
</style>

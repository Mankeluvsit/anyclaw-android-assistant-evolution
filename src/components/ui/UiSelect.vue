<template>
  <SelectRoot :model-value="modelValue" :disabled="disabled" @update:model-value="onSelect">
    <SelectTrigger class="ui-select-trigger" :class="triggerClass">
      <SelectValue class="ui-select-value" :placeholder="placeholder" />
      <SelectIcon class="ui-select-icon">
        <IconTablerChevronDown class="ui-select-chevron" />
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        class="ui-select-content"
        :class="contentClass"
        :position="position"
        :side="side"
        :side-offset="sideOffset"
      >
        <SelectViewport class="ui-select-viewport">
          <SelectItem
            v-for="option in options"
            :key="option.value"
            class="ui-select-item"
            :value="option.value"
          >
            <SelectItemText>{{ option.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<script setup lang="ts">
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'radix-vue'
import IconTablerChevronDown from '../icons/IconTablerChevronDown.vue'

type SelectOption = {
  value: string
  label: string
}

withDefaults(
  defineProps<{
    modelValue: string
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    side?: 'top' | 'right' | 'bottom' | 'left'
    sideOffset?: number
    position?: 'item-aligned' | 'popper'
    triggerClass?: string
    contentClass?: string
  }>(),
  {
    placeholder: '',
    disabled: false,
    side: 'bottom',
    sideOffset: 8,
    position: 'popper',
    triggerClass: '',
    contentClass: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onSelect(value: string): void {
  emit('update:modelValue', value)
}
</script>

<style scoped>
@reference "tailwindcss";

.ui-select-trigger {
  @apply inline-flex min-w-0 items-center gap-1 rounded-xl border px-3 py-2 text-left outline-none transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-default);
  box-shadow: var(--shadow-soft);
}

.ui-select-trigger:focus-visible {
  box-shadow:
    var(--shadow-soft),
    0 0 0 2px color-mix(in srgb, var(--accent-primary) 28%, transparent);
}

.ui-select-value {
  @apply truncate;
}

.ui-select-icon {
  @apply shrink-0;
  color: var(--text-muted);
}

.ui-select-chevron {
  @apply h-3.5 w-3.5;
}

.ui-select-content {
  @apply z-[140] min-w-40 overflow-hidden rounded-2xl border p-1;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.32);
}

.ui-select-viewport {
  @apply flex flex-col gap-1;
}

.ui-select-item {
  @apply rounded-xl px-3 py-2 text-sm outline-none transition-colors duration-150;
  color: var(--text-default);
}

.ui-select-item[data-highlighted] {
  background: var(--surface-hover);
}

.ui-select-item[data-state='checked'] {
  background: color-mix(in srgb, var(--accent-primary) 14%, var(--surface-elevated));
  color: var(--text-default);
}
</style>

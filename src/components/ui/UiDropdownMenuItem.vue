<template>
  <DropdownMenuItem class="ui-dropdown-menu-item" :disabled="disabled">
    <slot />
  </DropdownMenuItem>
</template>

<script setup lang="ts">
import { DropdownMenuItem } from 'radix-vue'

withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)
</script>

<style scoped>
@reference "tailwindcss";

.ui-dropdown-menu-item {
  @apply flex cursor-default items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors duration-150;
  color: var(--text-default);
}

.ui-dropdown-menu-item[data-highlighted] {
  background: var(--surface-hover);
}

.ui-dropdown-menu-item[data-disabled] {
  @apply opacity-50;
}
</style>

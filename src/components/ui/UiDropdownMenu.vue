<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="ui-dropdown-menu-content" :side-offset="8" :align="align">
        <slot />
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'radix-vue'

withDefaults(
  defineProps<{
    align?: 'start' | 'center' | 'end'
  }>(),
  {
    align: 'end',
  },
)
</script>

<style scoped>
@reference "tailwindcss";

.ui-dropdown-menu-content {
  @apply z-[170] min-w-44 rounded-xl border p-1;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
}
</style>

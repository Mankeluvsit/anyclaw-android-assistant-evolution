<template>
  <TooltipProvider :delay-duration="120">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent class="ui-tooltip-content" :side-offset="8">
          {{ content }}
          <TooltipArrow class="ui-tooltip-arrow" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<script setup lang="ts">
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'radix-vue'

defineProps<{
  content: string
}>()
</script>

<style scoped>
@reference "tailwindcss";

.ui-tooltip-content {
  @apply z-[160] rounded-lg border px-2.5 py-1.5 text-xs font-medium;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-default);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.28);
}

.ui-tooltip-arrow {
  fill: var(--surface-elevated);
}
</style>

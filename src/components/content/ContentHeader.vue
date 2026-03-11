<template>
  <header class="content-header">
    <div class="content-leading">
      <slot name="leading" />
    </div>
    <h1 class="content-title">{{ title }}</h1>
    <div class="content-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<style scoped>
@reference "tailwindcss";

.content-header {
  @apply relative z-10 w-full min-h-14 flex items-center gap-3 px-3 pt-4 pb-2;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 94%, transparent), transparent);
  border-bottom: 1px solid var(--border-subtle);
}

.content-title {
  @apply m-0 min-w-0 flex-1 truncate text-sm font-semibold leading-6 tracking-[0.01em];
  color: var(--text-default);
  font-family: var(--font-display);
}

.content-actions {
  @apply flex items-center justify-end gap-1;
}

.content-leading {
  @apply flex items-center gap-1;
}
</style>

<template>
  <button
    :type="type"
    class="ui-button"
    :class="[`ui-button--${variant}`, `ui-button--${size}`]"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: 'solid' | 'surface' | 'ghost'
    size?: 'sm' | 'md' | 'icon'
  }>(),
  {
    type: 'button',
    variant: 'surface',
    size: 'md',
  },
)
</script>

<style scoped>
@reference "tailwindcss";

.ui-button {
  @apply inline-flex items-center justify-center gap-2 border font-semibold tracking-[-0.01em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60;
  border-color: var(--border-subtle);
  outline: none;
}

.ui-button:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 28%, transparent);
}

.ui-button--sm {
  @apply h-8 rounded-lg px-3 text-xs;
}

.ui-button--md {
  @apply h-10 rounded-xl px-4 text-sm;
}

.ui-button--icon {
  @apply h-10 w-10 rounded-full px-0;
}

.ui-button--surface {
  background: var(--surface-elevated);
  color: var(--text-muted);
  box-shadow: var(--shadow-soft);
}

.ui-button--surface:hover {
  background: var(--surface-hover);
  color: var(--text-default);
}

.ui-button--ghost {
  background: transparent;
  color: var(--text-muted);
}

.ui-button--ghost:hover {
  background: color-mix(in srgb, var(--surface-hover) 88%, transparent);
  color: var(--text-default);
}

.ui-button--solid {
  border-color: color-mix(in srgb, var(--accent-primary) 45%, var(--border-strong));
  background: var(--accent-primary);
  color: var(--accent-on-primary);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--accent-primary) 24%, transparent);
}

.ui-button--solid:hover {
  background: color-mix(in srgb, var(--accent-primary) 88%, #ffffff 12%);
}
</style>

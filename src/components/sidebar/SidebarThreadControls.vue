<template>
  <div class="sidebar-thread-controls">
    <button
      class="sidebar-thread-controls-button"
      type="button"
      :aria-label="isSidebarCollapsed ? t('sidebar_expand') : t('sidebar_collapse')"
      :title="isSidebarCollapsed ? t('sidebar_expand') : t('sidebar_collapse')"
      @click="$emit('toggle-sidebar')"
    >
      <IconTablerLayoutSidebarFilled v-if="isSidebarCollapsed" class="sidebar-thread-controls-icon" />
      <IconTablerLayoutSidebar v-else class="sidebar-thread-controls-icon" />
    </button>

    <button
      v-if="showAutoRefreshButton !== false"
      class="sidebar-thread-controls-button"
      type="button"
      :aria-pressed="isAutoRefreshEnabled"
      :aria-label="autoRefreshButtonLabel"
      :title="autoRefreshButtonLabel"
      @click="$emit('toggle-auto-refresh')"
    >
      <IconTablerRefresh class="sidebar-thread-controls-icon" />
    </button>

    <slot />

    <button
      v-if="showNewThreadButton"
      class="sidebar-thread-controls-button"
      type="button"
      :aria-label="t('sidebar_start_new_thread')"
      :title="t('sidebar_start_new_thread')"
      @click="$emit('start-new-thread')"
    >
      <IconTablerFilePencil class="sidebar-thread-controls-icon" />
    </button>
  </div>
</template>

<script setup lang="ts">
import IconTablerFilePencil from '../icons/IconTablerFilePencil.vue'
import IconTablerLayoutSidebar from '../icons/IconTablerLayoutSidebar.vue'
import IconTablerLayoutSidebarFilled from '../icons/IconTablerLayoutSidebarFilled.vue'
import IconTablerRefresh from '../icons/IconTablerRefresh.vue'
import { useUiI18n } from '../../composables/useUiI18n'

const { t } = useUiI18n()

defineProps<{
  isSidebarCollapsed: boolean
  isAutoRefreshEnabled: boolean
  autoRefreshButtonLabel: string
  showAutoRefreshButton?: boolean
  showNewThreadButton?: boolean
}>()

defineEmits<{
  'toggle-sidebar': []
  'toggle-auto-refresh': []
  'start-new-thread': []
}>()
</script>

<style scoped>
@reference "tailwindcss";

.sidebar-thread-controls {
  @apply flex flex-row flex-nowrap items-center gap-2;
}

.sidebar-thread-controls-button {
  @apply h-6.75 w-6.75 rounded-md border flex items-center justify-center transition-colors duration-200;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-muted);
  box-shadow: var(--shadow-soft);
}

.sidebar-thread-controls-button:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
  color: var(--text-default);
}

.sidebar-thread-controls-button[aria-pressed='true'] {
  border-color: color-mix(in srgb, var(--accent-success) 40%, var(--border-strong));
  background: color-mix(in srgb, var(--accent-success) 16%, var(--surface-elevated));
  color: var(--accent-success);
}

.sidebar-thread-controls-button[aria-pressed='false'] {
  color: var(--text-muted);
}

.sidebar-thread-controls-icon {
  @apply w-4 h-4;
}
</style>

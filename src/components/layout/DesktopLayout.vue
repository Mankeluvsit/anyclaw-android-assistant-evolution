<template>
  <div class="desktop-layout" :style="layoutStyle">
    <button
      v-if="!isSidebarCollapsed && isCompactViewport"
      class="desktop-mobile-backdrop"
      type="button"
      aria-label="Close sidebar"
      @click="$emit('collapse-sidebar')"
    />
    <aside
      v-if="!isSidebarCollapsed"
      class="desktop-sidebar"
      :class="{ 'desktop-sidebar-compact': isCompactViewport }"
    >
      <slot name="sidebar" />
    </aside>
    <button
      v-if="!isSidebarCollapsed && !isCompactViewport"
      class="desktop-resize-handle"
      type="button"
      aria-label="Resize sidebar"
      @mousedown="onResizeHandleMouseDown"
    />
    <section class="desktop-main">
      <slot name="content" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    isSidebarCollapsed?: boolean
    isCompactViewport?: boolean
  }>(),
  {
    isSidebarCollapsed: false,
    isCompactViewport: false,
  },
)

defineEmits<{
  'collapse-sidebar': []
}>()

const SIDEBAR_WIDTH_KEY = 'codex-web-local.sidebar-width.v1'
const MIN_SIDEBAR_WIDTH = 260
const MAX_SIDEBAR_WIDTH = 620
const DEFAULT_SIDEBAR_WIDTH = 320

function clampSidebarWidth(value: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value))
}

function loadSidebarWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH

  const raw = window.localStorage.getItem(SIDEBAR_WIDTH_KEY)
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return DEFAULT_SIDEBAR_WIDTH
  return clampSidebarWidth(parsed)
}

const sidebarWidth = ref(loadSidebarWidth())
const layoutStyle = computed(() => {
  if (props.isSidebarCollapsed) {
    return {
      '--sidebar-width': '0px',
      '--layout-columns': 'minmax(0, 1fr)',
    }
  }
  return {
    '--sidebar-width': `${sidebarWidth.value}px`,
    '--layout-columns': 'var(--sidebar-width) 1px minmax(0, 1fr)',
  }
})

function saveSidebarWidth(value: number): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(value))
}

function onResizeHandleMouseDown(event: MouseEvent): void {
  event.preventDefault()

  const startX = event.clientX
  const startWidth = sidebarWidth.value

  const onMouseMove = (moveEvent: MouseEvent) => {
    const delta = moveEvent.clientX - startX
    sidebarWidth.value = clampSidebarWidth(startWidth + delta)
  }

  const onMouseUp = () => {
    saveSidebarWidth(sidebarWidth.value)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}
</script>

<style scoped>
@reference "tailwindcss";

.desktop-layout {
  @apply h-screen grid overflow-hidden;
  grid-template-columns: var(--layout-columns);
  background: var(--app-background);
  color: var(--text-default);
}

.desktop-sidebar {
  @apply min-h-0 overflow-y-auto;
  background: var(--surface-base);
  border-right: 1px solid var(--border-subtle);
}

.desktop-sidebar-compact {
  @apply fixed inset-y-0 left-0 z-[80] w-[min(92vw,24rem)] max-w-[24rem] overflow-y-auto border-r overscroll-contain;
  padding-top: max(0.75rem, env(safe-area-inset-top));
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  box-shadow: 24px 0 60px rgba(0, 0, 0, 0.32);
}

.desktop-mobile-backdrop {
  @apply fixed inset-0 z-[70] border-0;
  background: rgba(0, 0, 0, 0.56);
  backdrop-filter: blur(6px);
}

.desktop-resize-handle {
  @apply relative w-px cursor-col-resize transition-colors duration-200;
  background: var(--border-subtle);
}

.desktop-resize-handle:hover {
  background: var(--accent-primary);
}

.desktop-resize-handle::before {
  content: '';
  @apply absolute -left-2 -right-2 top-0 bottom-0;
}

.desktop-main {
  @apply min-h-0 overflow-y-hidden overflow-x-visible;
  background: var(--surface-base);
}

@media (max-width: 960px) {
  .desktop-layout {
    @apply block h-[100dvh];
  }

  .desktop-main {
    @apply h-[100dvh];
  }
}
</style>

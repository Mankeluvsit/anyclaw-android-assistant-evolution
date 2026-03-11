import { computed, watch } from 'vue'
import { usePreferredDark, useStorage } from '@vueuse/core'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'codex-web-local.theme.v1'
const themePreference = useStorage<ThemePreference>(STORAGE_KEY, 'system')
const prefersDark = usePreferredDark()

const resolvedTheme = computed<'light' | 'dark'>(() =>
  themePreference.value === 'system' ? (prefersDark.value ? 'dark' : 'light') : themePreference.value,
)

function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}

watch(
  resolvedTheme,
  (theme) => {
    applyTheme(theme)
  },
  { immediate: true },
)

export function useUiTheme() {
  function setThemePreference(value: ThemePreference): void {
    themePreference.value = value
  }

  return {
    themePreference,
    resolvedTheme,
    setThemePreference,
  }
}

import { computed, ref, watch } from 'vue'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'codex-web-local.theme.v1'
const themePreference = ref<ThemePreference>(loadThemePreference())

function loadThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const value = (window.localStorage.getItem(STORAGE_KEY) ?? '').trim()
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

function resolveSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const resolvedTheme = computed<'light' | 'dark'>(() =>
  themePreference.value === 'system' ? resolveSystemTheme() : themePreference.value,
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

watch(themePreference, (value) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, value)
})

if (typeof window !== 'undefined') {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => applyTheme(resolvedTheme.value)
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onChange)
  } else if (typeof media.addListener === 'function') {
    media.addListener(onChange)
  }
}

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

import { ref, watch } from 'vue'

type UiSettings = {
  pressEnterToSend: boolean
}

const STORAGE_KEY = 'codex-web-local.ui-settings.v1'

function normalizeSettings(value: unknown): UiSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { pressEnterToSend: true }
  }

  const record = value as Record<string, unknown>
  return {
    pressEnterToSend: record.pressEnterToSend !== false,
  }
}

function loadSettings(): UiSettings {
  if (typeof window === 'undefined') {
    return { pressEnterToSend: true }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { pressEnterToSend: true }
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return { pressEnterToSend: true }
  }
}

function saveSettings(value: UiSettings): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

const settings = ref<UiSettings>(loadSettings())

if (typeof window !== 'undefined') {
  watch(
    settings,
    (value) => {
      saveSettings(value)
    },
    { deep: true },
  )
}

export function useUiSettings() {
  function setPressEnterToSend(value: boolean): void {
    settings.value = {
      ...settings.value,
      pressEnterToSend: value,
    }
  }

  return {
    settings,
    setPressEnterToSend,
  }
}

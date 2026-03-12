import { ref } from 'vue'
import type { ReasoningEffort } from '../types/codex'

export type ProjectPreference = {
  instructions: string
  defaultModel: string
  defaultReasoning: ReasoningEffort | ''
}

const STORAGE_KEY = 'codex-web-local.project-preferences.v1'

function normalizePreference(value: unknown): ProjectPreference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      instructions: '',
      defaultModel: '',
      defaultReasoning: '',
    }
  }

  const record = value as Record<string, unknown>
  const rawReasoning = typeof record.defaultReasoning === 'string' ? record.defaultReasoning : ''
  const allowed: Array<ReasoningEffort | ''> = ['', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh']

  return {
    instructions: typeof record.instructions === 'string' ? record.instructions : '',
    defaultModel: typeof record.defaultModel === 'string' ? record.defaultModel : '',
    defaultReasoning: allowed.includes(rawReasoning as ReasoningEffort | '') ? (rawReasoning as ReasoningEffort | '') : '',
  }
}

function loadPreferences(): Record<string, ProjectPreference> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const next: Record<string, ProjectPreference> = {}
    for (const [projectName, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!projectName.trim()) continue
      next[projectName] = normalizePreference(value)
    }
    return next
  } catch {
    return {}
  }
}

function savePreferences(value: Record<string, ProjectPreference>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

const preferences = ref<Record<string, ProjectPreference>>(loadPreferences())

export function useProjectPreferences() {
  function setProjectPreference(projectName: string, nextValue: Partial<ProjectPreference>): void {
    const normalizedProjectName = projectName.trim()
    if (!normalizedProjectName) return

    preferences.value = {
      ...preferences.value,
      [normalizedProjectName]: {
        ...normalizePreference(preferences.value[normalizedProjectName]),
        ...nextValue,
      },
    }
    savePreferences(preferences.value)
  }

  function getProjectPreference(projectName: string): ProjectPreference {
    return normalizePreference(preferences.value[projectName])
  }

  return {
    preferences,
    getProjectPreference,
    setProjectPreference,
  }
}

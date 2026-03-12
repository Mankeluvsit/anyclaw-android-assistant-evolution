import { ref } from 'vue'
import type { ReasoningEffort } from '../types/codex'

export type SavedView = {
  id: string
  name: string
  sidebarQuery: string
  threadQuery: string
  projectName: string
  cwd: string
  modelId: string
  reasoning: ReasoningEffort | ''
}

const STORAGE_KEY = 'codex-web-local.saved-views.v1'

function normalizeSavedView(value: unknown): SavedView | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const reasoning = typeof record.reasoning === 'string' ? record.reasoning : ''
  const allowed: Array<ReasoningEffort | ''> = ['', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh']
  const id = typeof record.id === 'string' ? record.id.trim() : ''
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  if (!id || !name) return null

  return {
    id,
    name,
    sidebarQuery: typeof record.sidebarQuery === 'string' ? record.sidebarQuery : '',
    threadQuery: typeof record.threadQuery === 'string' ? record.threadQuery : '',
    projectName: typeof record.projectName === 'string' ? record.projectName : '',
    cwd: typeof record.cwd === 'string' ? record.cwd : '',
    modelId: typeof record.modelId === 'string' ? record.modelId : '',
    reasoning: allowed.includes(reasoning as ReasoningEffort | '') ? (reasoning as ReasoningEffort | '') : '',
  }
}

function loadSavedViews(): SavedView[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => normalizeSavedView(item))
      .filter((item): item is SavedView => item !== null)
  } catch {
    return []
  }
}

function saveSavedViews(value: SavedView[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

const savedViews = ref<SavedView[]>(loadSavedViews())

export function useSavedViews() {
  function addSavedView(payload: Omit<SavedView, 'id'>): void {
    const normalizedName = payload.name.trim()
    if (!normalizedName) return

    const nextView: SavedView = {
      ...payload,
      name: normalizedName,
      id: `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    }

    savedViews.value = [nextView, ...savedViews.value]
    saveSavedViews(savedViews.value)
  }

  function removeSavedView(id: string): void {
    savedViews.value = savedViews.value.filter((view) => view.id !== id)
    saveSavedViews(savedViews.value)
  }

  return {
    savedViews,
    addSavedView,
    removeSavedView,
  }
}

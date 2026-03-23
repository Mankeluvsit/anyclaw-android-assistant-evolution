import type {
  ClawHubSkillDetail,
  ClawHubSkillSearchResult,
  ClawHubSkillVersion,
} from '../types/skillsHub'

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `HTTP ${response.status}`
    throw new Error(message)
  }
  return payload
}

export async function searchClawHubSkills(query: string, limit = 18): Promise<ClawHubSkillSearchResult[]> {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  })
  const response = await fetch(`/codex-api/skills-hub/search?${params.toString()}`)
  const payload = await readJson<{ results?: ClawHubSkillSearchResult[] }>(response)
  return Array.isArray(payload.results) ? payload.results : []
}

export async function getClawHubSkillDetail(slug: string): Promise<ClawHubSkillDetail> {
  const params = new URLSearchParams({ slug: slug.trim() })
  const response = await fetch(`/codex-api/skills-hub/skill?${params.toString()}`)
  return readJson<ClawHubSkillDetail>(response)
}

export async function getClawHubSkillVersions(slug: string, limit = 6): Promise<ClawHubSkillVersion[]> {
  const params = new URLSearchParams({
    slug: slug.trim(),
    limit: String(limit),
  })
  const response = await fetch(`/codex-api/skills-hub/versions?${params.toString()}`)
  const payload = await readJson<{ items?: ClawHubSkillVersion[] }>(response)
  return Array.isArray(payload.items) ? payload.items : []
}

export async function getClawHubDownloadUrl(
  slug: string,
  options: { version?: string; tag?: string } = {},
): Promise<string> {
  const params = new URLSearchParams({ slug: slug.trim() })
  if (options.version) {
    params.set('version', options.version)
  } else {
    params.set('tag', options.tag ?? 'latest')
  }
  const response = await fetch(`/codex-api/skills-hub/download-url?${params.toString()}`)
  const payload = await readJson<{ url?: string }>(response)
  if (!payload.url) {
    throw new Error('Download URL unavailable')
  }
  return payload.url
}

import type {
  ClawHubSkillDetail,
  ClawHubSkillSearchResult,
  ClawHubSkillVersionDetail,
  ClawHubSkillVersion,
  InstalledSkill,
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

export async function getClawHubSkillVersionDetail(slug: string, version: string): Promise<ClawHubSkillVersionDetail> {
  const params = new URLSearchParams({
    slug: slug.trim(),
    version: version.trim(),
  })
  const response = await fetch(`/codex-api/skills-hub/version-detail?${params.toString()}`)
  return readJson<ClawHubSkillVersionDetail>(response)
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

export async function getInstalledSkills(): Promise<InstalledSkill[]> {
  const response = await fetch('/codex-api/skills-hub/installed')
  const payload = await readJson<{ data?: InstalledSkill[] }>(response)
  return Array.isArray(payload.data) ? payload.data : []
}

export async function installClawHubSkill(
  slug: string,
  options: { version?: string } = {},
): Promise<{ name: string; path: string }> {
  const response = await fetch('/codex-api/skills-hub/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      version: options.version,
    }),
  })
  return readJson<{ name: string; path: string }>(response)
}

export async function uninstallSkill(path: string): Promise<void> {
  const response = await fetch('/codex-api/skills-hub/uninstall', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  await readJson<{ ok: boolean }>(response)
}

export async function setInstalledSkillEnabled(path: string, enabled: boolean): Promise<void> {
  const response = await fetch('/codex-api/skills-hub/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, enabled }),
  })
  await readJson<{ ok: boolean }>(response)
}

export type ClawHubSkillSearchResult = {
  score: number
  slug: string
  displayName: string
  summary: string | null
  version: string | null
  updatedAt: number
}

export type ClawHubSkillStats = {
  comments: number
  downloads: number
  installsAllTime: number
  installsCurrent: number
  stars: number
  versions: number
}

export type ClawHubSkillOwner = {
  handle: string
  userId: string
  displayName: string
  image: string
}

export type ClawHubSkillVersion = {
  version: string
  createdAt: number
  changelog: string
  changelogSource?: string
  license?: string | null
}

export type ClawHubSkillVersionFile = {
  path: string
  size: number
  sha256: string
  contentType?: string
}

export type ClawHubSkillVersionDetail = {
  version: string
  createdAt: number
  changelog: string
  changelogSource?: string
  files: ClawHubSkillVersionFile[]
}

export type ClawHubSkillDetail = {
  skill: {
    slug: string
    displayName: string
    summary: string | null
    tags: Record<string, string>
    stats: ClawHubSkillStats
    createdAt: number
    updatedAt: number
  }
  latestVersion: ClawHubSkillVersion | null
  metadata: Record<string, unknown> | null
  owner: ClawHubSkillOwner | null
  moderation: Record<string, unknown> | null
}

export type InstalledSkill = {
  name: string
  description: string
  shortDescription: string
  path: string
  scope: 'user' | 'repo' | 'system' | 'admin'
  enabled: boolean
}

export type GitHubHubSkill = {
  name: string
  owner: string
  description: string
  displayName: string
  publishedAt: number
  avatarUrl: string
  url: string
  installed: boolean
}

export type GitHubSkillsSyncStatus = {
  loggedIn: boolean
  githubUsername: string
  repoOwner: string
  repoName: string
  configured: boolean
  startup: {
    inProgress: boolean
    mode: string
    branch: string
    lastAction: string
    lastRunAtIso: string
    lastSuccessAtIso: string
    lastError: string
  }
}

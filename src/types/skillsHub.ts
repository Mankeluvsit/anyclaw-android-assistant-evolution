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

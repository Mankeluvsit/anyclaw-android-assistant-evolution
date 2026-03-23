import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join, dirname, basename, normalize } from 'node:path'

const prefixBin = process.env.PREFIX ? join(process.env.PREFIX, 'bin') : ''
const shellPath = prefixBin ? join(prefixBin, 'sh') : '/bin/sh'
const homeDir = process.env.HOME ?? ''
const promptInjectionPath = homeDir ? join(homeDir, '.openclaw-android', 'state', 'prompt-injection.json') : ''
const shizukuStatusPath = homeDir ? join(homeDir, '.openclaw-android', 'capabilities', 'shizuku.json') : ''
const openClawStateDir = homeDir ? join(homeDir, '.openclaw-android', 'state') : ''
const clawHubBaseUrl = (process.env.CLAWHUB_BASE_URL?.trim() || 'https://clawhub.ai').replace(/\/+$/u, '')
const GITHUB_DEVICE_CLIENT_ID = 'Iv1.b507a08c87ecfe98'
const GITHUB_HUB_OWNER = 'openclaw'
const GITHUB_HUB_REPO = 'skills'
const DEFAULT_WORKSPACES_DIR = homeDir ? join(homeDir, 'workspaces') : join(tmpdir(), 'workspaces')

type JsonRpcCall = {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: unknown
}

type JsonRpcResponse = {
  id?: number
  result?: unknown
  error?: {
    code: number
    message: string
  }
  method?: string
  params?: unknown
}

type RpcProxyRequest = {
  method: string
  params?: unknown
}

type ServerRequestReply = {
  result?: unknown
  error?: {
    code: number
    message: string
  }
}

type PendingServerRequest = {
  id: number
  method: string
  params: unknown
  receivedAtIso: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload instanceof Error && payload.message.trim().length > 0) {
    return payload.message
  }

  const record = asRecord(payload)
  if (!record) return fallback

  const error = record.error
  if (typeof error === 'string' && error.length > 0) return error

  const nestedError = asRecord(error)
  if (nestedError && typeof nestedError.message === 'string' && nestedError.message.length > 0) {
    return nestedError.message
  }

  return fallback
}

function setJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = []

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (chunks.length === 0) return null

  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (raw.length === 0) return null

  return JSON.parse(raw) as unknown
}

async function readJsonFile(path: string): Promise<Record<string, unknown> | null> {
  if (!path) return null
  try {
    const raw = await readFile(path, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    return asRecord(parsed)
  } catch {
    return null
  }
}

async function readTextTail(path: string, maxLines = 60): Promise<string> {
  if (!path) return ''
  try {
    const raw = await readFile(path, 'utf8')
    const lines = raw.split('\n')
    return lines.slice(Math.max(0, lines.length - maxLines)).join('\n').trim()
  } catch {
    return ''
  }
}

async function probeLoopbackHttp(port: number, path = '/'): Promise<{ ok: boolean; status: number; detail: string }> {
  const targetUrl = `http://127.0.0.1:${String(port)}${path}`
  try {
    const response = await fetch(targetUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(2500),
    })
    return {
      ok: response.ok,
      status: response.status,
      detail: response.ok ? 'reachable' : `HTTP ${String(response.status)}`,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: getErrorMessage(error, 'Connection refused'),
    }
  }
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isSafeRelativePath(filePath: string): boolean {
  const normalizedPath = normalize(filePath)
  if (normalizedPath.startsWith('..')) return false
  if (normalizedPath.includes('../')) return false
  return !normalizedPath.startsWith('/')
}

function normalizePositiveInteger(value: string, fallback: number, max: number): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(max, parsed)
}

function sanitizeWorkspaceName(value: string): string {
  return value.trim().replace(/[\\/]+/gu, '-').replace(/\s+/gu, '-').replace(/[^a-zA-Z0-9._-]+/gu, '-').replace(/^-+|-+$/gu, '')
}

async function ensureDefaultWorkspaceRoot(): Promise<string> {
  await mkdir(DEFAULT_WORKSPACES_DIR, { recursive: true })
  return DEFAULT_WORKSPACES_DIR
}

async function createWorkspaceDirectory(name: string): Promise<{ name: string; cwd: string }> {
  const normalizedName = sanitizeWorkspaceName(name)
  if (!normalizedName) {
    throw new Error('Workspace name is required')
  }

  const root = await ensureDefaultWorkspaceRoot()
  const target = join(root, normalizedName)
  await mkdir(target, { recursive: false })
  return {
    name: normalizedName,
    cwd: target,
  }
}

async function fetchClawHubJson(path: string, params: URLSearchParams): Promise<unknown> {
  const target = new URL(`${clawHubBaseUrl}${path}`)
  target.search = params.toString()

  const response = await fetch(target, {
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AnyClaw-Debug/1.0',
    },
  })

  if (!response.ok) {
    const fallback = `ClawHub request failed with HTTP ${String(response.status)}`
    let detail = ''
    try {
      detail = (await response.text()).trim()
    } catch {
      detail = ''
    }
    throw new Error(detail || fallback)
  }

  return response.json()
}

async function fetchClawHubText(path: string, params: URLSearchParams): Promise<string> {
  const target = new URL(`${clawHubBaseUrl}${path}`)
  target.search = params.toString()

  const response = await fetch(target, {
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
    headers: {
      Accept: '*/*',
      'User-Agent': 'AnyClaw-Debug/1.0',
    },
  })

  if (!response.ok) {
    const fallback = `ClawHub request failed with HTTP ${String(response.status)}`
    let detail = ''
    try {
      detail = (await response.text()).trim()
    } catch {
      detail = ''
    }
    throw new Error(detail || fallback)
  }

  return response.text()
}

async function fetchGitHubJson(path: string): Promise<unknown> {
  const target = new URL(`https://api.github.com${path}`)
  const response = await fetch(target, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'AnyClaw-Debug/1.0',
    },
  })

  if (!response.ok) {
    let detail = ''
    try {
      detail = (await response.text()).trim()
    } catch {
      detail = ''
    }
    throw new Error(detail || `GitHub request failed with HTTP ${String(response.status)}`)
  }

  return response.json()
}

async function runCommand(command: string, args: string[], cwd?: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(stderr.trim() || `${command} exited with code ${String(code ?? -1)}`))
    })
  })
}

function parseGitHubSkillReference(reference: string): { owner: string; repo: string; path: string } {
  const raw = normalizeText(reference)
  if (!raw) {
    throw new Error('Missing GitHub reference')
  }

  const normalized = raw
    .replace(/^https?:\/\/github\.com\//u, '')
    .replace(/^github\.com\//u, '')
    .replace(/\/+$/u, '')

  const parts = normalized.split('/').filter(Boolean)
  if (parts.length < 2) {
    throw new Error('GitHub reference must include owner and repo')
  }

  const owner = parts[0] ?? ''
  const repo = parts[1] ?? ''
  if (!owner || !repo) {
    throw new Error('GitHub reference must include owner and repo')
  }

  let path = ''
  if (parts[2] === 'tree' || parts[2] === 'blob') {
    path = parts.slice(4).join('/')
  } else {
    path = parts.slice(2).join('/')
  }

  return {
    owner,
    repo: repo.replace(/\.git$/u, ''),
    path,
  }
}

function sanitizeSkillDirectoryName(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/gu, '-').replace(/^-+|-+$/gu, '')
  return normalized || 'github-skill'
}

async function findSkillRoot(rootDir: string): Promise<string | null> {
  try {
    await readFile(join(rootDir, 'SKILL.md'), 'utf8')
    return rootDir
  } catch {
    // continue
  }

  const entries = await readdir(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const childPath = join(rootDir, entry.name)
    try {
      await readFile(join(childPath, 'SKILL.md'), 'utf8')
      return childPath
    } catch {
      // continue
    }
  }

  return null
}

type SkillsListPayload = {
  data?: Array<{
    cwd?: string
    skills?: Array<{
      name?: string
      description?: string
      shortDescription?: string
      path?: string
      scope?: 'user' | 'repo' | 'system' | 'admin'
      enabled?: boolean
    }>
  }>
}

async function readInstalledSkills(appServer: AppServerProcess, forceReload = false) {
  const payload = (await appServer.rpc('skills/list', { forceReload })) as SkillsListPayload
  const installed = new Map<string, {
    name: string
    description: string
    shortDescription: string
    path: string
    scope: 'user' | 'repo' | 'system' | 'admin'
    enabled: boolean
  }>()

  for (const row of payload.data ?? []) {
    for (const skill of row.skills ?? []) {
      const path = normalizeText(skill.path)
      const name = normalizeText(skill.name)
      if (!path || !name) continue
      if (installed.has(path)) continue
      installed.set(path, {
        name,
        description: normalizeText(skill.description),
        shortDescription: normalizeText(skill.shortDescription),
        path,
        scope: skill.scope ?? 'user',
        enabled: skill.enabled !== false,
      })
    }
  }

  return Array.from(installed.values()).sort((left, right) => left.name.localeCompare(right.name))
}

function getCodexHomeDir(): string {
  return homeDir ? join(homeDir, '.codex') : join(tmpdir(), '.codex')
}

function getUserSkillsDir(): string {
  return join(getCodexHomeDir(), 'skills')
}

function getSkillsSyncStatePath(): string {
  return join(getCodexHomeDir(), 'skills-sync.json')
}

type SkillsSyncState = {
  githubToken?: string
  githubUsername?: string
  repoOwner?: string
  repoName?: string
}

type GitHubHubSkill = {
  name: string
  owner: string
  description: string
  displayName: string
  publishedAt: number
  avatarUrl: string
  url: string
  installed: boolean
}

type GithubDeviceCodeResponse = {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

type GithubTokenResponse = {
  access_token?: string
  error?: string
}

const githubHubCache = {
  fetchedAt: 0,
  items: [] as GitHubHubSkill[],
}

async function readSkillsSyncState(): Promise<SkillsSyncState> {
  const parsed = await readJsonFile(getSkillsSyncStatePath())
  return parsed ? (parsed as SkillsSyncState) : {}
}

async function writeSkillsSyncState(state: SkillsSyncState): Promise<void> {
  await mkdir(dirname(getSkillsSyncStatePath()), { recursive: true })
  await writeFile(getSkillsSyncStatePath(), JSON.stringify(state), 'utf8')
}

async function getGitHubApiJson<T>(url: string, token?: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'AnyClaw-Debug/1.0',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const detail = (await response.text()).trim()
    throw new Error(detail || `GitHub API ${method} failed with HTTP ${String(response.status)}`)
  }

  return response.json() as Promise<T>
}

async function resolveGitHubUsername(token: string): Promise<string> {
  const payload = await getGitHubApiJson<{ login?: string }>('https://api.github.com/user', token)
  const login = normalizeText(payload.login)
  if (!login) {
    throw new Error('GitHub username unavailable')
  }
  return login
}

async function startGitHubDeviceLogin(): Promise<GithubDeviceCodeResponse> {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'AnyClaw-Debug/1.0',
    },
    body: new URLSearchParams({
      client_id: GITHUB_DEVICE_CLIENT_ID,
      scope: 'repo read:user',
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub device login failed with HTTP ${String(response.status)}`)
  }

  return response.json() as Promise<GithubDeviceCodeResponse>
}

async function completeGitHubDeviceLogin(deviceCode: string): Promise<{ token: string | null; error: string | null }> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'AnyClaw-Debug/1.0',
    },
    body: new URLSearchParams({
      client_id: GITHUB_DEVICE_CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed with HTTP ${String(response.status)}`)
  }

  const payload = await response.json() as GithubTokenResponse
  return {
    token: normalizeText(payload.access_token) || null,
    error: normalizeText(payload.error) || null,
  }
}

async function fetchGitHubHubSkills(): Promise<GitHubHubSkill[]> {
  const now = Date.now()
  if (githubHubCache.fetchedAt > 0 && now - githubHubCache.fetchedAt < 5 * 60 * 1000) {
    return githubHubCache.items
  }

  const tree = await fetchGitHubJson(`/repos/${GITHUB_HUB_OWNER}/${GITHUB_HUB_REPO}/git/trees/main?recursive=1`) as {
    tree?: Array<{ path?: string; type?: string }>
  }

  const pattern = /^skills\/([^/]+)\/([^/]+)\/_meta\.json$/u
  const metaEntries = (tree.tree ?? []).flatMap((entry) => {
    const match = pattern.exec(normalizeText(entry.path))
    if (!match) return []
    const owner = match[1] ?? ''
    const name = match[2] ?? ''
    return owner && name ? [{ owner, name }] : []
  })

  const installedNames = new Set<string>()
  try {
    const entries = await readdir(getUserSkillsDir(), { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      try {
        await readFile(join(getUserSkillsDir(), entry.name, 'SKILL.md'), 'utf8')
        installedNames.add(entry.name)
      } catch {
        // ignore invalid entries
      }
    }
  } catch {
    // ignore missing skill dir
  }

  const items = await Promise.all(metaEntries.slice(0, 200).map(async ({ owner, name }) => {
    let meta: Record<string, unknown> | null = null
    try {
      const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_HUB_OWNER}/${GITHUB_HUB_REPO}/main/skills/${owner}/${name}/_meta.json`, {
        headers: { 'User-Agent': 'AnyClaw-Debug/1.0' },
      })
      if (response.ok) {
        meta = asRecord(await response.json())
      }
    } catch {
      meta = null
    }

    const displayName = normalizeText(meta?.displayName) || name
    const description = normalizeText(meta?.description)
    const latest = asRecord(meta?.latest)
    const publishedAt = typeof latest?.publishedAt === 'number' ? latest.publishedAt : 0

    return {
      name,
      owner,
      description,
      displayName,
      publishedAt,
      avatarUrl: `https://github.com/${owner}.png?size=40`,
      url: `https://github.com/${GITHUB_HUB_OWNER}/${GITHUB_HUB_REPO}/tree/main/skills/${owner}/${name}`,
      installed: installedNames.has(name),
    } satisfies GitHubHubSkill
  }))

  githubHubCache.fetchedAt = now
  githubHubCache.items = items.sort((left, right) => (right.publishedAt || 0) - (left.publishedAt || 0))
  return githubHubCache.items
}

async function readGitHubHubSkillDocument(owner: string, name: string): Promise<string> {
  const candidates = [
    `https://raw.githubusercontent.com/${GITHUB_HUB_OWNER}/${GITHUB_HUB_REPO}/main/skills/${owner}/${name}/SKILL.md`,
    `https://raw.githubusercontent.com/${GITHUB_HUB_OWNER}/${GITHUB_HUB_REPO}/main/skills/${owner}/${name}/README.md`,
  ]

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'AnyClaw-Debug/1.0' },
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) continue
      const content = (await response.text()).trim()
      if (content) {
        return content
      }
    } catch {
      // try next candidate
    }
  }

  return ''
}

async function installClawHubSkillToDisk(
  slug: string,
  version: string,
): Promise<{ installDir: string; skillFilePath: string }> {
  const versionPayload = await fetchClawHubJson(
    `/api/v1/skills/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}`,
    new URLSearchParams(),
  ) as { files?: Array<{ path?: string }> }

  const files = Array.isArray(versionPayload.files) ? versionPayload.files : []
  if (files.length === 0) {
    throw new Error('No skill files found for this version')
  }

  const installDir = join(getUserSkillsDir(), slug)
  await rm(installDir, { recursive: true, force: true })
  await mkdir(installDir, { recursive: true })

  for (const file of files) {
    const relativePath = normalizeText(file.path)
    if (!relativePath || !isSafeRelativePath(relativePath)) {
      throw new Error(`Unsafe skill file path: ${relativePath || '<empty>'}`)
    }
    const body = await fetchClawHubText(
      `/api/v1/skills/${encodeURIComponent(slug)}/file`,
      new URLSearchParams({
        path: relativePath,
        version,
      }),
    )
    const destination = join(installDir, relativePath)
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, body, 'utf8')
  }

  const skillFilePath = join(installDir, 'SKILL.md')
  return { installDir, skillFilePath }
}

async function installGitHubSkillToDisk(reference: string): Promise<{ installDir: string; skillFilePath: string }> {
  const parsed = parseGitHubSkillReference(reference)
  const repoMeta = await fetchGitHubJson(`/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`) as {
    default_branch?: string
  }
  const branch = normalizeText(repoMeta.default_branch) || 'main'

  const tempDir = await mkdtemp(join(tmpdir(), 'anyclaw-github-skill-'))
  const archivePath = join(tempDir, 'repo.tar.gz')
  const extractDir = join(tempDir, 'extract')
  await mkdir(extractDir, { recursive: true })

  try {
    const archiveResponse = await fetch(
      `https://codeload.github.com/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/tar.gz/refs/heads/${encodeURIComponent(branch)}`,
      {
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
        headers: {
          Accept: 'application/octet-stream',
          'User-Agent': 'AnyClaw-Debug/1.0',
        },
      },
    )

    if (!archiveResponse.ok) {
      throw new Error(`GitHub archive request failed with HTTP ${String(archiveResponse.status)}`)
    }

    const archiveBytes = Buffer.from(await archiveResponse.arrayBuffer())
    await writeFile(archivePath, archiveBytes)

    const tarCommand = prefixBin ? join(prefixBin, 'tar') : 'tar'
    await runCommand(tarCommand, ['-xzf', archivePath, '-C', extractDir])

    const extractedEntries = await readdir(extractDir, { withFileTypes: true })
    const rootEntry = extractedEntries.find((entry) => entry.isDirectory())
    if (!rootEntry) {
      throw new Error('GitHub archive did not contain an extractable root directory')
    }

    const archiveRoot = join(extractDir, rootEntry.name)
    const candidateRoot = parsed.path ? join(archiveRoot, parsed.path) : archiveRoot
    const skillRoot = await findSkillRoot(candidateRoot)
    if (!skillRoot) {
      throw new Error('No SKILL.md was found in the requested GitHub source')
    }

    const targetName = sanitizeSkillDirectoryName(parsed.path ? basename(parsed.path) : parsed.repo)
    const installDir = join(getUserSkillsDir(), targetName)
    await rm(installDir, { recursive: true, force: true })
    await mkdir(dirname(installDir), { recursive: true })
    await cp(skillRoot, installDir, { recursive: true })

    const skillFilePath = join(installDir, 'SKILL.md')
    await readFile(skillFilePath, 'utf8')
    return { installDir, skillFilePath }
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

function buildCapabilitySummary(statusRecord: Record<string, unknown> | null): string {
  if (!statusRecord) return ''
  const installed = statusRecord.installed === true ? '1' : '0'
  const running = statusRecord.running === true ? '1' : '0'
  const granted = statusRecord.granted === true ? '1' : '0'
  const enabled = statusRecord.enabled === true ? '1' : '0'
  const executor = normalizeText(statusRecord.executor) || 'system-shell'
  const errorCode = normalizeText(statusRecord.last_error_code) || 'none'
  const checkedAt = normalizeText(statusRecord.checked_at) || new Date().toISOString()
  return `Current capability snapshot: installed=${installed} running=${running} granted=${granted} enabled=${enabled} executor=${executor} last_error_code=${errorCode} checked_at=${checkedAt}`
}

function shouldInjectDeveloperInstructions(method: string): boolean {
  return method === 'thread/start' || method === 'thread/resume'
}

function mergeDeveloperInstructions(existing: unknown, injected: string): string {
  const existingText = normalizeText(existing)
  const injectText = normalizeText(injected)
  if (!injectText) return existingText
  if (!existingText) return injectText
  if (existingText.includes(injectText)) return existingText
  return `${existingText}\n\n${injectText}`
}

async function buildInjectedDeveloperInstructions(): Promise<string> {
  const promptRecord = await readJsonFile(promptInjectionPath)
  const statusRecord = await readJsonFile(shizukuStatusPath)

  const chunks: string[] = []
  const promptInstructions = normalizeText(promptRecord?.developer_instructions)
  if (promptInstructions) {
    chunks.push(promptInstructions)
  }

  const selectedName = normalizeText(promptRecord?.active_profile_name)
  if (selectedName) {
    chunks.push(`Selected prompt profile: ${selectedName}`)
  }

  const capabilitySummary = buildCapabilitySummary(statusRecord)
  if (capabilitySummary) {
    chunks.push(capabilitySummary)
  }

  return chunks.join('\n\n').trim()
}

class AppServerProcess {
  private process: ChildProcessWithoutNullStreams | null = null
  private initialized = false
  private readBuffer = ''
  private nextId = 1
  private stopping = false
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>()
  private readonly notificationListeners = new Set<(value: { method: string; params: unknown }) => void>()
  private readonly pendingServerRequests = new Map<number, PendingServerRequest>()

  private start(): void {
    if (this.process) return

    this.stopping = false
    const codexBin = prefixBin ? join(prefixBin, 'codex') : 'codex'
    const proc = spawn(codexBin, ['app-server'], { stdio: ['pipe', 'pipe', 'pipe'] })
    this.process = proc

    proc.stdout.setEncoding('utf8')
    proc.stdout.on('data', (chunk: string) => {
      this.readBuffer += chunk

      let lineEnd = this.readBuffer.indexOf('\n')
      while (lineEnd !== -1) {
        const line = this.readBuffer.slice(0, lineEnd).trim()
        this.readBuffer = this.readBuffer.slice(lineEnd + 1)

        if (line.length > 0) {
          this.handleLine(line)
        }

        lineEnd = this.readBuffer.indexOf('\n')
      }
    })

    proc.stderr.setEncoding('utf8')
    proc.stderr.on('data', () => {
      // Keep stderr silent in dev middleware; JSON-RPC errors are forwarded via responses.
    })

    proc.on('exit', () => {
      const failure = new Error(this.stopping ? 'codex app-server stopped' : 'codex app-server exited unexpectedly')
      for (const request of this.pending.values()) {
        request.reject(failure)
      }

      this.pending.clear()
      this.pendingServerRequests.clear()
      this.process = null
      this.initialized = false
      this.readBuffer = ''
    })
  }

  private sendLine(payload: Record<string, unknown>): void {
    if (!this.process) {
      throw new Error('codex app-server is not running')
    }

    this.process.stdin.write(`${JSON.stringify(payload)}\n`)
  }

  private handleLine(line: string): void {
    let message: JsonRpcResponse
    try {
      message = JSON.parse(line) as JsonRpcResponse
    } catch {
      return
    }

    if (typeof message.id === 'number' && this.pending.has(message.id)) {
      const pendingRequest = this.pending.get(message.id)
      this.pending.delete(message.id)

      if (!pendingRequest) return

      if (message.error) {
        pendingRequest.reject(new Error(message.error.message))
      } else {
        pendingRequest.resolve(message.result)
      }
      return
    }

    if (typeof message.method === 'string' && typeof message.id !== 'number') {
      this.emitNotification({
        method: message.method,
        params: message.params ?? null,
      })
      return
    }

    // Handle server-initiated JSON-RPC requests (approvals, dynamic tool calls, etc.).
    if (typeof message.id === 'number' && typeof message.method === 'string') {
      this.handleServerRequest(message.id, message.method, message.params ?? null)
    }
  }

  private emitNotification(notification: { method: string; params: unknown }): void {
    for (const listener of this.notificationListeners) {
      listener(notification)
    }
  }

  private sendServerRequestReply(requestId: number, reply: ServerRequestReply): void {
    if (reply.error) {
      this.sendLine({
        jsonrpc: '2.0',
        id: requestId,
        error: reply.error,
      })
      return
    }

    this.sendLine({
      jsonrpc: '2.0',
      id: requestId,
      result: reply.result ?? {},
    })
  }

  private resolvePendingServerRequest(requestId: number, reply: ServerRequestReply): void {
    const pendingRequest = this.pendingServerRequests.get(requestId)
    if (!pendingRequest) {
      throw new Error(`No pending server request found for id ${String(requestId)}`)
    }
    this.pendingServerRequests.delete(requestId)

    this.sendServerRequestReply(requestId, reply)
    const requestParams = asRecord(pendingRequest.params)
    const threadId =
      typeof requestParams?.threadId === 'string' && requestParams.threadId.length > 0
        ? requestParams.threadId
        : ''
    this.emitNotification({
      method: 'server/request/resolved',
      params: {
        id: requestId,
        method: pendingRequest.method,
        threadId,
        mode: 'manual',
        resolvedAtIso: new Date().toISOString(),
      },
    })
  }

  private handleServerRequest(requestId: number, method: string, params: unknown): void {
    const pendingRequest: PendingServerRequest = {
      id: requestId,
      method,
      params,
      receivedAtIso: new Date().toISOString(),
    }
    this.pendingServerRequests.set(requestId, pendingRequest)

    this.emitNotification({
      method: 'server/request',
      params: pendingRequest,
    })
  }

  private async call(method: string, params: unknown): Promise<unknown> {
    this.start()
    const id = this.nextId++

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })

      this.sendLine({
        jsonrpc: '2.0',
        id,
        method,
        params,
      } satisfies JsonRpcCall)
    })
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    await this.call('initialize', {
      clientInfo: {
        name: 'codex-web-local',
        version: '0.1.0',
      },
    })

    this.initialized = true
  }

  async rpc(method: string, params: unknown): Promise<unknown> {
    await this.ensureInitialized()
    return this.call(method, params)
  }

  onNotification(listener: (value: { method: string; params: unknown }) => void): () => void {
    this.notificationListeners.add(listener)
    return () => {
      this.notificationListeners.delete(listener)
    }
  }

  async respondToServerRequest(payload: unknown): Promise<void> {
    await this.ensureInitialized()

    const body = asRecord(payload)
    if (!body) {
      throw new Error('Invalid response payload: expected object')
    }

    const id = body.id
    if (typeof id !== 'number' || !Number.isInteger(id)) {
      throw new Error('Invalid response payload: "id" must be an integer')
    }

    const rawError = asRecord(body.error)
    if (rawError) {
      const message = typeof rawError.message === 'string' && rawError.message.trim().length > 0
        ? rawError.message.trim()
        : 'Server request rejected by client'
      const code = typeof rawError.code === 'number' && Number.isFinite(rawError.code)
        ? Math.trunc(rawError.code)
        : -32000
      this.resolvePendingServerRequest(id, { error: { code, message } })
      return
    }

    if (!('result' in body)) {
      throw new Error('Invalid response payload: expected "result" or "error"')
    }

    this.resolvePendingServerRequest(id, { result: body.result })
  }

  listPendingServerRequests(): PendingServerRequest[] {
    return Array.from(this.pendingServerRequests.values())
  }

  dispose(): void {
    if (!this.process) return

    const proc = this.process
    this.stopping = true
    this.process = null
    this.initialized = false
    this.readBuffer = ''

    const failure = new Error('codex app-server stopped')
    for (const request of this.pending.values()) {
      request.reject(failure)
    }
    this.pending.clear()
    this.pendingServerRequests.clear()

    try {
      proc.stdin.end()
    } catch {
      // ignore close errors on shutdown
    }

    try {
      proc.kill('SIGTERM')
    } catch {
      // ignore kill errors on shutdown
    }

    const forceKillTimer = setTimeout(() => {
      if (!proc.killed) {
        try {
          proc.kill('SIGKILL')
        } catch {
          // ignore kill errors on shutdown
        }
      }
    }, 1500)
    forceKillTimer.unref()
  }
}

class MethodCatalog {
  private methodCache: string[] | null = null
  private notificationCache: string[] | null = null

  private async runGenerateSchemaCommand(outDir: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const codexBin = prefixBin ? join(prefixBin, 'codex') : 'codex'
      const process = spawn(codexBin, ['app-server', 'generate-json-schema', '--out', outDir], {
        stdio: ['ignore', 'ignore', 'pipe'],
      })

      let stderr = ''

      process.stderr.setEncoding('utf8')
      process.stderr.on('data', (chunk: string) => {
        stderr += chunk
      })

      process.on('error', reject)
      process.on('exit', (code) => {
        if (code === 0) {
          resolve()
          return
        }

        reject(new Error(stderr.trim() || `generate-json-schema exited with code ${String(code)}`))
      })
    })
  }

  private extractMethodsFromClientRequest(payload: unknown): string[] {
    const root = asRecord(payload)
    const oneOf = Array.isArray(root?.oneOf) ? root.oneOf : []
    const methods = new Set<string>()

    for (const entry of oneOf) {
      const row = asRecord(entry)
      const properties = asRecord(row?.properties)
      const methodDef = asRecord(properties?.method)
      const methodEnum = Array.isArray(methodDef?.enum) ? methodDef.enum : []

      for (const item of methodEnum) {
        if (typeof item === 'string' && item.length > 0) {
          methods.add(item)
        }
      }
    }

    return Array.from(methods).sort((a, b) => a.localeCompare(b))
  }

  private extractMethodsFromServerNotification(payload: unknown): string[] {
    const root = asRecord(payload)
    const oneOf = Array.isArray(root?.oneOf) ? root.oneOf : []
    const methods = new Set<string>()

    for (const entry of oneOf) {
      const row = asRecord(entry)
      const properties = asRecord(row?.properties)
      const methodDef = asRecord(properties?.method)
      const methodEnum = Array.isArray(methodDef?.enum) ? methodDef.enum : []

      for (const item of methodEnum) {
        if (typeof item === 'string' && item.length > 0) {
          methods.add(item)
        }
      }
    }

    return Array.from(methods).sort((a, b) => a.localeCompare(b))
  }

  async listMethods(): Promise<string[]> {
    if (this.methodCache) {
      return this.methodCache
    }

    const outDir = await mkdtemp(join(tmpdir(), 'codex-web-local-schema-'))
    await this.runGenerateSchemaCommand(outDir)

    const clientRequestPath = join(outDir, 'ClientRequest.json')
    const raw = await readFile(clientRequestPath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    const methods = this.extractMethodsFromClientRequest(parsed)

    this.methodCache = methods
    return methods
  }

  async listNotificationMethods(): Promise<string[]> {
    if (this.notificationCache) {
      return this.notificationCache
    }

    const outDir = await mkdtemp(join(tmpdir(), 'codex-web-local-schema-'))
    await this.runGenerateSchemaCommand(outDir)

    const serverNotificationPath = join(outDir, 'ServerNotification.json')
    const raw = await readFile(serverNotificationPath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    const methods = this.extractMethodsFromServerNotification(parsed)

    this.notificationCache = methods
    return methods
  }
}

type CodexBridgeMiddleware = ((req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>) & {
  dispose: () => void
}

type SharedBridgeState = {
  appServer: AppServerProcess
  methodCatalog: MethodCatalog
}

const SHARED_BRIDGE_KEY = '__codexRemoteSharedBridge__'

function getSharedBridgeState(): SharedBridgeState {
  const globalScope = globalThis as typeof globalThis & {
    [SHARED_BRIDGE_KEY]?: SharedBridgeState
  }

  const existing = globalScope[SHARED_BRIDGE_KEY]
  if (existing) return existing

  const created: SharedBridgeState = {
    appServer: new AppServerProcess(),
    methodCatalog: new MethodCatalog(),
  }
  globalScope[SHARED_BRIDGE_KEY] = created
  return created
}

export function createCodexBridgeMiddleware(): CodexBridgeMiddleware {
  const { appServer, methodCatalog } = getSharedBridgeState()

  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    try {
      if (!req.url) {
        next()
        return
      }

      const url = new URL(req.url, 'http://localhost')

      if (req.method === 'POST' && url.pathname === '/codex-api/rpc') {
        const payload = await readJsonBody(req)
        const body = asRecord(payload) as RpcProxyRequest | null

        if (!body || typeof body.method !== 'string' || body.method.length === 0) {
          setJson(res, 400, { error: 'Invalid body: expected { method, params? }' })
          return
        }

        let nextParams: unknown = body.params ?? null
        if (shouldInjectDeveloperInstructions(body.method)) {
          const injected = await buildInjectedDeveloperInstructions()
          if (injected.length > 0) {
            const paramsRecord = asRecord(nextParams) ?? {}
            paramsRecord.developerInstructions = mergeDeveloperInstructions(
              paramsRecord.developerInstructions,
              injected,
            )
            nextParams = paramsRecord
          }
        }

        const result = await appServer.rpc(body.method, nextParams)
        setJson(res, 200, { result })
        return
      }

      if (req.method === 'POST' && url.pathname === '/codex-api/server-requests/respond') {
        const payload = await readJsonBody(req)
        await appServer.respondToServerRequest(payload)
        setJson(res, 200, { ok: true })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/server-requests/pending') {
        setJson(res, 200, { data: appServer.listPendingServerRequests() })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/meta/methods') {
        const methods = await methodCatalog.listMethods()
        setJson(res, 200, { data: methods })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/meta/notifications') {
        const methods = await methodCatalog.listNotificationMethods()
        setJson(res, 200, { data: methods })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/openclaw/dashboard-status') {
        const rawPort = Number.parseInt(url.searchParams.get('port') ?? '', 10)
        if (!Number.isFinite(rawPort) || rawPort <= 0) {
          setJson(res, 400, { error: 'Invalid port' })
          return
        }

        const result = await probeLoopbackHttp(rawPort, '/chat?probe=1')
        setJson(res, 200, {
          ok: result.ok,
          status: result.status,
          detail: result.detail,
          port: rawPort,
        })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/openclaw/runtime-diagnostics') {
        const gatewayStatus = await readJsonFile(join(openClawStateDir, 'gateway-status.json'))
        const controlUiStatus = await readJsonFile(join(openClawStateDir, 'control-ui-status.json'))
        const runtimeHealth = await readJsonFile(join(openClawStateDir, 'runtime-health.json'))
        const heartbeatBootstrap = await readJsonFile(join(openClawStateDir, 'heartbeat-bootstrap.json'))
        const gatewayLog = await readTextTail(join(openClawStateDir, 'gateway.log'))
        const controlUiLog = await readTextTail(join(openClawStateDir, 'control-ui.log'))

        setJson(res, 200, {
          gatewayStatus,
          controlUiStatus,
          runtimeHealth,
          heartbeatBootstrap,
          gatewayLog,
          controlUiLog,
        })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/skills-sync/status') {
        const state = await readSkillsSyncState()
        setJson(res, 200, {
          data: {
            loggedIn: Boolean(state.githubToken),
            githubUsername: state.githubUsername ?? '',
            repoOwner: state.repoOwner ?? '',
            repoName: state.repoName ?? '',
            configured: Boolean(state.githubToken && state.repoOwner && state.repoName),
            startup: {
              inProgress: false,
              mode: 'idle',
              branch: 'main',
              lastAction: 'idle',
              lastRunAtIso: '',
              lastSuccessAtIso: '',
              lastError: '',
            },
          },
        })
        return
      }

      if (req.method === 'POST' && url.pathname === '/codex-api/skills-sync/github/start-login') {
        const payload = await startGitHubDeviceLogin()
        setJson(res, 200, { data: payload })
        return
      }

      if (req.method === 'POST' && url.pathname === '/codex-api/skills-sync/github/complete-login') {
        const body = asRecord(await readJsonBody(req))
        const deviceCode = normalizeText(body?.deviceCode)
        if (!deviceCode) {
          setJson(res, 400, { error: 'Missing deviceCode' })
          return
        }

        const result = await completeGitHubDeviceLogin(deviceCode)
        if (!result.token) {
          setJson(res, 200, { ok: false, pending: result.error === 'authorization_pending', error: result.error || 'login_failed' })
          return
        }

        const githubUsername = await resolveGitHubUsername(result.token)
        await writeSkillsSyncState({
          githubToken: result.token,
          githubUsername,
          repoOwner: githubUsername,
          repoName: 'codexskills',
        })
        setJson(res, 200, { ok: true, data: { githubUsername } })
        return
      }

      if (req.method === 'POST' && url.pathname === '/codex-api/skills-sync/github/logout') {
        await writeSkillsSyncState({})
        setJson(res, 200, { ok: true })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/workspaces/default-root') {
        const root = await ensureDefaultWorkspaceRoot()
        setJson(res, 200, { data: { root } })
        return
      }

      if (req.method === 'POST' && url.pathname === '/codex-api/workspaces/create') {
        const body = asRecord(await readJsonBody(req))
        const name = normalizeText(body?.name)
        if (!name) {
          setJson(res, 400, { error: 'Missing workspace name' })
          return
        }
        const workspace = await createWorkspaceDirectory(name)
        setJson(res, 200, { data: workspace })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/skills-hub/github') {
        const query = normalizeText(url.searchParams.get('q')).toLowerCase()
        const limit = normalizePositiveInteger(url.searchParams.get('limit') || '60', 60, 200)
        const items = await fetchGitHubHubSkills()
        const filtered = query
          ? items.filter((item) =>
              item.name.toLowerCase().includes(query)
              || item.owner.toLowerCase().includes(query)
              || item.displayName.toLowerCase().includes(query)
              || item.description.toLowerCase().includes(query),
            )
          : items
        setJson(res, 200, { data: filtered.slice(0, limit) })
        return
      }

      if (req.method === 'POST' && url.pathname === '/codex-api/skills-hub/github/install') {
        const body = asRecord(await readJsonBody(req))
        const owner = normalizeText(body?.owner)
        const name = normalizeText(body?.name)
        if (!owner || !name) {
          setJson(res, 400, { error: 'Missing owner or name' })
          return
        }

        const installedBefore = await readInstalledSkills(appServer)
        const beforeSet = new Set(installedBefore.map((entry) => entry.path))
        const reference = `${GITHUB_HUB_OWNER}/${GITHUB_HUB_REPO}/tree/main/skills/${owner}/${name}`
        const { skillFilePath } = await installGitHubSkillToDisk(reference)
        const installedAfter = await readInstalledSkills(appServer, true)
        const installedEntry =
          installedAfter.find((entry) => entry.path === skillFilePath)
          ?? installedAfter.find((entry) => !beforeSet.has(entry.path) && entry.name === name)
          ?? installedAfter.find((entry) => entry.name === name)

        if (!installedEntry) {
          throw new Error('GitHub skill files were copied, but Codex did not register the skill')
        }

        setJson(res, 200, { ok: true, name: installedEntry.name, path: installedEntry.path })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/skills-hub/readme') {
        const owner = normalizeText(url.searchParams.get('owner'))
        const name = normalizeText(url.searchParams.get('name'))
        if (!owner || !name) {
          setJson(res, 400, { error: 'Missing owner or name' })
          return
        }

        const content = await readGitHubHubSkillDocument(owner, name)
        setJson(res, 200, { content })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/skills-hub/search') {
        const query = normalizeText(url.searchParams.get('q'))
        if (!query) {
          setJson(res, 200, { results: [] })
          return
        }

        const limit = normalizePositiveInteger(url.searchParams.get('limit') ?? '', 18, 40)
        const params = new URLSearchParams({
          q: query,
          limit: String(limit),
        })
        const payload = await fetchClawHubJson('/api/v1/search', params)
        setJson(res, 200, payload)
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/skills-hub/skill') {
        const slug = normalizeText(url.searchParams.get('slug'))
        if (!slug) {
          setJson(res, 400, { error: 'Missing slug' })
          return
        }

        const payload = await fetchClawHubJson(`/api/v1/skills/${encodeURIComponent(slug)}`, new URLSearchParams())
        setJson(res, 200, payload)
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/skills-hub/versions') {
        const slug = normalizeText(url.searchParams.get('slug'))
        if (!slug) {
          setJson(res, 400, { error: 'Missing slug' })
          return
        }

        const limit = normalizePositiveInteger(url.searchParams.get('limit') ?? '', 6, 20)
        const params = new URLSearchParams({ limit: String(limit) })
        const payload = await fetchClawHubJson(`/api/v1/skills/${encodeURIComponent(slug)}/versions`, params)
        setJson(res, 200, payload)
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/skills-hub/download-url') {
        const slug = normalizeText(url.searchParams.get('slug'))
        const version = normalizeText(url.searchParams.get('version'))
        const tag = normalizeText(url.searchParams.get('tag')) || 'latest'
        if (!slug) {
          setJson(res, 400, { error: 'Missing slug' })
          return
        }

        const params = new URLSearchParams({ slug })
        if (version) {
          params.set('version', version)
        } else {
          params.set('tag', tag)
        }
        setJson(res, 200, { url: `${clawHubBaseUrl}/api/v1/download?${params.toString()}` })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/skills-hub/version-detail') {
        const slug = normalizeText(url.searchParams.get('slug'))
        const version = normalizeText(url.searchParams.get('version'))
        if (!slug || !version) {
          setJson(res, 400, { error: 'Missing slug or version' })
          return
        }

        const payload = await fetchClawHubJson(
          `/api/v1/skills/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}`,
          new URLSearchParams(),
        )
        setJson(res, 200, payload)
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/skills-hub/installed') {
        const installed = await readInstalledSkills(appServer)
        setJson(res, 200, { data: installed })
        return
      }

      if (req.method === 'POST' && url.pathname === '/codex-api/skills-hub/install') {
        const body = asRecord(await readJsonBody(req))
        const slug = normalizeText(body?.slug)
        const requestedVersion = normalizeText(body?.version)
        if (!slug) {
          setJson(res, 400, { error: 'Missing slug' })
          return
        }

        const detail = await fetchClawHubJson(
          `/api/v1/skills/${encodeURIComponent(slug)}`,
          new URLSearchParams(),
        ) as { latestVersion?: { version?: string } | null }
        const version = requestedVersion || normalizeText(detail.latestVersion?.version)
        if (!version) {
          setJson(res, 400, { error: 'No installable version found' })
          return
        }

        const installedBefore = await readInstalledSkills(appServer)
        const beforeSet = new Set(installedBefore.map((entry) => entry.path))
        const { skillFilePath } = await installClawHubSkillToDisk(slug, version)
        const installedAfter = await readInstalledSkills(appServer, true)
        const installedEntry =
          installedAfter.find((entry) => entry.path === skillFilePath)
          ?? installedAfter.find((entry) => !beforeSet.has(entry.path) && entry.name === slug)
          ?? installedAfter.find((entry) => entry.name === slug)

        if (!installedEntry) {
          throw new Error('Skill files were downloaded, but Codex did not register the skill')
        }

        setJson(res, 200, {
          ok: true,
          name: installedEntry.name,
          path: installedEntry.path,
        })
        return
      }

      if (req.method === 'POST' && url.pathname === '/codex-api/skills-hub/install-github') {
        const body = asRecord(await readJsonBody(req))
        const reference = normalizeText(body?.reference)
        if (!reference) {
          setJson(res, 400, { error: 'Missing GitHub reference' })
          return
        }

        const installedBefore = await readInstalledSkills(appServer)
        const beforeSet = new Set(installedBefore.map((entry) => entry.path))
        const { skillFilePath } = await installGitHubSkillToDisk(reference)
        const installedAfter = await readInstalledSkills(appServer, true)
        const installedEntry =
          installedAfter.find((entry) => entry.path === skillFilePath)
          ?? installedAfter.find((entry) => !beforeSet.has(entry.path))

        if (!installedEntry) {
          throw new Error('GitHub skill files were copied, but Codex did not register the skill')
        }

        setJson(res, 200, {
          ok: true,
          name: installedEntry.name,
          path: installedEntry.path,
        })
        return
      }

      if (req.method === 'POST' && url.pathname === '/codex-api/skills-hub/uninstall') {
        const body = asRecord(await readJsonBody(req))
        const skillPath = normalizeText(body?.path)
        if (!skillPath) {
          setJson(res, 400, { error: 'Missing path' })
          return
        }
        const skillRoot = dirname(skillPath)
        const userSkillsDir = getUserSkillsDir()
        if (!skillRoot.startsWith(`${userSkillsDir}/`) && skillRoot !== userSkillsDir) {
          setJson(res, 400, { error: 'Refusing to remove a non-user skill' })
          return
        }

        await rm(skillRoot, { recursive: true, force: true })
        await readInstalledSkills(appServer, true)
        setJson(res, 200, { ok: true })
        return
      }

      if (req.method === 'POST' && url.pathname === '/codex-api/skills-hub/toggle') {
        const body = asRecord(await readJsonBody(req))
        const skillPath = normalizeText(body?.path)
        const enabled = body?.enabled === true
        if (!skillPath) {
          setJson(res, 400, { error: 'Missing path' })
          return
        }
        await appServer.rpc('skills/config/write', {
          path: skillPath,
          enabled,
        })
        setJson(res, 200, { ok: true })
        return
      }

      if (req.method === 'GET' && url.pathname === '/codex-api/events') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')

        const unsubscribe = appServer.onNotification((notification) => {
          if (res.writableEnded || res.destroyed) return
          const payload = {
            ...notification,
            atIso: new Date().toISOString(),
          }
          res.write(`data: ${JSON.stringify(payload)}\n\n`)
        })

        res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`)
        const keepAlive = setInterval(() => {
          res.write(': ping\n\n')
        }, 15000)

        const close = () => {
          clearInterval(keepAlive)
          unsubscribe()
          if (!res.writableEnded) {
            res.end()
          }
        }

        req.on('close', close)
        req.on('aborted', close)
        return
      }

      next()
    } catch (error) {
      const message = getErrorMessage(error, 'Unknown bridge error')
      setJson(res, 502, { error: message })
    }
  }

  middleware.dispose = () => {
    appServer.dispose()
  }

  return middleware
}

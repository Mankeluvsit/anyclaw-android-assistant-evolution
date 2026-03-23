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

export async function getDefaultWorkspaceRoot(): Promise<string> {
  const response = await fetch('/codex-api/workspaces/default-root')
  const payload = await readJson<{ data?: { root?: string } }>(response)
  return typeof payload.data?.root === 'string' ? payload.data.root : ''
}

export async function createWorkspace(name: string): Promise<{ name: string; cwd: string }> {
  const response = await fetch('/codex-api/workspaces/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const payload = await readJson<{ data?: { name?: string; cwd?: string } }>(response)
  if (!payload.data?.name || !payload.data?.cwd) {
    throw new Error('Workspace creation failed')
  }
  return {
    name: payload.data.name,
    cwd: payload.data.cwd,
  }
}

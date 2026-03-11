import { cpSync, existsSync, lstatSync, readlinkSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const nodeModulesDir = resolve(repoRoot, 'node_modules')
const wasmRollupDir = resolve(nodeModulesDir, '@rollup', 'wasm-node')
const rollupDir = resolve(nodeModulesDir, 'rollup')

if (!existsSync(wasmRollupDir)) {
  throw new Error('Missing @rollup/wasm-node. Run npm install before building the frontend.')
}

if (existsSync(rollupDir)) {
  const stats = lstatSync(rollupDir)
  if (stats.isSymbolicLink()) {
    const target = resolve(dirname(rollupDir), readlinkSync(rollupDir))
    if (target === wasmRollupDir) process.exit(0)
  }
  rmSync(rollupDir, { recursive: true, force: true })
}

try {
  symlinkSync(wasmRollupDir, rollupDir, 'dir')
} catch {
  cpSync(wasmRollupDir, rollupDir, { recursive: true })
}

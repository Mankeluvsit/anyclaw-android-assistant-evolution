<template>
  <div class="thread-message-content">
    <template v-for="(block, blockIndex) in blocks" :key="`block-${blockIndex}`">
      <div v-if="block.kind === 'text'" class="message-text-block">
        <p
          v-for="(paragraph, paragraphIndex) in block.paragraphs"
          :key="`paragraph-${blockIndex}-${paragraphIndex}`"
          class="message-text"
        >
          <template
            v-for="(segment, segmentIndex) in parseInlineSegments(paragraph)"
            :key="`seg-${blockIndex}-${paragraphIndex}-${segmentIndex}`"
          >
            <span v-if="segment.kind === 'text'">{{ segment.value }}</span>
            <button
              v-else-if="segment.kind === 'link'"
              type="button"
              class="message-link"
              @click="openExternalLink(segment.url)"
            >
              {{ segment.label }}
            </button>
            <button
              v-else-if="segment.kind === 'file'"
              type="button"
              class="message-file-link"
              @click="copyFileReference(segment.value)"
            >
              {{ segment.displayName }}
            </button>
            <code v-else class="message-inline-code">{{ segment.value }}</code>
          </template>
        </p>
      </div>

      <details
        v-else
        class="message-code-shell"
        :open="!shouldCollapseCode(block.code)"
      >
        <summary class="message-code-summary">
          <span class="message-code-summary-copy">
            <span class="message-code-label">{{ block.language || t('conversation_code_label') }}</span>
            <span class="message-code-meta">{{ formatCodeMeta(block.code) }}</span>
          </span>
          <button
            type="button"
            class="message-code-copy"
            @click.prevent.stop="copyCodeBlock(block.code)"
          >
            {{ t('conversation_code_copy') }}
          </button>
        </summary>
        <pre class="message-code-block"><code>{{ block.code }}</code></pre>
      </details>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiI18n } from '../../composables/useUiI18n'

type InlineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'file'; value: string; displayName: string }
  | { kind: 'link'; url: string; label: string }

type TextBlock = {
  kind: 'text'
  paragraphs: string[]
}

type CodeBlock = {
  kind: 'code'
  language: string
  code: string
}

type MessageBlock = TextBlock | CodeBlock

const CODE_FENCE_PATTERN = /```([^\n`]*)\n([\s\S]*?)```/gu
const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s<>)\]]+)/g

const props = defineProps<{
  text: string
}>()

const { t } = useUiI18n()

const blocks = computed<MessageBlock[]>(() => parseMessageBlocks(props.text))

function parseMessageBlocks(text: string): MessageBlock[] {
  const next: MessageBlock[] = []
  let lastIndex = 0

  for (const match of text.matchAll(CODE_FENCE_PATTERN)) {
    const start = match.index ?? 0
    if (start > lastIndex) {
      const prose = text.slice(lastIndex, start)
      const paragraphs = prose.split(/\n{2,}/u).map((row) => row.trim()).filter(Boolean)
      if (paragraphs.length > 0) {
        next.push({ kind: 'text', paragraphs })
      }
    }

    const language = (match[1] ?? '').trim()
    const code = (match[2] ?? '').replace(/\n+$/u, '')
    next.push({
      kind: 'code',
      language,
      code,
    })
    lastIndex = start + match[0].length
  }

  if (lastIndex < text.length) {
    const prose = text.slice(lastIndex)
    const paragraphs = prose.split(/\n{2,}/u).map((row) => row.trim()).filter(Boolean)
    if (paragraphs.length > 0) {
      next.push({ kind: 'text', paragraphs })
    }
  }

  if (next.length === 0) {
    return [{ kind: 'text', paragraphs: [text] }]
  }

  return next
}

function isFilePath(value: string): boolean {
  if (!value || /\s/u.test(value)) return false
  if (value.endsWith('/') || value.endsWith('\\')) return false
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(value)) return false

  const looksLikeUnixAbsolute = value.startsWith('/')
  const looksLikeWindowsAbsolute = /^[A-Za-z]:[\\/]/u.test(value)
  const looksLikeRelative = value.startsWith('./') || value.startsWith('../') || value.startsWith('~/')
  const hasPathSeparator = value.includes('/') || value.includes('\\')
  return looksLikeUnixAbsolute || looksLikeWindowsAbsolute || looksLikeRelative || hasPathSeparator
}

function getBasename(pathValue: string): string {
  const normalized = pathValue.replace(/\\/gu, '/')
  const name = normalized.split('/').filter(Boolean).pop()
  return name || pathValue
}

function parseFileReference(value: string): { path: string; line: number | null } | null {
  if (!value) return null

  let pathValue = value
  let line: number | null = null
  const hashLineMatch = pathValue.match(/^(.*)#L(\d+)(?:C\d+)?$/u)
  if (hashLineMatch) {
    pathValue = hashLineMatch[1]
    line = Number(hashLineMatch[2])
  } else {
    const colonLineMatch = pathValue.match(/^(.*):(\d+)(?::\d+)?$/u)
    if (colonLineMatch) {
      pathValue = colonLineMatch[1]
      line = Number(colonLineMatch[2])
    }
  }

  if (!isFilePath(pathValue)) return null
  return { path: pathValue, line }
}

function parseLinksInText(text: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(LINK_PATTERN)) {
    const matchStart = match.index ?? 0
    if (matchStart > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, matchStart) })
    }

    if (match[1] && match[2]) {
      segments.push({ kind: 'link', label: match[1], url: match[2] })
    } else if (match[3] && match[4]) {
      const fileRef = parseFileReference(match[4])
      if (fileRef) {
        segments.push({ kind: 'file', value: match[4], displayName: match[3] })
      } else {
        segments.push({ kind: 'text', value: match[3] })
      }
    } else if (match[5]) {
      segments.push({ kind: 'link', label: match[5], url: match[5] })
    }

    lastIndex = matchStart + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: text }]
}

function parseCodeSegments(text: string): InlineSegment[] {
  if (!text.includes('`')) return [{ kind: 'text', value: text }]

  const segments: InlineSegment[] = []
  let cursor = 0
  let textStart = 0

  while (cursor < text.length) {
    if (text[cursor] !== '`') {
      cursor += 1
      continue
    }

    let openLength = 1
    while (cursor + openLength < text.length && text[cursor + openLength] === '`') {
      openLength += 1
    }
    const delimiter = '`'.repeat(openLength)
    let searchFrom = cursor + openLength
    let closingStart = -1

    while (searchFrom < text.length) {
      const candidate = text.indexOf(delimiter, searchFrom)
      if (candidate < 0) break

      const hasBacktickBefore = candidate > 0 && text[candidate - 1] === '`'
      const hasBacktickAfter = candidate + openLength < text.length && text[candidate + openLength] === '`'
      const hasNewLineInside = text.slice(cursor + openLength, candidate).includes('\n')
      if (!hasBacktickBefore && !hasBacktickAfter && !hasNewLineInside) {
        closingStart = candidate
        break
      }
      searchFrom = candidate + 1
    }

    if (closingStart < 0) {
      cursor += openLength
      continue
    }

    if (cursor > textStart) {
      segments.push({ kind: 'text', value: text.slice(textStart, cursor) })
    }

    const token = text.slice(cursor + openLength, closingStart)
    if (token.length > 0) {
      const fileReference = parseFileReference(token)
      if (fileReference) {
        const basename = getBasename(fileReference.path)
        const displayName = fileReference.line ? `${basename} (line ${String(fileReference.line)})` : basename
        segments.push({ kind: 'file', value: token, displayName })
      } else {
        segments.push({ kind: 'code', value: token })
      }
    }

    cursor = closingStart + openLength
    textStart = cursor
  }

  if (textStart < text.length) {
    segments.push({ kind: 'text', value: text.slice(textStart) })
  }

  return segments
}

function parseInlineSegments(text: string): InlineSegment[] {
  const codeSegments = parseCodeSegments(text)
  const result: InlineSegment[] = []

  for (const segment of codeSegments) {
    if (segment.kind === 'text') {
      result.push(...parseLinksInText(segment.value))
    } else {
      result.push(segment)
    }
  }

  return result
}

function shouldCollapseCode(code: string): boolean {
  return code.split('\n').length > 14 || code.length > 700
}

function formatCodeMeta(code: string): string {
  const lines = code.split('\n').length
  return `${String(lines)} lines`
}

function openExternalLink(url: string): void {
  if (typeof window === 'undefined') return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function copyFileReference(value: string): void {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return
  void navigator.clipboard.writeText(value)
}

function copyCodeBlock(value: string): void {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return
  void navigator.clipboard.writeText(value)
}
</script>

<style scoped>
@reference "tailwindcss";

.thread-message-content {
  @apply flex flex-col gap-3;
}

.message-text-block {
  @apply flex flex-col gap-3;
}

.message-text {
  @apply m-0 text-sm leading-7 whitespace-pre-wrap;
  color: var(--text-default);
}

.message-inline-code {
  @apply rounded-md border px-1.5 py-0.5 text-[0.875em] leading-[1.4] font-mono;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-hover) 84%, transparent);
  color: var(--text-default);
}

.message-link {
  @apply inline border-0 bg-transparent p-0 text-sm leading-relaxed underline underline-offset-2;
  color: var(--accent-primary);
}

.message-file-link {
  @apply inline border-0 bg-transparent p-0 text-sm leading-relaxed no-underline hover:underline underline-offset-2;
  color: var(--accent-primary);
}

.message-code-shell {
  @apply rounded-2xl border;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
  box-shadow: var(--shadow-soft);
}

.message-code-summary {
  @apply flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm;
  list-style: none;
}

.message-code-summary::-webkit-details-marker {
  display: none;
}

.message-code-summary-copy {
  @apply flex min-w-0 flex-col;
}

.message-code-label {
  @apply font-semibold uppercase tracking-[0.14em] text-[11px];
  color: var(--text-muted);
}

.message-code-meta {
  @apply text-xs;
  color: var(--text-muted);
}

.message-code-copy {
  @apply rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em];
  border-color: var(--border-subtle);
  color: var(--text-default);
  background: color-mix(in srgb, var(--surface-hover) 70%, transparent);
}

.message-code-block {
  @apply m-0 overflow-x-auto px-3 pb-3 text-[13px] leading-6;
  color: var(--text-default);
}
</style>

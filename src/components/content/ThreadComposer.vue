<template>
  <form class="thread-composer" @submit.prevent="onSubmit">
    <div class="thread-composer-shell">
      <div v-if="editMessageLabel" class="thread-composer-editing">
        <span class="thread-composer-editing-label">{{ editMessageLabel }}</span>
        <button class="thread-composer-editing-dismiss" type="button" @click="onCancelEdit">
          <IconTablerX class="thread-composer-editing-dismiss-icon" />
        </button>
      </div>

      <textarea
        ref="inputRef"
        v-model="draft"
        class="thread-composer-input"
        :placeholder="placeholderText"
        :disabled="disabled || !activeThreadId || isTurnInProgress"
        rows="1"
        @keydown="onComposerKeydown"
        @input="onDraftInput"
      />

      <div class="thread-composer-controls">
        <ComposerDropdown
          class="thread-composer-control"
          :model-value="selectedModel"
          :options="modelOptions"
          :placeholder="t('composer_model')"
          open-direction="up"
          :disabled="disabled || !activeThreadId || models.length === 0 || isTurnInProgress"
          @update:model-value="onModelSelect"
        />

        <UiTooltip :content="t('composer_reasoning_help')">
          <ComposerDropdown
            class="thread-composer-control"
            :model-value="selectedReasoningEffort"
            :options="reasoningOptions"
            :placeholder="t('composer_thinking')"
            open-direction="up"
            :disabled="disabled || !activeThreadId || isTurnInProgress"
            @update:model-value="onReasoningEffortSelect"
          />
        </UiTooltip>

        <button
          v-if="isTurnInProgress"
          class="thread-composer-stop"
          type="button"
          :aria-label="t('composer_stop')"
          :disabled="disabled || !activeThreadId || isInterruptingTurn"
          @click="onInterrupt"
        >
          <IconTablerPlayerStopFilled class="thread-composer-stop-icon" />
        </button>
        <button
          v-else
          class="thread-composer-submit"
          type="submit"
          :aria-label="t('composer_send_message')"
          :disabled="!canSubmit"
        >
          <IconTablerArrowUp class="thread-composer-submit-icon" />
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ReasoningEffort } from '../../types/codex'
import IconTablerArrowUp from '../icons/IconTablerArrowUp.vue'
import IconTablerPlayerStopFilled from '../icons/IconTablerPlayerStopFilled.vue'
import IconTablerX from '../icons/IconTablerX.vue'
import UiTooltip from '../ui/UiTooltip.vue'
import ComposerDropdown from './ComposerDropdown.vue'
import { useUiI18n } from '../../composables/useUiI18n'
import { useUiSettings } from '../../composables/useUiSettings'

const { t } = useUiI18n()
const { settings } = useUiSettings()
const DRAFT_STORAGE_KEY = 'codex-web-local.thread-drafts.v1'

const props = defineProps<{
  activeThreadId: string
  models: string[]
  selectedModel: string
  selectedReasoningEffort: ReasoningEffort | ''
  draftSeed?: { key: string; text: string } | null
  editMessageLabel?: string
  isTurnInProgress?: boolean
  isInterruptingTurn?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: [text: string]
  interrupt: []
  cancelEdit: []
  'update:selected-model': [modelId: string]
  'update:selected-reasoning-effort': [effort: ReasoningEffort | '']
}>()

const draft = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const reasoningOptions = computed<Array<{ value: ReasoningEffort; label: string }>>(() => [
  { value: 'none', label: t('thinking_none') },
  { value: 'minimal', label: t('thinking_minimal') },
  { value: 'low', label: t('thinking_low') },
  { value: 'medium', label: t('thinking_medium') },
  { value: 'high', label: t('thinking_high') },
  { value: 'xhigh', label: t('thinking_xhigh') },
])
const modelOptions = computed(() =>
  props.models.map((modelId) => ({ value: modelId, label: modelId })),
)

const canSubmit = computed(() => {
  if (props.disabled) return false
  if (!props.activeThreadId) return false
  if (props.isTurnInProgress) return false
  return draft.value.trim().length > 0
})

const placeholderText = computed(() =>
  props.activeThreadId ? t('composer_type_message') : t('composer_select_thread'),
)

function onSubmit(): void {
  const text = draft.value.trim()
  if (!text || !canSubmit.value) return
  emit('submit', text)
  draft.value = ''
  persistDraft('')
  syncTextareaHeight()
}

function onInterrupt(): void {
  emit('interrupt')
}

function onCancelEdit(): void {
  emit('cancelEdit')
}

function onModelSelect(value: string): void {
  emit('update:selected-model', value)
}

function onReasoningEffortSelect(value: string): void {
  emit('update:selected-reasoning-effort', value as ReasoningEffort)
}

function readStoredDrafts(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {}
  } catch {
    return {}
  }
}

function persistDraft(value: string): void {
  if (typeof window === 'undefined' || !props.activeThreadId) return
  const nextDrafts = {
    ...readStoredDrafts(),
    [props.activeThreadId]: value,
  }
  if (!value) {
    delete nextDrafts[props.activeThreadId]
  }
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDrafts))
}

function syncTextareaHeight(): void {
  nextTick(() => {
    const element = inputRef.value
    if (!element) return
    element.style.height = '0px'
    element.style.height = `${Math.min(element.scrollHeight, 220)}px`
  })
}

function onDraftInput(): void {
  persistDraft(draft.value)
  syncTextareaHeight()
}

function onComposerKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  if (!settings.value.pressEnterToSend) return
  event.preventDefault()
  onSubmit()
}

watch(
  () => props.activeThreadId,
  (threadId) => {
    if (!threadId) {
      draft.value = ''
      syncTextareaHeight()
      return
    }
    draft.value = readStoredDrafts()[threadId] ?? ''
    syncTextareaHeight()
  },
  { immediate: true },
)

watch(
  () => props.draftSeed?.key,
  () => {
    const seed = props.draftSeed
    if (!seed || !props.activeThreadId) return
    draft.value = seed.text
    persistDraft(seed.text)
    syncTextareaHeight()
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.setSelectionRange(draft.value.length, draft.value.length)
    })
  },
)

watch(draft, () => {
  syncTextareaHeight()
})
</script>

<style scoped>
@reference "tailwindcss";

.thread-composer {
  @apply w-full max-w-175 mx-auto px-6;
}

.thread-composer-shell {
  @apply rounded-2xl border p-3;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-soft);
}

.thread-composer-editing {
  @apply mb-2 flex items-center justify-between gap-3 rounded-xl border px-3 py-2;
  border-color: color-mix(in srgb, var(--accent-primary) 36%, var(--border-subtle));
  background: color-mix(in srgb, var(--accent-primary) 10%, var(--surface-elevated));
}

.thread-composer-editing-label {
  @apply min-w-0 truncate text-xs font-semibold uppercase tracking-[0.18em];
  color: var(--accent-primary);
}

.thread-composer-editing-dismiss {
  @apply inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-0 transition-colors duration-200;
  color: var(--text-muted);
  background: transparent;
}

.thread-composer-editing-dismiss:hover {
  color: var(--text-default);
  background: color-mix(in srgb, var(--surface-hover) 72%, white);
}

.thread-composer-editing-dismiss-icon {
  @apply h-4 w-4;
}

.thread-composer-input {
  @apply block w-full min-w-0 resize-none overflow-y-auto rounded-xl border-0 bg-transparent px-1 py-2 text-sm outline-none transition-colors duration-200;
  min-height: 2.75rem;
  max-height: 13.75rem;
  color: var(--text-default);
}

.thread-composer-input:focus {
  @apply ring-0;
}

.thread-composer-input:disabled {
  @apply cursor-not-allowed;
  color: var(--text-muted);
}

.thread-composer-controls {
  @apply mt-3 flex flex-wrap items-center gap-3;
}

.thread-composer-control {
  @apply shrink-0;
}

.thread-composer-submit {
  @apply ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 transition-colors duration-200 disabled:cursor-not-allowed;
  background: var(--accent-primary);
  color: var(--accent-on-primary);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--accent-primary) 24%, transparent);
}

.thread-composer-submit:hover {
  background: color-mix(in srgb, var(--accent-primary) 88%, black);
}

.thread-composer-submit:disabled {
  background: var(--surface-hover);
  color: var(--text-muted);
  box-shadow: none;
}

.thread-composer-submit-icon {
  @apply h-5 w-5;
}

.thread-composer-stop {
  @apply ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 transition-colors duration-200 disabled:cursor-not-allowed;
  background: var(--surface-hover);
  color: var(--text-default);
}

.thread-composer-stop:hover {
  background: color-mix(in srgb, var(--surface-hover) 82%, white);
}

.thread-composer-stop:disabled {
  color: var(--text-muted);
}

.thread-composer-stop-icon {
  @apply h-5 w-5;
}

@media (max-width: 960px) {
  .thread-composer {
    @apply max-w-none px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))];
  }

  .thread-composer-shell {
    @apply rounded-[1.25rem] p-2.5;
  }

  .thread-composer-controls {
    @apply gap-2;
  }
}
</style>

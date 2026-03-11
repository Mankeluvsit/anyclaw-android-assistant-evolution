<template>
  <form class="thread-composer" @submit.prevent="onSubmit">
    <div class="thread-composer-shell">
      <input
        v-model="draft"
        class="thread-composer-input"
        type="text"
        :placeholder="placeholderText"
        :disabled="disabled || !activeThreadId || isTurnInProgress"
        @keydown.enter.exact.prevent="onSubmit"
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
import { computed, ref, watch } from 'vue'
import type { ReasoningEffort } from '../../types/codex'
import IconTablerArrowUp from '../icons/IconTablerArrowUp.vue'
import IconTablerPlayerStopFilled from '../icons/IconTablerPlayerStopFilled.vue'
import UiTooltip from '../ui/UiTooltip.vue'
import ComposerDropdown from './ComposerDropdown.vue'
import { useUiI18n } from '../../composables/useUiI18n'

const { t } = useUiI18n()

const props = defineProps<{
  activeThreadId: string
  models: string[]
  selectedModel: string
  selectedReasoningEffort: ReasoningEffort | ''
  isTurnInProgress?: boolean
  isInterruptingTurn?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: [text: string]
  interrupt: []
  'update:selected-model': [modelId: string]
  'update:selected-reasoning-effort': [effort: ReasoningEffort | '']
}>()

const draft = ref('')
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
}

function onInterrupt(): void {
  emit('interrupt')
}

function onModelSelect(value: string): void {
  emit('update:selected-model', value)
}

function onReasoningEffortSelect(value: string): void {
  emit('update:selected-reasoning-effort', value as ReasoningEffort)
}

watch(
  () => props.activeThreadId,
  () => {
    draft.value = ''
  },
)
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

.thread-composer-input {
  @apply w-full min-w-0 h-11 rounded-xl border-0 bg-transparent px-1 text-sm outline-none transition-colors duration-200;
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
  @apply mt-3 flex items-center gap-4;
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
</style>

<template>
  <section class="thread-composer">
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
        :enterkeyhint="settings.pressEnterToSend ? 'send' : 'enter'"
        rows="1"
        @keydown="onComposerKeydown"
        @beforeinput="onComposerBeforeInput"
        @input="onDraftInput"
      />

      <div v-if="attachments.length > 0" class="thread-composer-attachments">
        <article
          v-for="attachment in attachments"
          :key="attachment.id"
          class="thread-composer-attachment"
        >
          <img class="thread-composer-attachment-preview" :src="attachment.url" :alt="attachment.name" />
          <div class="thread-composer-attachment-meta">
            <span class="thread-composer-attachment-name">{{ attachment.name }}</span>
          </div>
          <button
            class="thread-composer-attachment-remove"
            type="button"
            :aria-label="t('composer_remove_attachment')"
            @click="removeAttachment(attachment.id)"
          >
            <IconTablerX class="thread-composer-attachment-remove-icon" />
          </button>
        </article>
      </div>

      <div v-if="selectedSkills.length > 0" class="thread-composer-skills">
        <button
          v-for="skill in selectedSkills"
          :key="skill.path"
          class="thread-composer-skill-chip"
          type="button"
          @click="toggleSkill(skill)"
        >
          <span class="thread-composer-skill-chip-label">{{ skill.name }}</span>
          <IconTablerX class="thread-composer-skill-chip-remove" />
        </button>
      </div>

      <div class="thread-composer-controls">
        <label
          class="thread-composer-attach"
          :data-disabled="disabled || !activeThreadId || isTurnInProgress"
          :aria-label="t('composer_add_attachment')"
          :title="t('composer_add_attachment')"
        >
          <input
            ref="fileInputRef"
            class="thread-composer-file-input"
            type="file"
            accept="image/*"
            multiple
            :disabled="disabled || !activeThreadId || isTurnInProgress"
            @change="onAttachmentInput"
          />
          <IconTablerPaperclip class="thread-composer-attach-icon" />
        </label>

        <button
          class="thread-composer-skills-button"
          type="button"
          :data-active="isSkillsPanelOpen"
          :disabled="disabled || !activeThreadId || availableSkills.length === 0 || isTurnInProgress"
          @click="isSkillsPanelOpen = !isSkillsPanelOpen"
        >
          <span>{{ t('composer_skills') }}</span>
          <span v-if="selectedSkills.length > 0" class="thread-composer-skills-count">{{ selectedSkills.length }}</span>
        </button>

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
          type="button"
          :aria-label="t('composer_send_message')"
          :disabled="!canSubmit"
          @click="onSubmit"
        >
          <IconTablerArrowUp class="thread-composer-submit-icon" />
        </button>
      </div>

      <div v-if="isSkillsPanelOpen" class="thread-composer-skills-panel">
        <div class="thread-composer-skills-panel-head">
          <strong>{{ t('composer_skills_panel_title') }}</strong>
          <span class="thread-composer-skills-meta">{{ selectedSkills.length }} / {{ availableSkills.length }}</span>
        </div>
        <div v-if="availableSkills.length === 0" class="thread-composer-skills-empty">
          {{ t('composer_skills_empty') }}
        </div>
        <div v-else class="thread-composer-skills-list">
          <button
            v-for="skill in availableSkills"
            :key="skill.path"
            class="thread-composer-skill-option"
            :data-selected="isSkillSelected(skill)"
            type="button"
            @click="toggleSkill(skill)"
          >
            <div class="thread-composer-skill-option-copy">
              <strong>{{ skill.name }}</strong>
              <p>{{ skill.shortDescription || skill.description || skill.path }}</p>
            </div>
            <span class="thread-composer-skill-option-state">
              {{ isSkillSelected(skill) ? t('composer_skill_selected') : t('composer_skill_add') }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { getInstalledSkills } from '../../api/skillsHub'
import type { InstalledSkill } from '../../types/skillsHub'
import type { ComposerImageAttachment, ComposerSkillSelection, ReasoningEffort } from '../../types/codex'
import IconTablerArrowUp from '../icons/IconTablerArrowUp.vue'
import IconTablerPaperclip from '../icons/IconTablerPaperclip.vue'
import IconTablerPlayerStopFilled from '../icons/IconTablerPlayerStopFilled.vue'
import IconTablerX from '../icons/IconTablerX.vue'
import UiTooltip from '../ui/UiTooltip.vue'
import ComposerDropdown from './ComposerDropdown.vue'
import { useUiI18n } from '../../composables/useUiI18n'
import { useUiSettings } from '../../composables/useUiSettings'

const { t } = useUiI18n()
const { settings } = useUiSettings()
const DRAFT_STORAGE_KEY = 'codex-web-local.thread-drafts.v1'
const SKILL_STORAGE_KEY = 'codex-web-local.thread-skills.v1'

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
  submit: [payload: { text: string; attachments: ComposerImageAttachment[]; skills: ComposerSkillSelection[] }]
  interrupt: []
  cancelEdit: []
  'update:selected-model': [modelId: string]
  'update:selected-reasoning-effort': [effort: ReasoningEffort | '']
}>()

const draft = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const attachments = ref<ComposerImageAttachment[]>([])
const availableSkills = ref<InstalledSkill[]>([])
const selectedSkills = ref<ComposerSkillSelection[]>([])
const isSkillsPanelOpen = ref(false)
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
  return draft.value.trim().length > 0 || attachments.value.length > 0 || selectedSkills.value.length > 0
})

const placeholderText = computed(() =>
  props.activeThreadId ? t('composer_type_message') : t('composer_select_thread'),
)

function onSubmit(): void {
  const text = draft.value.trim()
  if (!canSubmit.value) return
  emit('submit', { text, attachments: attachments.value, skills: selectedSkills.value })
  draft.value = ''
  revokeAttachmentUrls()
  attachments.value = []
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

function readStoredSkills(): Record<string, ComposerSkillSelection[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(SKILL_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, ComposerSkillSelection[]>)
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

function persistSelectedSkills(skills: ComposerSkillSelection[]): void {
  if (typeof window === 'undefined' || !props.activeThreadId) return
  const next = {
    ...readStoredSkills(),
    [props.activeThreadId]: skills,
  }
  if (skills.length === 0) {
    delete next[props.activeThreadId]
  }
  window.localStorage.setItem(SKILL_STORAGE_KEY, JSON.stringify(next))
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
  event.stopPropagation()
  if (!settings.value.pressEnterToSend) return
  event.preventDefault()
  onSubmit()
}

function onComposerBeforeInput(event: InputEvent): void {
  if (event.inputType !== 'insertLineBreak') return
  if (!settings.value.pressEnterToSend) return
  event.preventDefault()
  onSubmit()
}

async function onAttachmentInput(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])
  if (files.length === 0) return

  const nextAttachments = await Promise.all(
    files
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, 4 - attachments.value.length))
      .map(async (file) => ({
        id: `${file.name}:${file.size}:${file.lastModified}:${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        url: await readFileAsDataUrl(file),
      })),
  )

  attachments.value = [...attachments.value, ...nextAttachments]
  if (input) {
    input.value = ''
  }
}

function removeAttachment(attachmentId: string): void {
  attachments.value = attachments.value.filter((attachment) => attachment.id !== attachmentId)
}

function isSkillSelected(skill: InstalledSkill | ComposerSkillSelection): boolean {
  return selectedSkills.value.some((entry) => entry.path === skill.path)
}

function toggleSkill(skill: InstalledSkill | ComposerSkillSelection): void {
  if (isSkillSelected(skill)) {
    selectedSkills.value = selectedSkills.value.filter((entry) => entry.path !== skill.path)
    return
  }
  selectedSkills.value = [
    ...selectedSkills.value,
    {
      name: skill.name,
      path: skill.path,
      description: 'description' in skill ? skill.description : undefined,
      enabled: 'enabled' in skill ? skill.enabled : undefined,
    },
  ]
}

function revokeAttachmentUrls(): void {
  // Data URLs do not need explicit cleanup.
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

watch(
  () => props.activeThreadId,
  (threadId) => {
    if (!threadId) {
      draft.value = ''
      selectedSkills.value = []
      syncTextareaHeight()
      return
    }
    draft.value = readStoredDrafts()[threadId] ?? ''
    selectedSkills.value = readStoredSkills()[threadId] ?? []
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

watch(
  () => props.activeThreadId,
  () => {
    revokeAttachmentUrls()
    attachments.value = []
    isSkillsPanelOpen.value = false
  },
)

watch(selectedSkills, (next) => {
  persistSelectedSkills(next)
}, { deep: true })

watch(
  () => props.activeThreadId,
  async () => {
    try {
      availableSkills.value = await getInstalledSkills()
    } catch {
      availableSkills.value = []
    }
  },
  { immediate: true },
)
</script>

<style scoped>
@reference "tailwindcss";

.thread-composer {
  @apply w-full max-w-175 mx-auto px-6;
}

.thread-composer-shell {
  @apply rounded-2xl border p-2.5;
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

.thread-composer-attachments {
  @apply mt-3 flex flex-wrap gap-2;
}

.thread-composer-skills {
  @apply mt-3 flex flex-wrap gap-2;
}

.thread-composer-skill-chip {
  @apply inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs;
  border-color: color-mix(in srgb, var(--accent-primary) 36%, var(--border-subtle));
  background: color-mix(in srgb, var(--accent-primary) 10%, var(--surface-elevated));
  color: var(--text-default);
}

.thread-composer-skill-chip-label {
  @apply max-w-42 truncate font-medium;
}

.thread-composer-skill-chip-remove {
  @apply h-3.5 w-3.5;
}

.thread-composer-attachment {
  @apply relative flex items-center gap-2 rounded-xl border px-2 py-2;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-hover) 86%, transparent);
}

.thread-composer-attachment-preview {
  @apply h-12 w-12 rounded-lg object-cover;
}

.thread-composer-attachment-meta {
  @apply min-w-0 pr-6;
}

.thread-composer-attachment-name {
  @apply block truncate text-xs font-medium;
  color: var(--text-default);
}

.thread-composer-attachment-remove {
  @apply absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border-0 transition-colors duration-200;
  background: color-mix(in srgb, var(--surface-base) 80%, transparent);
  color: var(--text-muted);
}

.thread-composer-attachment-remove:hover {
  color: var(--text-default);
}

.thread-composer-attachment-remove-icon {
  @apply h-3.5 w-3.5;
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

.thread-composer-file-input {
  @apply hidden;
}

.thread-composer-attach {
  @apply inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 transition-colors duration-200;
  background: var(--surface-hover);
  color: var(--text-default);
}

.thread-composer-attach:hover {
  background: color-mix(in srgb, var(--surface-hover) 82%, white);
}

.thread-composer-attach[data-disabled='true'] {
  cursor: not-allowed;
  color: var(--text-muted);
  pointer-events: none;
}

.thread-composer-attach-icon {
  @apply h-4.5 w-4.5;
}

.thread-composer-control {
  @apply shrink-0;
}

.thread-composer-skills-button {
  @apply inline-flex h-9 shrink-0 items-center gap-2 rounded-full border-0 px-3 text-xs font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60;
  background: var(--surface-hover);
  color: var(--text-default);
}

.thread-composer-skills-button[data-active='true'] {
  background: color-mix(in srgb, var(--accent-primary) 14%, var(--surface-hover));
}

.thread-composer-skills-count {
  @apply inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.68rem];
  background: color-mix(in srgb, var(--accent-primary) 82%, transparent);
  color: var(--accent-on-primary);
}

.thread-composer-skills-panel {
  @apply mt-3 rounded-2xl border px-3 py-3;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-base) 96%, transparent);
}

.thread-composer-skills-panel-head {
  @apply mb-2 flex items-center justify-between gap-3;
}

.thread-composer-skills-meta {
  @apply text-xs;
  color: var(--text-muted);
}

.thread-composer-skills-empty {
  @apply rounded-xl border border-dashed px-3 py-4 text-center text-sm;
  border-color: var(--border-subtle);
  color: var(--text-muted);
}

.thread-composer-skills-list {
  @apply flex max-h-52 flex-col gap-2 overflow-y-auto pr-1;
}

.thread-composer-skill-option {
  @apply flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
}

.thread-composer-skill-option[data-selected='true'] {
  border-color: color-mix(in srgb, var(--accent-primary) 42%, var(--border-strong));
}

.thread-composer-skill-option-copy {
  @apply min-w-0 flex-1;
}

.thread-composer-skill-option-copy strong {
  @apply block truncate text-sm;
  color: var(--text-default);
}

.thread-composer-skill-option-copy p {
  @apply mt-1 break-words text-xs leading-5;
  color: var(--text-muted);
}

.thread-composer-skill-option-state {
  @apply shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.16em];
  color: var(--text-subtle);
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

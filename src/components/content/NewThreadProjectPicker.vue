<template>
  <section class="project-picker">
    <div v-if="selectedOption" class="project-picker-current">
      <span class="project-picker-current-label">{{ t('thread_settings_workspace') }}</span>
      <strong class="project-picker-current-title">{{ selectedOption.label }}</strong>
      <p class="project-picker-current-path">{{ selectedOption.value }}</p>
    </div>

    <div class="project-picker-search-shell">
      <IconTablerSearch class="project-picker-search-icon" />
      <input
        v-model="search"
        class="project-picker-search-input"
        type="search"
        :placeholder="t('project_picker_search_placeholder')"
      />
    </div>

    <div class="project-picker-create">
      <div class="project-picker-create-copy">
        <span class="project-picker-section-title">{{ t('project_picker_create_title') }}</span>
        <p v-if="defaultRoot" class="project-picker-create-root">{{ defaultRoot }}</p>
      </div>
      <div class="project-picker-create-form">
        <input
          v-model="createName"
          class="project-picker-create-input"
          type="text"
          :placeholder="t('project_picker_create_placeholder')"
          @keydown.enter.prevent="emitCreateProject"
        />
        <button
          class="project-picker-create-button"
          type="button"
          :disabled="isCreating || createName.trim().length === 0"
          @click="emitCreateProject"
        >
          {{ isCreating ? t('project_picker_create_pending') : t('project_picker_create_action') }}
        </button>
      </div>
      <p v-if="createError" class="project-picker-create-error">{{ createError }}</p>
    </div>

    <div v-if="pinnedOptions.length > 0" class="project-picker-section">
      <div class="project-picker-section-head">
        <span class="project-picker-section-title">{{ t('project_picker_pinned') }}</span>
      </div>
      <div class="project-picker-list">
        <article
          v-for="option in pinnedOptions"
          :key="`pinned:${option.value}`"
          class="project-picker-card"
          :data-selected="option.value === modelValue"
        >
          <button class="project-picker-card-main" type="button" @click="selectProject(option.value)">
            <div class="project-picker-card-copy">
              <strong class="project-picker-card-title">{{ option.label }}</strong>
              <p class="project-picker-card-path">{{ option.value }}</p>
            </div>
          </button>
          <button
            class="project-picker-pin"
            type="button"
            :title="t('pin')"
            @click.stop="togglePinned(option.value)"
          >
            <IconTablerPin class="project-picker-pin-icon project-picker-pin-icon-active" />
          </button>
        </article>
      </div>
    </div>

    <div v-if="recentOptions.length > 0" class="project-picker-section">
      <div class="project-picker-section-head">
        <span class="project-picker-section-title">{{ t('project_picker_recent') }}</span>
        <span class="project-picker-count">{{ recentOptions.length }}</span>
      </div>
      <div class="project-picker-list">
        <article
          v-for="option in recentOptions"
          :key="`recent:${option.value}`"
          class="project-picker-card"
          :data-selected="option.value === modelValue"
        >
          <button class="project-picker-card-main" type="button" @click="selectProject(option.value)">
            <div class="project-picker-card-copy">
              <strong class="project-picker-card-title">{{ option.label }}</strong>
              <p class="project-picker-card-path">{{ option.value }}</p>
            </div>
          </button>
          <button
            class="project-picker-pin"
            type="button"
            :title="t('pin')"
            @click.stop="togglePinned(option.value)"
          >
            <IconTablerPin v-if="isPinned(option.value)" class="project-picker-pin-icon project-picker-pin-icon-active" />
            <IconTablerPin class="project-picker-pin-icon" v-else />
          </button>
        </article>
      </div>
    </div>

    <div class="project-picker-section">
      <div class="project-picker-section-head">
        <span class="project-picker-section-title">{{ t('project_picker_projects') }}</span>
        <span class="project-picker-count">{{ regularOptions.length }}</span>
      </div>
      <div v-if="regularOptions.length === 0" class="project-picker-empty">
        {{ t('project_picker_empty') }}
      </div>
      <div v-else class="project-picker-list">
        <article
          v-for="option in regularOptions"
          :key="option.value"
          class="project-picker-card"
          :data-selected="option.value === modelValue"
        >
          <button class="project-picker-card-main" type="button" @click="selectProject(option.value)">
            <div class="project-picker-card-copy">
              <strong class="project-picker-card-title">{{ option.label }}</strong>
              <p class="project-picker-card-path">{{ option.value }}</p>
            </div>
          </button>
          <button
            class="project-picker-pin"
            type="button"
            :title="t('pin')"
            @click.stop="togglePinned(option.value)"
          >
            <IconTablerPin v-if="isPinned(option.value)" class="project-picker-pin-icon project-picker-pin-icon-active" />
            <IconTablerPin class="project-picker-pin-icon" v-else />
          </button>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IconTablerPin from '../icons/IconTablerPin.vue'
import IconTablerSearch from '../icons/IconTablerSearch.vue'
import { useUiI18n } from '../../composables/useUiI18n'

type ProjectOption = {
  value: string
  label: string
  projectName: string
}

const STORAGE_KEY = 'anyclaw.project-picker.pinned.v1'
const RECENTS_STORAGE_KEY = 'anyclaw.project-picker.recents.v1'

const props = defineProps<{
  modelValue: string
  options: ProjectOption[]
  defaultRoot?: string
  isCreating?: boolean
  createError?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'create-project': [name: string]
}>()

const { t } = useUiI18n()
const search = ref('')
const createName = ref('')
const pinned = ref<string[]>(readPinned())
const recents = ref<string[]>(readRecents())

const filteredOptions = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return props.options
  return props.options.filter((option) =>
    option.label.toLowerCase().includes(query)
    || option.projectName.toLowerCase().includes(query)
    || option.value.toLowerCase().includes(query),
  )
})

const pinnedOptions = computed(() =>
  filteredOptions.value
    .filter((option) => pinned.value.includes(option.value))
    .sort((left, right) => pinned.value.indexOf(left.value) - pinned.value.indexOf(right.value)),
)

const filteredUnpinned = computed(() =>
  filteredOptions.value.filter((option) => !pinned.value.includes(option.value)),
)

const recentOptions = computed(() =>
  filteredOptions.value
    .filter((option) => !pinned.value.includes(option.value) && recents.value.includes(option.value))
    .sort((left, right) => recents.value.indexOf(left.value) - recents.value.indexOf(right.value)),
)

const regularOptions = computed(() =>
  filteredUnpinned.value.filter((option) => !recents.value.includes(option.value)),
)

const selectedOption = computed(() =>
  props.options.find((option) => option.value === props.modelValue) ?? null,
)

watch(pinned, (next) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}, { deep: true })

watch(recents, (next) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next.slice(0, 6)))
}, { deep: true })

function readPinned(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : []
  } catch {
    return []
  }
}

function readRecents(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENTS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : []
  } catch {
    return []
  }
}

function isPinned(value: string): boolean {
  return pinned.value.includes(value)
}

function togglePinned(value: string): void {
  if (isPinned(value)) {
    pinned.value = pinned.value.filter((entry) => entry !== value)
    return
  }
  pinned.value = [value, ...pinned.value]
}

function emitCreateProject(): void {
  const value = createName.value.trim()
  if (!value || props.isCreating) return
  emit('create-project', value)
}

function selectProject(value: string): void {
  emit('update:modelValue', value)
  recents.value = [value, ...recents.value.filter((entry) => entry !== value)].slice(0, 6)
}

watch(
  () => props.isCreating,
  (next, previous) => {
    if (previous === true && next === false && !props.createError) {
      createName.value = ''
    }
  },
)

watch(
  () => props.options.map((option) => option.value),
  (values) => {
    recents.value = recents.value.filter((entry) => values.includes(entry))
  },
)
</script>

<style scoped>
@reference "tailwindcss";

.project-picker {
  @apply flex max-h-[min(58dvh,32rem)] min-h-0 flex-col gap-3 overflow-hidden rounded-[1.2rem] border p-3;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
}

.project-picker-search-shell {
  @apply flex items-center gap-3 rounded-[1rem] border px-3 py-3;
  border-color: var(--border-subtle);
  background: var(--surface-base);
}

.project-picker-create {
  @apply rounded-[1rem] border px-3 py-3;
  border-color: var(--border-subtle);
  background: var(--surface-base);
}

.project-picker-create-copy {
  @apply flex flex-col gap-1;
}

.project-picker-create-root {
  @apply m-0 break-all text-xs leading-5;
  color: var(--text-muted);
}

.project-picker-create-form {
  @apply mt-3 flex flex-col gap-2 md:flex-row;
}

.project-picker-create-input {
  @apply min-w-0 flex-1 rounded-[0.9rem] border px-3 py-2.5 text-sm outline-none;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
  color: var(--text-default);
}

.project-picker-create-button {
  @apply inline-flex items-center justify-center rounded-[0.9rem] px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60;
  background: var(--accent-primary);
  color: var(--accent-on-primary);
}

.project-picker-create-error {
  @apply mt-2 mb-0 text-xs leading-5;
  color: var(--status-danger);
}

.project-picker-current {
  @apply rounded-[1rem] border px-3 py-3;
  border-color: color-mix(in srgb, var(--accent-primary) 24%, var(--border-subtle));
  background: color-mix(in srgb, var(--accent-primary) 8%, var(--surface-base));
}

.project-picker-current-label,
.project-picker-section-title,
.project-picker-count {
  @apply text-[0.68rem] font-semibold uppercase tracking-[0.18em];
  color: var(--text-subtle);
}

.project-picker-current-title {
  @apply mt-2 block text-sm font-semibold;
  color: var(--text-default);
}

.project-picker-current-path {
  @apply mt-1 break-all text-xs leading-5;
  color: var(--text-muted);
}

.project-picker-search-icon {
  @apply h-4 w-4 shrink-0;
  color: var(--text-muted);
}

.project-picker-search-input {
  @apply min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none;
  color: var(--text-default);
}

.project-picker-search-input::placeholder {
  color: var(--text-subtle);
}

.project-picker-section {
  @apply flex min-h-0 flex-col gap-2;
}

.project-picker-section-head {
  @apply flex items-center justify-between gap-2 px-1;
}

.project-picker-list {
  @apply flex min-h-0 flex-col gap-2 overflow-y-auto pr-1;
}

.project-picker-card {
  @apply flex w-full items-start justify-between gap-3 rounded-[1rem] border px-3 py-3 text-left;
  border-color: var(--border-subtle);
  background: var(--surface-base);
}

.project-picker-card[data-selected='true'] {
  border-color: color-mix(in srgb, var(--accent-primary) 48%, var(--border-strong));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-primary) 18%, transparent);
}

.project-picker-card-main {
  @apply min-w-0 flex-1 text-left;
}

.project-picker-card-copy {
  @apply min-w-0 flex-1;
}

.project-picker-card-title {
  @apply block truncate text-sm font-semibold;
  color: var(--text-default);
}

.project-picker-card-path {
  @apply mt-1 break-all text-xs leading-5;
  color: var(--text-muted);
}

.project-picker-pin {
  @apply inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--surface-elevated) 88%, transparent);
}

.project-picker-pin-icon {
  @apply h-4 w-4;
}

.project-picker-pin-icon-active {
  color: var(--accent-primary);
}

.project-picker-empty {
  @apply rounded-[1rem] border border-dashed px-3 py-5 text-sm text-center;
  border-color: var(--border-subtle);
  color: var(--text-muted);
}
</style>

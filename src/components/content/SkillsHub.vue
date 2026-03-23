<template>
  <section class="skills-hub">
    <header class="skills-hub-hero">
      <div class="skills-hub-copy">
        <p class="skills-hub-eyebrow">{{ t('skills_hub_eyebrow') }}</p>
        <h2 class="skills-hub-title">{{ t('skills_hub_title') }}</h2>
        <p class="skills-hub-subtitle">{{ t('skills_hub_subtitle') }}</p>
      </div>
      <div class="skills-hub-meta">
        <span class="skills-hub-chip">{{ t('skills_hub_source_badge') }}</span>
        <span class="skills-hub-meta-copy">{{ t('skills_hub_live_meta') }}</span>
      </div>
    </header>

    <section class="skills-hub-toolbar">
      <label class="skills-hub-search-shell">
        <IconTablerSearch class="skills-hub-search-icon" />
        <input
          v-model="query"
          class="skills-hub-search-input"
          type="search"
          :placeholder="t('skills_hub_search_placeholder')"
          @keydown.enter.prevent="runSearch()"
        />
      </label>
      <UiButton variant="solid" @click="runSearch()">
        {{ t('skills_hub_search_action') }}
      </UiButton>
    </section>

    <section class="skills-hub-suggestions">
      <span class="skills-hub-suggestions-label">{{ t('skills_hub_try_label') }}</span>
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        class="skills-hub-suggestion"
        type="button"
        @click="applySuggestion(suggestion)"
      >
        {{ suggestion }}
      </button>
    </section>

    <div class="skills-hub-layout">
      <section class="skills-hub-results">
        <header class="skills-hub-results-header">
          <div>
            <h3 class="skills-hub-results-title">{{ t('skills_hub_results_title') }}</h3>
            <p class="skills-hub-results-meta">
              <template v-if="query.trim().length > 0">
                {{ t('skills_hub_results_for', { query: query.trim() }) }}
              </template>
              <template v-else>
                {{ t('skills_hub_results_idle') }}
              </template>
            </p>
          </div>
          <span v-if="results.length > 0" class="skills-hub-chip">{{ results.length }}</span>
        </header>

        <div v-if="isLoading" class="skills-hub-state">
          {{ t('skills_hub_loading') }}
        </div>
        <div v-else-if="errorMessage" class="skills-hub-state skills-hub-state-error">
          {{ errorMessage }}
        </div>
        <div v-else-if="query.trim().length === 0" class="skills-hub-state">
          {{ t('skills_hub_empty_idle') }}
        </div>
        <div v-else-if="results.length === 0" class="skills-hub-state">
          {{ t('skills_hub_empty_results') }}
        </div>
        <div v-else class="skills-hub-grid">
          <article
            v-for="skill in results"
            :key="skill.slug"
            class="skills-hub-card"
            :data-active="selectedSlug === skill.slug"
          >
            <button class="skills-hub-card-hit" type="button" @click="openSkill(skill.slug)">
              <div class="skills-hub-card-head">
                <div>
                  <h4 class="skills-hub-card-title">{{ skill.displayName || skill.slug }}</h4>
                  <p class="skills-hub-card-slug">{{ skill.slug }}</p>
                </div>
                <span class="skills-hub-card-score">{{ formatScore(skill.score) }}</span>
              </div>
              <p class="skills-hub-card-summary">
                {{ skill.summary || t('skills_hub_summary_missing') }}
              </p>
              <div class="skills-hub-card-meta">
                <span>{{ formatDate(skill.updatedAt) }}</span>
                <span v-if="skill.version">{{ skill.version }}</span>
              </div>
            </button>
          </article>
        </div>
      </section>

      <aside class="skills-hub-detail">
        <div v-if="isDetailLoading" class="skills-hub-state">
          {{ t('skills_hub_detail_loading') }}
        </div>
        <div v-else-if="detailError" class="skills-hub-state skills-hub-state-error">
          {{ detailError }}
        </div>
        <div v-else-if="!selectedDetail" class="skills-hub-state">
          {{ t('skills_hub_detail_idle') }}
        </div>
        <template v-else>
          <header class="skills-hub-detail-head">
            <div>
              <p class="skills-hub-detail-slug">{{ selectedDetail.skill.slug }}</p>
              <h3 class="skills-hub-detail-title">{{ selectedDetail.skill.displayName }}</h3>
            </div>
            <UiButton variant="surface" @click="downloadLatest()">
              {{ t('skills_hub_download_latest') }}
            </UiButton>
          </header>

          <p class="skills-hub-detail-summary">
            {{ selectedDetail.skill.summary || t('skills_hub_summary_missing') }}
          </p>

          <div class="skills-hub-detail-stats">
            <div class="skills-hub-stat">
              <span class="skills-hub-stat-label">{{ t('skills_hub_stat_downloads') }}</span>
              <strong class="skills-hub-stat-value">{{ formatNumber(selectedDetail.skill.stats.downloads) }}</strong>
            </div>
            <div class="skills-hub-stat">
              <span class="skills-hub-stat-label">{{ t('skills_hub_stat_installs') }}</span>
              <strong class="skills-hub-stat-value">{{ formatNumber(selectedDetail.skill.stats.installsCurrent) }}</strong>
            </div>
            <div class="skills-hub-stat">
              <span class="skills-hub-stat-label">{{ t('skills_hub_stat_versions') }}</span>
              <strong class="skills-hub-stat-value">{{ formatNumber(selectedDetail.skill.stats.versions) }}</strong>
            </div>
            <div class="skills-hub-stat">
              <span class="skills-hub-stat-label">{{ t('skills_hub_stat_updated') }}</span>
              <strong class="skills-hub-stat-value">{{ formatDate(selectedDetail.skill.updatedAt) }}</strong>
            </div>
          </div>

          <dl class="skills-hub-info-list">
            <div class="skills-hub-info-row">
              <dt>{{ t('skills_hub_owner_label') }}</dt>
              <dd>{{ ownerLabel }}</dd>
            </div>
            <div class="skills-hub-info-row">
              <dt>{{ t('skills_hub_latest_label') }}</dt>
              <dd>{{ selectedDetail.latestVersion?.version || t('diagnostics_none') }}</dd>
            </div>
            <div class="skills-hub-info-row">
              <dt>{{ t('skills_hub_tags_label') }}</dt>
              <dd>{{ tagSummary }}</dd>
            </div>
          </dl>

          <section v-if="selectedDetail.latestVersion?.changelog" class="skills-hub-section-card">
            <header class="skills-hub-section-head">
              <h4>{{ t('skills_hub_changelog_label') }}</h4>
            </header>
            <pre class="skills-hub-changelog">{{ selectedDetail.latestVersion.changelog.trim() }}</pre>
          </section>

          <section class="skills-hub-section-card">
            <header class="skills-hub-section-head">
              <h4>{{ t('skills_hub_versions_label') }}</h4>
            </header>
            <div v-if="versions.length === 0" class="skills-hub-state skills-hub-state-inline">
              {{ t('skills_hub_versions_empty') }}
            </div>
            <ul v-else class="skills-hub-version-list">
              <li v-for="version in versions" :key="`${selectedDetail.skill.slug}:${version.version}`" class="skills-hub-version-item">
                <div>
                  <strong>{{ version.version }}</strong>
                  <p>{{ formatDate(version.createdAt) }}</p>
                </div>
                <UiButton variant="ghost" size="sm" @click="downloadVersion(version.version)">
                  {{ t('skills_hub_download_version') }}
                </UiButton>
              </li>
            </ul>
          </section>
        </template>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getClawHubDownloadUrl, getClawHubSkillDetail, getClawHubSkillVersions, searchClawHubSkills } from '../../api/skillsHub'
import IconTablerSearch from '../icons/IconTablerSearch.vue'
import UiButton from '../ui/UiButton.vue'
import { useUiI18n } from '../../composables/useUiI18n'
import type { ClawHubSkillDetail, ClawHubSkillSearchResult, ClawHubSkillVersion } from '../../types/skillsHub'

const { t } = useUiI18n()

const query = ref('')
const results = ref<ClawHubSkillSearchResult[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const selectedSlug = ref('')
const selectedDetail = ref<ClawHubSkillDetail | null>(null)
const versions = ref<ClawHubSkillVersion[]>([])
const isDetailLoading = ref(false)
const detailError = ref('')

const suggestions = ['filesystem', 'docker', 'github', 'browser', 'postgres', 'slack']

const ownerLabel = computed(() => {
  const owner = selectedDetail.value?.owner
  if (!owner) return t('diagnostics_none')
  return owner.displayName || owner.handle || owner.userId
})

const tagSummary = computed(() => {
  const tags = selectedDetail.value?.skill.tags
  if (!tags) return t('diagnostics_none')
  const entries = Object.entries(tags)
  if (entries.length === 0) return t('diagnostics_none')
  return entries.map(([key, value]) => `${key}: ${value}`).join(' · ')
})

async function runSearch(nextQuery = query.value): Promise<void> {
  query.value = nextQuery
  const trimmed = nextQuery.trim()
  errorMessage.value = ''
  if (!trimmed) {
    results.value = []
    return
  }

  isLoading.value = true
  try {
    results.value = await searchClawHubSkills(trimmed)
    if (!selectedSlug.value && results.value.length > 0) {
      await openSkill(results.value[0].slug)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('skills_hub_load_failed')
  } finally {
    isLoading.value = false
  }
}

async function openSkill(slug: string): Promise<void> {
  selectedSlug.value = slug
  detailError.value = ''
  isDetailLoading.value = true
  try {
    const [detail, skillVersions] = await Promise.all([
      getClawHubSkillDetail(slug),
      getClawHubSkillVersions(slug),
    ])
    selectedDetail.value = detail
    versions.value = skillVersions
  } catch (error) {
    detailError.value = error instanceof Error ? error.message : t('skills_hub_detail_failed')
    selectedDetail.value = null
    versions.value = []
  } finally {
    isDetailLoading.value = false
  }
}

function applySuggestion(suggestion: string): void {
  void runSearch(suggestion)
}

async function downloadLatest(): Promise<void> {
  if (!selectedDetail.value) return
  const url = await getClawHubDownloadUrl(selectedDetail.value.skill.slug, { tag: 'latest' })
  openUrl(url)
}

async function downloadVersion(version: string): Promise<void> {
  if (!selectedDetail.value) return
  const url = await getClawHubDownloadUrl(selectedDetail.value.skill.slug, { version })
  openUrl(url)
}

function openUrl(url: string): void {
  if (typeof window === 'undefined') return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function formatDate(value: number): string {
  if (!Number.isFinite(value)) return t('diagnostics_none')
  return new Date(value).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return new Intl.NumberFormat().format(value)
}

function formatScore(value: number): string {
  if (!Number.isFinite(value)) return '0.0'
  return value.toFixed(1)
}
</script>

<style scoped>
@reference "tailwindcss";

.skills-hub {
  @apply flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-3 pb-6 pt-4 md:px-5;
}

.skills-hub-hero {
  @apply flex flex-col gap-3 rounded-[1.5rem] border px-4 py-4 md:flex-row md:items-end md:justify-between md:px-5;
  border-color: var(--border-subtle);
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent-primary) 16%, transparent), transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 96%, transparent), var(--surface-base));
  box-shadow: var(--shadow-soft);
}

.skills-hub-copy {
  @apply flex flex-col gap-2;
}

.skills-hub-eyebrow {
  @apply m-0 text-[0.7rem] font-semibold uppercase tracking-[0.22em];
  color: var(--accent-primary);
}

.skills-hub-title {
  @apply m-0 text-xl font-semibold tracking-[-0.02em] md:text-2xl;
  color: var(--text-default);
  font-family: var(--font-display);
}

.skills-hub-subtitle,
.skills-hub-meta-copy {
  @apply m-0 text-sm leading-6;
  color: var(--text-muted);
}

.skills-hub-meta {
  @apply flex flex-col items-start gap-2 md:items-end;
}

.skills-hub-chip {
  @apply inline-flex items-center rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em];
  color: var(--accent-on-primary);
  background: color-mix(in srgb, var(--accent-primary) 92%, black 8%);
}

.skills-hub-toolbar {
  @apply flex flex-col gap-3 md:flex-row;
}

.skills-hub-search-shell {
  @apply flex min-h-12 flex-1 items-center gap-3 rounded-[1.1rem] border px-4;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
}

.skills-hub-search-shell:focus-within {
  border-color: color-mix(in srgb, var(--accent-primary) 48%, var(--border-strong));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 14%, transparent);
}

.skills-hub-search-icon {
  @apply h-5 w-5 shrink-0;
  color: var(--text-muted);
}

.skills-hub-search-input {
  @apply min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none;
  color: var(--text-default);
}

.skills-hub-search-input::placeholder {
  color: var(--text-subtle);
}

.skills-hub-suggestions {
  @apply flex flex-wrap items-center gap-2;
}

.skills-hub-suggestions-label {
  @apply text-xs font-medium uppercase tracking-[0.18em];
  color: var(--text-subtle);
}

.skills-hub-suggestion {
  @apply rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-muted);
}

.skills-hub-suggestion:hover {
  background: var(--surface-hover);
  color: var(--text-default);
}

.skills-hub-layout {
  @apply grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)];
}

.skills-hub-results,
.skills-hub-detail,
.skills-hub-section-card {
  @apply rounded-[1.35rem] border;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-soft);
}

.skills-hub-results,
.skills-hub-detail {
  @apply min-h-0 p-4 md:p-5;
}

.skills-hub-results-header,
.skills-hub-detail-head,
.skills-hub-section-head {
  @apply flex items-start justify-between gap-3;
}

.skills-hub-results-title,
.skills-hub-detail-title,
.skills-hub-section-head h4 {
  @apply m-0 text-base font-semibold;
  color: var(--text-default);
}

.skills-hub-results-meta,
.skills-hub-detail-slug {
  @apply m-0 text-xs uppercase tracking-[0.16em];
  color: var(--text-subtle);
}

.skills-hub-grid {
  @apply mt-4 grid gap-3;
}

.skills-hub-card {
  @apply rounded-[1.1rem] border transition-colors duration-200;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-base) 86%, transparent);
}

.skills-hub-card[data-active='true'] {
  border-color: color-mix(in srgb, var(--accent-primary) 54%, var(--border-strong));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-primary) 22%, transparent);
}

.skills-hub-card-hit {
  @apply flex w-full flex-col gap-3 rounded-[1.1rem] px-4 py-4 text-left;
}

.skills-hub-card-head {
  @apply flex items-start justify-between gap-3;
}

.skills-hub-card-title {
  @apply m-0 text-sm font-semibold;
  color: var(--text-default);
}

.skills-hub-card-slug,
.skills-hub-card-meta,
.skills-hub-card-score {
  @apply text-xs;
  color: var(--text-subtle);
}

.skills-hub-card-summary,
.skills-hub-detail-summary {
  @apply m-0 text-sm leading-6;
  color: var(--text-muted);
}

.skills-hub-card-meta {
  @apply flex flex-wrap gap-3;
}

.skills-hub-state {
  @apply flex min-h-40 items-center justify-center rounded-[1rem] border border-dashed px-4 text-center text-sm;
  border-color: color-mix(in srgb, var(--border-subtle) 90%, transparent);
  color: var(--text-muted);
  background: color-mix(in srgb, var(--surface-base) 88%, transparent);
}

.skills-hub-state-error {
  color: var(--status-danger);
}

.skills-hub-state-inline {
  @apply min-h-0 justify-start border-0 bg-transparent px-0 py-0 text-left;
}

.skills-hub-detail {
  @apply flex flex-col gap-4;
}

.skills-hub-detail-stats {
  @apply grid grid-cols-2 gap-3;
}

.skills-hub-stat {
  @apply rounded-[1rem] border px-3 py-3;
  border-color: color-mix(in srgb, var(--border-subtle) 86%, transparent);
  background: color-mix(in srgb, var(--surface-base) 88%, transparent);
}

.skills-hub-stat-label {
  @apply block text-[0.68rem] font-semibold uppercase tracking-[0.16em];
  color: var(--text-subtle);
}

.skills-hub-stat-value {
  @apply mt-2 block text-sm font-semibold;
  color: var(--text-default);
}

.skills-hub-info-list {
  @apply flex flex-col gap-2;
}

.skills-hub-info-row {
  @apply flex flex-col gap-1 rounded-[0.95rem] border px-3 py-3 md:flex-row md:items-center md:justify-between;
  border-color: color-mix(in srgb, var(--border-subtle) 86%, transparent);
  background: color-mix(in srgb, var(--surface-base) 88%, transparent);
}

.skills-hub-info-row dt {
  @apply text-[0.68rem] font-semibold uppercase tracking-[0.16em];
  color: var(--text-subtle);
}

.skills-hub-info-row dd {
  @apply m-0 text-sm;
  color: var(--text-default);
}

.skills-hub-section-card {
  @apply p-4;
}

.skills-hub-changelog {
  @apply m-0 mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-[1rem] border px-3 py-3 text-xs leading-6;
  border-color: color-mix(in srgb, var(--border-subtle) 86%, transparent);
  background: color-mix(in srgb, var(--surface-base) 88%, transparent);
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.skills-hub-version-list {
  @apply mt-3 flex list-none flex-col gap-2 p-0;
}

.skills-hub-version-item {
  @apply flex items-center justify-between gap-3 rounded-[1rem] border px-3 py-3;
  border-color: color-mix(in srgb, var(--border-subtle) 86%, transparent);
  background: color-mix(in srgb, var(--surface-base) 88%, transparent);
}

.skills-hub-version-item p {
  @apply m-1 text-xs;
  color: var(--text-subtle);
}

@media (max-width: 960px) {
  .skills-hub {
    @apply px-2 pb-5 pt-3;
  }

  .skills-hub-detail-stats {
    @apply grid-cols-1;
  }
}
</style>

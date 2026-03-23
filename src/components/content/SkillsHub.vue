<template>
  <section class="skills-hub">
    <header class="skills-hub-header">
      <div class="skills-hub-copy">
        <p class="skills-hub-eyebrow">{{ t('skills_hub_eyebrow') }}</p>
        <h2 class="skills-hub-title">{{ t('skills_hub_title') }}</h2>
      </div>
      <span class="skills-hub-chip">{{ t('skills_hub_source_badge') }}</span>
    </header>

    <section class="skills-hub-toolbar">
      <div class="skills-hub-source-picker">
        <span class="skills-hub-source-label">{{ t('skills_hub_source_label') }}</span>
        <UiSelect
          :model-value="sourceMode"
          :options="sourceOptions"
          @update:model-value="onSourceModeChange"
        />
      </div>
      <label class="skills-hub-search-shell">
        <IconTablerSearch class="skills-hub-search-icon" />
        <input
          v-model="query"
          class="skills-hub-search-input"
          type="search"
          :placeholder="sourceMode === 'github' ? t('skills_hub_github_search_placeholder') : t('skills_hub_search_placeholder')"
          @keydown.enter.prevent="runSearch()"
        />
      </label>
      <UiButton variant="solid" @click="runSearch()">
        {{ t('skills_hub_search_action') }}
      </UiButton>
      <UiButton
        v-if="isCompactViewport"
        variant="surface"
        class="skills-hub-installed-trigger"
        @click="isInstalledPanelOpen = !isInstalledPanelOpen"
      >
        {{ t('skills_hub_manage_installed') }}
        <span v-if="installedSkills.length > 0" class="skills-hub-installed-trigger-count">{{ installedSkills.length }}</span>
      </UiButton>
    </section>

    <section v-if="sourceMode === 'clawhub'" class="skills-hub-suggestions">
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

    <section v-if="sourceMode === 'github'" class="skills-hub-sync">
      <div class="skills-hub-sync-copy">
        <strong>{{ t('skills_hub_github_sync_title') }}</strong>
        <p>
          {{ githubSyncStatus.loggedIn
            ? t('skills_hub_github_connected_as', { username: githubSyncStatus.githubUsername || diagnosticsNone })
            : t('skills_hub_github_sync_description') }}
        </p>
      </div>
      <div class="skills-hub-sync-actions">
        <UiButton v-if="!githubSyncStatus.loggedIn" variant="surface" :disabled="githubAuthPending" @click="startGithubDeviceFlow">
          {{ githubAuthPending ? t('skills_hub_github_device_login_pending') : t('skills_hub_github_device_login') }}
        </UiButton>
        <UiButton v-else variant="ghost" :disabled="githubAuthPending" @click="logoutGitHub">
          {{ t('skills_hub_github_logout') }}
        </UiButton>
        <UiButton variant="ghost" :disabled="githubLoading || githubAuthPending" @click="refreshGitHubSource()">
          {{ githubLoading ? t('skills_hub_github_refresh_pending') : t('skills_hub_github_refresh') }}
        </UiButton>
      </div>
      <div v-if="githubDeviceLogin" class="skills-hub-github-device">
        <span>{{ t('skills_hub_github_device_code') }}</span>
        <code>{{ githubDeviceLogin.user_code }}</code>
        <button type="button" class="skills-hub-github-link" @click="openUrl(githubDeviceLogin.verification_uri)">
          {{ t('skills_hub_github_device_open') }}
        </button>
      </div>
      <p v-if="githubStatusMessage" class="workflow-status-message">{{ githubStatusMessage }}</p>
    </section>

    <section class="skills-hub-results">
      <header class="skills-hub-results-header">
        <div>
          <h3 class="skills-hub-results-title">{{ t('skills_hub_results_title') }}</h3>
          <p class="skills-hub-results-meta">
            <template v-if="sourceMode === 'clawhub' && query.trim().length > 0">
              {{ t('skills_hub_results_for', { query: query.trim() }) }}
            </template>
            <template v-else-if="sourceMode === 'github'">
              {{ t('skills_hub_github_results_idle') }}
            </template>
            <template v-else>
              {{ t('skills_hub_results_idle') }}
            </template>
          </p>
        </div>
        <span v-if="visibleResultCount > 0" class="skills-hub-chip">{{ visibleResultCount }}</span>
      </header>

      <div v-if="sourceMode === 'github' && githubLoading" class="skills-hub-state">
        {{ t('skills_hub_github_loading') }}
      </div>
      <div v-else-if="sourceMode === 'github' && githubError" class="skills-hub-state skills-hub-state-error">
        {{ githubError }}
      </div>
      <div v-else-if="sourceMode === 'github' && githubResults.length === 0" class="skills-hub-state">
        {{ t('skills_hub_github_empty') }}
      </div>
      <div v-else-if="sourceMode === 'clawhub' && isLoading" class="skills-hub-state">
        {{ t('skills_hub_loading') }}
      </div>
      <div v-else-if="sourceMode === 'clawhub' && errorMessage" class="skills-hub-state skills-hub-state-error">
        {{ errorMessage }}
      </div>
      <div v-else-if="sourceMode === 'clawhub' && query.trim().length === 0" class="skills-hub-state">
        {{ t('skills_hub_empty_idle') }}
      </div>
      <div v-else-if="sourceMode === 'clawhub' && results.length === 0" class="skills-hub-state">
        {{ t('skills_hub_empty_results') }}
      </div>
      <div v-else class="skills-hub-grid">
        <article
          v-for="skill in displayedSkills"
          :key="skill.key"
          class="skills-hub-card"
        >
          <button class="skills-hub-card-hit" type="button" @click="skill.open">
            <div class="skills-hub-card-head">
              <div class="min-w-0">
                <h4 class="skills-hub-card-title">{{ skill.title }}</h4>
                <p class="skills-hub-card-slug">{{ skill.slug }}</p>
              </div>
              <span class="skills-hub-card-score">{{ skill.meta }}</span>
            </div>
            <p class="skills-hub-card-summary">{{ skill.summary }}</p>
          </button>
          <div class="skills-hub-card-actions">
            <UiButton size="sm" variant="surface" @click="skill.open">
              {{ t('skills_hub_view_details') }}
            </UiButton>
            <UiButton
              v-if="!skill.installed"
              size="sm"
              variant="solid"
              :disabled="skill.pending"
              @click="skill.install"
            >
              {{ skill.pending ? t('skills_hub_install_pending') : t('skills_hub_install_action') }}
            </UiButton>
            <UiButton v-else size="sm" variant="ghost" disabled>
              {{ t('skills_hub_installed_state') }}
            </UiButton>
          </div>
        </article>
      </div>
    </section>

    <section
      v-if="installedSkills.length > 0 && (!isCompactViewport || isInstalledPanelOpen)"
      class="skills-hub-installed-panel"
    >
      <header class="skills-hub-results-header">
        <div>
          <h3 class="skills-hub-results-title">{{ t('skills_hub_installed_label') }}</h3>
          <p class="skills-hub-results-meta">{{ t('skills_hub_manage_installed') }}</p>
        </div>
        <span class="skills-hub-chip">{{ installedSkills.length }}</span>
      </header>
      <ul class="skills-hub-installed-list">
        <li v-for="skill in installedSkills" :key="skill.path" class="skills-hub-installed-item">
          <div>
            <strong>{{ skill.name }}</strong>
            <p>{{ skill.shortDescription || skill.description || skill.path }}</p>
          </div>
          <div class="skills-hub-installed-actions">
            <UiButton size="sm" variant="ghost" :disabled="busyInstalledSkillPath === skill.path" @click="toggleInstalledSkill(skill)">
              {{ busyInstalledSkillPath === skill.path ? t('skills_hub_toggle_pending') : (skill.enabled ? t('skills_hub_disable_action') : t('skills_hub_enable_action')) }}
            </UiButton>
            <UiButton size="sm" variant="ghost" :disabled="busyInstalledSkillPath === skill.path" @click="removeInstalledSkill(skill)">
              {{ busyInstalledSkillPath === skill.path ? t('skills_hub_uninstall_pending') : t('skills_hub_uninstall_action') }}
            </UiButton>
          </div>
        </li>
      </ul>
    </section>

    <DialogRoot :open="isDetailDialogOpen" @update:open="onDetailDialogChange">
      <DialogPortal>
        <DialogOverlay class="skills-hub-dialog-backdrop" />
        <DialogContent class="skills-hub-dialog">
          <header class="skills-hub-dialog-head">
            <div>
              <p class="skills-hub-detail-slug">{{ detailDialogSlug }}</p>
              <DialogTitle class="skills-hub-detail-title">{{ detailDialogTitle }}</DialogTitle>
            </div>
            <DialogClose as-child>
              <UiButton size="icon" variant="surface" :aria-label="t('skills_hub_detail_sheet_close')">
                <IconTablerX class="skills-hub-dialog-close-icon" />
              </UiButton>
            </DialogClose>
          </header>

          <div class="skills-hub-dialog-body">
            <div v-if="isDetailLoading" class="skills-hub-state">
              {{ t('skills_hub_detail_loading') }}
            </div>
            <div v-else-if="detailError" class="skills-hub-state skills-hub-state-error">
              {{ detailError }}
            </div>
            <section v-else-if="sourceMode === 'github' && selectedGitHubSkill" class="skills-hub-detail-card">
              <div class="skills-hub-detail-actions">
                <UiButton variant="surface" @click="openUrl(selectedGitHubSkill.url)">
                  {{ t('skills_hub_github_open_repo') }}
                </UiButton>
                <UiButton
                  v-if="!selectedGitHubSkill.installed"
                  variant="solid"
                  :disabled="installingGitHubSkillKey === `${selectedGitHubSkill.owner}/${selectedGitHubSkill.name}`"
                  @click="installGitHubSkillCard(selectedGitHubSkill)"
                >
                  {{ installingGitHubSkillKey === `${selectedGitHubSkill.owner}/${selectedGitHubSkill.name}` ? t('skills_hub_install_pending') : t('skills_hub_install_action') }}
                </UiButton>
                <UiButton v-else variant="ghost" disabled>
                  {{ t('skills_hub_installed_state') }}
                </UiButton>
              </div>
              <p class="skills-hub-detail-summary">{{ githubSkillSummary(selectedGitHubSkill) }}</p>
              <dl class="skills-hub-info-list">
                <div class="skills-hub-info-row">
                  <dt>{{ t('skills_hub_owner_label') }}</dt>
                  <dd>{{ selectedGitHubSkill.owner }}</dd>
                </div>
              </dl>
              <div v-if="githubReadme.trim().length > 0" class="skills-hub-github-readme">
                <pre>{{ githubReadme }}</pre>
              </div>
            </section>
            <div v-else-if="sourceMode === 'github'" class="skills-hub-state">
              {{ t('skills_hub_github_detail_idle') }}
            </div>
            <template v-else-if="selectedDetail">
              <section class="skills-hub-detail-card">
                <div class="skills-hub-detail-actions">
                  <UiButton variant="surface" @click="downloadLatest()">
                    {{ t('skills_hub_download_latest') }}
                  </UiButton>
                  <UiButton v-if="selectedInstalledSkill" variant="ghost" :disabled="busyInstalledSkillPath === selectedInstalledSkill.path" @click="toggleInstalledSkill(selectedInstalledSkill)">
                    {{ busyInstalledSkillPath === selectedInstalledSkill.path ? t('skills_hub_toggle_pending') : (selectedInstalledSkill.enabled ? t('skills_hub_disable_action') : t('skills_hub_enable_action')) }}
                  </UiButton>
                  <UiButton v-else variant="solid" :disabled="installingClawHubSlug === selectedDetail.skill.slug" @click="installLatest()">
                    {{ installingClawHubSlug === selectedDetail.skill.slug ? t('skills_hub_install_pending') : t('skills_hub_install_action') }}
                  </UiButton>
                </div>
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
              </section>
            </template>
            <div v-else class="skills-hub-state">
              {{ t('skills_hub_detail_idle') }}
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'radix-vue'
import {
  completeGitHubDeviceLogin,
  getClawHubDownloadUrl,
  getClawHubSkillDetail,
  getClawHubSkillVersions,
  getGitHubHubSkillReadme,
  getGitHubSkillsSyncStatus,
  getInstalledSkills,
  installClawHubSkill,
  installGitHubHubSkill,
  logoutGitHubSkillsSync,
  searchClawHubSkills,
  searchGitHubHubSkills,
  setInstalledSkillEnabled,
  startGitHubDeviceLogin,
  uninstallSkill,
} from '../../api/skillsHub'
import { useUiI18n } from '../../composables/useUiI18n'
import type {
  ClawHubSkillDetail,
  ClawHubSkillSearchResult,
  ClawHubSkillVersion,
  GitHubHubSkill,
  GitHubSkillsSyncStatus,
  InstalledSkill,
} from '../../types/skillsHub'
import IconTablerSearch from '../icons/IconTablerSearch.vue'
import IconTablerX from '../icons/IconTablerX.vue'
import UiButton from '../ui/UiButton.vue'
import UiSelect from '../ui/UiSelect.vue'

const { t } = useUiI18n()
const diagnosticsNone = computed(() => t('diagnostics_none'))

const query = ref('')
const results = ref<ClawHubSkillSearchResult[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const selectedSlug = ref('')
const selectedDetail = ref<ClawHubSkillDetail | null>(null)
const versions = ref<ClawHubSkillVersion[]>([])
const isDetailLoading = ref(false)
const detailError = ref('')
const installedSkills = ref<InstalledSkill[]>([])
const sourceMode = ref<'clawhub' | 'github'>('clawhub')
const githubResults = ref<GitHubHubSkill[]>([])
const githubLoading = ref(false)
const githubError = ref('')
const githubStatusMessage = ref('')
const githubDeviceLogin = ref<{ device_code: string; user_code: string; verification_uri: string; interval?: number } | null>(null)
const selectedGitHubSkill = ref<GitHubHubSkill | null>(null)
const githubReadme = ref('')
const isCompactViewport = ref(false)
const isInstalledPanelOpen = ref(false)
const isDetailDialogOpen = ref(false)
const githubAuthPending = ref(false)
const installingGitHubSkillKey = ref('')
const installingClawHubSlug = ref('')
const busyInstalledSkillPath = ref('')
const githubSyncStatus = ref<GitHubSkillsSyncStatus>({
  loggedIn: false,
  githubUsername: '',
  repoOwner: '',
  repoName: '',
  configured: false,
  startup: {
    inProgress: false,
    mode: 'idle',
    branch: 'main',
    lastAction: 'idle',
    lastRunAtIso: '',
    lastSuccessAtIso: '',
    lastError: '',
  },
})

const suggestions = ['filesystem', 'docker', 'github', 'browser', 'postgres', 'slack']
const sourceOptions = computed(() => [
  { value: 'clawhub', label: t('skills_hub_source_clawhub') },
  { value: 'github', label: t('skills_hub_source_github') },
])

const ownerLabel = computed(() => {
  const owner = selectedDetail.value?.owner
  if (!owner) return t('diagnostics_none')
  return owner.displayName || owner.handle || owner.userId
})

const selectedInstalledSkill = computed(() =>
  installedSkills.value.find((skill) => skill.name === selectedSlug.value) ?? null,
)

const installedClawHubSlugs = computed(() =>
  new Set(
    installedSkills.value.flatMap((skill) => {
      const skillPath = skill.path.replace(/\\/gu, '/')
      const match = /\/skills\/([^/]+)\/SKILL\.md$/u.exec(skillPath)
      if (match?.[1]) return [match[1]]
      if (skill.name) return [skill.name]
      return []
    }),
  ),
)

const tagSummary = computed(() => {
  const tags = selectedDetail.value?.skill.tags
  if (!tags) return t('diagnostics_none')
  const entries = Object.entries(tags)
  if (entries.length === 0) return t('diagnostics_none')
  return entries.map(([key, value]) => `${key}: ${value}`).join(' · ')
})

const detailDialogTitle = computed(() => {
  if (sourceMode.value === 'github' && selectedGitHubSkill.value) {
    return selectedGitHubSkill.value.displayName || selectedGitHubSkill.value.name
  }
  if (selectedDetail.value) {
    return selectedDetail.value.skill.displayName
  }
  return t('skills_hub_detail_idle')
})

const detailDialogSlug = computed(() => {
  if (sourceMode.value === 'github' && selectedGitHubSkill.value) {
    return `${selectedGitHubSkill.value.owner}/${selectedGitHubSkill.value.name}`
  }
  if (selectedDetail.value) {
    return selectedDetail.value.skill.slug
  }
  return t('skills_hub_detail_sheet_title')
})

const displayedSkills = computed(() => {
  if (sourceMode.value === 'github') {
    return githubResults.value.map((skill) => ({
      key: `${skill.owner}/${skill.name}`,
      title: skill.displayName || skill.name,
      slug: `${skill.owner}/${skill.name}`,
      summary: githubSkillSummary(skill),
      meta: formatDate(skill.publishedAt),
      installed: skill.installed,
      pending: installingGitHubSkillKey.value === `${skill.owner}/${skill.name}`,
      open: () => { void selectGitHubSkill(skill) },
      install: () => { void installGitHubSkillCard(skill) },
    }))
  }
  return results.value.map((skill) => ({
    key: skill.slug,
    title: skill.displayName || skill.slug,
    slug: skill.slug,
    summary: skill.summary || t('skills_hub_summary_missing'),
    meta: formatScore(skill.score),
    installed: installedClawHubSlugs.value.has(skill.slug),
    pending: installingClawHubSlug.value === skill.slug,
    open: () => { void openSkill(skill.slug) },
    install: () => { void installFromCard(skill.slug) },
  }))
})

const visibleResultCount = computed(() => displayedSkills.value.length)

async function runSearch(nextQuery = query.value): Promise<void> {
  query.value = nextQuery
  if (sourceMode.value === 'github') {
    await refreshGitHubSource()
    return
  }
  const trimmed = nextQuery.trim()
  errorMessage.value = ''
  if (!trimmed) {
    results.value = []
    return
  }
  isLoading.value = true
  try {
    results.value = await searchClawHubSkills(trimmed)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('skills_hub_load_failed')
  } finally {
    isLoading.value = false
  }
}

async function refreshInstalledSkills(): Promise<void> {
  installedSkills.value = await getInstalledSkills()
  const installedKeys = new Set(installedSkills.value.map((skill) => skill.name))
  githubResults.value = githubResults.value.map((skill) => ({
    ...skill,
    installed: installedKeys.has(skill.name),
  }))
  if (selectedGitHubSkill.value) {
    selectedGitHubSkill.value = {
      ...selectedGitHubSkill.value,
      installed: installedKeys.has(selectedGitHubSkill.value.name),
    }
  }
}

async function openSkill(slug: string): Promise<void> {
  if (sourceMode.value !== 'clawhub') return
  selectedSlug.value = slug
  isDetailDialogOpen.value = true
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

function onSourceModeChange(value: string): void {
  sourceMode.value = value === 'github' ? 'github' : 'clawhub'
  githubStatusMessage.value = ''
  selectedSlug.value = ''
  selectedDetail.value = null
  selectedGitHubSkill.value = null
  detailError.value = ''
  versions.value = []
  isDetailDialogOpen.value = false
  if (sourceMode.value === 'github') {
    query.value = ''
    githubReadme.value = ''
    void refreshGitHubSource()
  }
}

async function downloadLatest(): Promise<void> {
  if (!selectedDetail.value) return
  const url = await getClawHubDownloadUrl(selectedDetail.value.skill.slug, { tag: 'latest' })
  openUrl(url)
}

async function installLatest(): Promise<void> {
  if (!selectedDetail.value) return
  installingClawHubSlug.value = selectedDetail.value.skill.slug
  try {
    await installClawHubSkill(selectedDetail.value.skill.slug, {
      version: selectedDetail.value.latestVersion?.version,
    })
    await refreshInstalledSkills()
    await openSkill(selectedDetail.value.skill.slug)
  } finally {
    installingClawHubSlug.value = ''
  }
}

async function installFromCard(slug: string): Promise<void> {
  await openSkill(slug)
  if (selectedDetail.value?.skill.slug === slug) {
    await installLatest()
  }
}

async function installGitHubSkillCard(skill: GitHubHubSkill): Promise<void> {
  githubStatusMessage.value = ''
  installingGitHubSkillKey.value = `${skill.owner}/${skill.name}`
  try {
    await installGitHubHubSkill(skill.owner, skill.name)
    githubStatusMessage.value = t('skills_hub_github_install_success')
    await refreshInstalledSkills()
    await refreshGitHubSource()
    if (selectedGitHubSkill.value?.owner === skill.owner && selectedGitHubSkill.value?.name === skill.name) {
      selectedGitHubSkill.value = { ...skill, installed: true }
    }
    isDetailDialogOpen.value = true
  } catch (error) {
    githubStatusMessage.value = error instanceof Error ? error.message : t('skills_hub_github_install_failed')
  } finally {
    installingGitHubSkillKey.value = ''
  }
}

async function selectGitHubSkill(skill: GitHubHubSkill): Promise<void> {
  selectedGitHubSkill.value = skill
  isDetailDialogOpen.value = true
  detailError.value = ''
  isDetailLoading.value = true
  githubReadme.value = ''
  try {
    githubReadme.value = await getGitHubHubSkillReadme(skill.owner, skill.name)
  } catch {
    githubReadme.value = ''
  } finally {
    isDetailLoading.value = false
  }
}

async function loadGitHubSyncStatus(): Promise<void> {
  try {
    githubSyncStatus.value = await getGitHubSkillsSyncStatus()
  } catch {
    // best effort
  }
}

async function refreshGitHubSource(): Promise<void> {
  if (sourceMode.value !== 'github') return
  githubLoading.value = true
  githubError.value = ''
  try {
    await loadGitHubSyncStatus()
    githubResults.value = await searchGitHubHubSkills(query.value)
    if (selectedGitHubSkill.value) {
      selectedGitHubSkill.value =
        githubResults.value.find((item) => item.owner === selectedGitHubSkill.value?.owner && item.name === selectedGitHubSkill.value?.name)
        ?? selectedGitHubSkill.value
    }
  } catch (error) {
    githubError.value = error instanceof Error ? error.message : t('skills_hub_github_install_failed')
  } finally {
    githubLoading.value = false
  }
}

async function startGithubDeviceFlow(): Promise<void> {
  githubStatusMessage.value = ''
  githubAuthPending.value = true
  try {
    const payload = await startGitHubDeviceLogin()
    githubDeviceLogin.value = payload
    const waitMs = Math.max((payload.interval ?? 5) * 1000, 3000)
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      const result = await completeGitHubDeviceLogin(payload.device_code)
      if (result.ok) {
        githubDeviceLogin.value = null
        githubStatusMessage.value = t('skills_hub_github_install_success')
        await loadGitHubSyncStatus()
        return
      }
      if (!result.pending) {
        throw new Error(result.error || 'GitHub login failed')
      }
    }
    throw new Error('GitHub login timed out')
  } catch (error) {
    githubStatusMessage.value = error instanceof Error ? error.message : 'GitHub login failed'
  } finally {
    githubAuthPending.value = false
  }
}

async function logoutGitHub(): Promise<void> {
  githubStatusMessage.value = ''
  githubAuthPending.value = true
  try {
    await logoutGitHubSkillsSync()
    githubDeviceLogin.value = null
    await loadGitHubSyncStatus()
  } catch (error) {
    githubStatusMessage.value = error instanceof Error ? error.message : 'GitHub logout failed'
  } finally {
    githubAuthPending.value = false
  }
}

async function downloadVersion(version: string): Promise<void> {
  if (!selectedDetail.value) return
  const url = await getClawHubDownloadUrl(selectedDetail.value.skill.slug, { version })
  openUrl(url)
}

async function toggleInstalledSkill(skill: InstalledSkill): Promise<void> {
  busyInstalledSkillPath.value = skill.path
  try {
    await setInstalledSkillEnabled(skill.path, !skill.enabled)
    await refreshInstalledSkills()
  } finally {
    busyInstalledSkillPath.value = ''
  }
}

async function removeInstalledSkill(skill: InstalledSkill): Promise<void> {
  busyInstalledSkillPath.value = skill.path
  try {
    await uninstallSkill(skill.path)
    await refreshInstalledSkills()
  } finally {
    busyInstalledSkillPath.value = ''
  }
}

function updateCompactViewport(): void {
  if (typeof window === 'undefined') return
  isCompactViewport.value = window.innerWidth <= 960
  if (!isCompactViewport.value) {
    isInstalledPanelOpen.value = true
  }
}

function onDetailDialogChange(open: boolean): void {
  isDetailDialogOpen.value = open
}

function openUrl(url: string): void {
  if (typeof window === 'undefined') return
  window.location.assign(`anyclaw://external/open?url=${encodeURIComponent(url)}`)
}

function githubSkillSummary(skill: GitHubHubSkill): string {
  const summary = skill.description.trim()
  if (!summary) return t('skills_hub_summary_missing')
  const displayName = (skill.displayName || skill.name).trim().toLowerCase()
  if (summary.toLowerCase() === displayName) {
    return t('skills_hub_summary_missing')
  }
  return summary
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

onMounted(() => {
  updateCompactViewport()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateCompactViewport)
  }
  void refreshInstalledSkills()
  void loadGitHubSyncStatus()
  void runSearch('filesystem')
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateCompactViewport)
  }
})
</script>

<style scoped>
@reference "tailwindcss";

.skills-hub {
  @apply flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-3 pb-6 pt-4 md:px-5;
}

.skills-hub-header,
.skills-hub-results,
.skills-hub-sync,
.skills-hub-installed-panel,
.skills-hub-section-card,
.skills-hub-detail-card {
  @apply rounded-[1.25rem] border;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-soft);
}

.skills-hub-header,
.skills-hub-results,
.skills-hub-sync,
.skills-hub-installed-panel,
.skills-hub-detail-card {
  @apply p-4 md:p-5;
}

.skills-hub-header {
  @apply flex items-end justify-between gap-3;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent 30%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 97%, transparent), var(--surface-base));
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

.skills-hub-chip {
  @apply inline-flex items-center rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em];
  color: var(--accent-on-primary);
  background: color-mix(in srgb, var(--accent-primary) 92%, black 8%);
}

.skills-hub-toolbar {
  @apply flex flex-col gap-3 md:flex-row;
}

.skills-hub-source-picker {
  @apply flex min-w-0 flex-col gap-2 md:w-52;
}

.skills-hub-source-label,
.skills-hub-suggestions-label {
  @apply text-xs font-medium uppercase tracking-[0.18em];
  color: var(--text-subtle);
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

.skills-hub-installed-trigger-count {
  @apply inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.68rem];
  background: color-mix(in srgb, var(--accent-primary) 82%, transparent);
  color: var(--accent-on-primary);
}

.skills-hub-suggestions {
  @apply flex flex-wrap items-center gap-2;
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

.skills-hub-sync {
  @apply flex flex-col gap-3;
}

.skills-hub-sync-copy p,
.skills-hub-github-device,
.skills-hub-results-meta,
.skills-hub-detail-slug,
.skills-hub-card-slug,
.skills-hub-card-meta,
.skills-hub-card-score {
  @apply m-0 text-xs;
  color: var(--text-subtle);
}

.skills-hub-sync-actions,
.skills-hub-github-device,
.skills-hub-detail-actions,
.skills-hub-installed-actions,
.skills-hub-card-actions {
  @apply flex flex-wrap items-center gap-2;
}

.skills-hub-github-link {
  @apply border-0 bg-transparent p-0 text-sm;
  color: var(--accent-primary);
}

.skills-hub-results-header,
.skills-hub-section-head {
  @apply flex items-start justify-between gap-3;
}

.skills-hub-results-title,
.skills-hub-detail-title,
.skills-hub-section-head h4 {
  @apply m-0 text-base font-semibold;
  color: var(--text-default);
}

.skills-hub-grid {
  @apply mt-4 grid gap-3;
}

.skills-hub-card {
  @apply min-w-0 overflow-hidden rounded-[1.1rem] border;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-base) 86%, transparent);
}

.skills-hub-card-hit {
  @apply flex w-full min-w-0 flex-col gap-3 px-4 py-4 text-left;
}

.skills-hub-card-head {
  @apply flex min-w-0 items-start justify-between gap-3;
}

.skills-hub-card-title {
  @apply m-0 break-words text-sm font-semibold;
  color: var(--text-default);
}

.skills-hub-card-summary,
.skills-hub-detail-summary {
  @apply m-0 break-words text-sm leading-6;
  color: var(--text-muted);
}

.skills-hub-card-actions {
  @apply border-t px-4 pb-4;
  border-color: color-mix(in srgb, var(--border-subtle) 88%, transparent);
}

.skills-hub-installed-list,
.skills-hub-version-list {
  @apply mt-4 flex flex-col gap-3;
}

.skills-hub-installed-item,
.skills-hub-version-item {
  @apply flex flex-col gap-3 rounded-[1rem] border px-3 py-3 md:flex-row md:items-start md:justify-between;
  border-color: color-mix(in srgb, var(--border-subtle) 88%, transparent);
  background: color-mix(in srgb, var(--surface-base) 86%, transparent);
}

.skills-hub-installed-item p,
.skills-hub-version-item p {
  @apply m-0 text-sm leading-6;
  color: var(--text-muted);
}

.skills-hub-state {
  @apply mt-4 rounded-[1.1rem] border border-dashed px-4 py-5 text-sm leading-6;
  border-color: color-mix(in srgb, var(--border-subtle) 80%, transparent);
  color: var(--text-muted);
}

.skills-hub-state-inline {
  @apply mt-0;
}

.skills-hub-state-error {
  border-color: color-mix(in srgb, var(--accent-danger) 40%, var(--border-subtle));
  color: var(--accent-danger);
}

.skills-hub-detail-card {
  @apply flex flex-col gap-4;
}

.skills-hub-detail-stats {
  @apply grid gap-3 sm:grid-cols-2;
}

.skills-hub-stat {
  @apply rounded-[1rem] border px-3 py-3;
  border-color: color-mix(in srgb, var(--border-subtle) 88%, transparent);
  background: color-mix(in srgb, var(--surface-base) 86%, transparent);
}

.skills-hub-stat-label {
  @apply text-[0.68rem] font-semibold uppercase tracking-[0.18em];
  color: var(--text-subtle);
}

.skills-hub-stat-value {
  @apply mt-2 block text-base font-semibold;
  color: var(--text-default);
}

.skills-hub-info-list {
  @apply grid gap-2;
}

.skills-hub-info-row {
  @apply flex flex-col gap-1 rounded-[1rem] border px-3 py-3 sm:flex-row sm:items-start sm:justify-between;
  border-color: color-mix(in srgb, var(--border-subtle) 88%, transparent);
  background: color-mix(in srgb, var(--surface-base) 86%, transparent);
}

.skills-hub-info-row dt {
  @apply text-[0.68rem] font-semibold uppercase tracking-[0.18em];
  color: var(--text-subtle);
}

.skills-hub-info-row dd {
  @apply m-0 break-words text-sm leading-6;
  color: var(--text-default);
}

.skills-hub-changelog,
.skills-hub-github-readme pre {
  @apply m-0 whitespace-pre-wrap break-words rounded-[1rem] border px-3 py-3 text-sm leading-6;
  border-color: color-mix(in srgb, var(--border-subtle) 88%, transparent);
  background: color-mix(in srgb, var(--surface-base) 86%, transparent);
  color: var(--text-muted);
}

.skills-hub-dialog-backdrop {
  @apply fixed inset-0 z-[120];
  background: rgba(0, 0, 0, 0.52);
  backdrop-filter: blur(10px);
}

.skills-hub-dialog {
  @apply fixed inset-x-0 bottom-0 top-auto z-[121] flex max-h-[88dvh] w-screen flex-col overflow-hidden rounded-t-[1.5rem] px-4 py-4 outline-none md:inset-y-6 md:left-1/2 md:top-1/2 md:h-auto md:max-h-[82dvh] md:w-[min(56rem,92vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.5rem] md:px-5 md:py-5;
  border: 1px solid var(--border-subtle);
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 98%, transparent), var(--surface-base));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
}

.skills-hub-dialog-head {
  @apply flex items-start justify-between gap-4 border-b pb-4;
  border-color: var(--border-subtle);
}

.skills-hub-dialog-close-icon {
  @apply h-4 w-4;
}

.skills-hub-dialog-body {
  @apply mt-4 flex min-h-0 flex-col gap-4 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))];
}

@media (max-width: 960px) {
  .skills-hub {
    @apply px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3;
  }

  .skills-hub-results,
  .skills-hub-sync,
  .skills-hub-installed-panel,
  .skills-hub-header,
  .skills-hub-detail-card {
    @apply px-3 py-3;
  }
}
</style>

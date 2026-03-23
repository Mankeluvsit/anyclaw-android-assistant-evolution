<template>
  <DesktopLayout
    :is-sidebar-collapsed="isSidebarCollapsed"
    :is-compact-viewport="isCompactViewport"
    @collapse-sidebar="setSidebarCollapsed(true)"
  >
    <template #sidebar>
      <section class="sidebar-root">
        <SidebarThreadControls
          v-if="!isSidebarCollapsed"
          class="sidebar-thread-controls-host"
          :is-sidebar-collapsed="isSidebarCollapsed"
          :is-auto-refresh-enabled="isAutoRefreshEnabled"
          :auto-refresh-button-label="autoRefreshButtonLabel"
          :show-auto-refresh-button="false"
          :show-new-thread-button="true"
          @toggle-sidebar="setSidebarCollapsed(!isSidebarCollapsed)"
          @toggle-auto-refresh="onToggleAutoRefreshTimer"
          @start-new-thread="onStartNewThreadFromToolbar"
        >
          <button
            class="sidebar-search-toggle"
            type="button"
            :aria-pressed="isSidebarSearchVisible"
            :aria-label="t('sidebar_search_threads')"
            :title="t('sidebar_search_threads')"
            @click="toggleSidebarSearch"
          >
            <IconTablerSearch class="sidebar-search-toggle-icon" />
          </button>
        </SidebarThreadControls>

        <div v-if="!isSidebarCollapsed && isSidebarSearchVisible" class="sidebar-search-bar">
          <IconTablerSearch class="sidebar-search-bar-icon" />
          <input
            ref="sidebarSearchInputRef"
            v-model="sidebarSearchQuery"
            class="sidebar-search-input"
            type="text"
            :placeholder="t('sidebar_filter_threads')"
            @keydown="onSidebarSearchKeydown"
          />
          <button
            v-if="sidebarSearchQuery.length > 0"
            class="sidebar-search-clear"
            type="button"
            :aria-label="t('sidebar_clear_search')"
            @click="clearSidebarSearch"
          >
            <IconTablerX class="sidebar-search-clear-icon" />
          </button>
        </div>

        <button
          v-if="!isSidebarCollapsed"
          class="sidebar-skills-link"
          :class="{ 'sidebar-skills-link-active': isSkillsRoute }"
          type="button"
          @click="openSkillsHub"
        >
          <span class="sidebar-skills-link-title">{{ t('skills_hub_nav_label') }}</span>
          <span class="sidebar-skills-link-meta">{{ t('skills_hub_nav_meta') }}</span>
        </button>

        <SidebarThreadTree :groups="projectGroups" :project-display-name-by-id="projectDisplayNameById"
          v-if="!isSidebarCollapsed"
          :selected-thread-id="selectedThreadId" :is-loading="isLoadingThreads"
          :search-query="sidebarSearchQuery"
          @select="onSelectThread"
          @archive="onArchiveThread" @start-new-thread="onStartNewThread" @rename-project="onRenameProject"
          @remove-project="onRemoveProject" @reorder-project="onReorderProject" />

        <button
          v-if="!isSidebarCollapsed"
          class="openclaw-dashboard-link"
          type="button"
          @click="openOpenClawDashboard"
        >
          <IconTablerExternalLink class="openclaw-dashboard-icon" />
          <span class="openclaw-dashboard-copy">
            <span class="openclaw-dashboard-label">{{ t('openclaw_dashboard_label') }}</span>
            <span class="openclaw-dashboard-meta">
              {{ openClawDashboardStatus.ok ? t('dashboard_status_online') : t('dashboard_status_offline') }}
            </span>
            <span class="openclaw-dashboard-version">Codex UI vNext</span>
          </span>
        </button>
      </section>
    </template>

    <template #content>
      <section class="content-root">
        <ContentHeader :title="contentTitle">
          <template #leading>
            <SidebarThreadControls
              v-if="isSidebarCollapsed"
              class="sidebar-thread-controls-header-host"
              :is-sidebar-collapsed="isSidebarCollapsed"
              :is-auto-refresh-enabled="isAutoRefreshEnabled"
              :auto-refresh-button-label="autoRefreshButtonLabel"
              :show-auto-refresh-button="false"
              :show-new-thread-button="true"
              @toggle-sidebar="setSidebarCollapsed(!isSidebarCollapsed)"
              @toggle-auto-refresh="onToggleAutoRefreshTimer"
              @start-new-thread="onStartNewThreadFromToolbar"
            />
          </template>
          <template #actions>
            <UiButton
              v-if="!isSettingsRoute"
              class="header-global-settings-button"
              size="icon"
              variant="surface"
              :aria-label="t('settings_label')"
              :title="t('settings_label')"
              @click="openGlobalSettings"
            >
              <IconTablerSettings class="header-settings-icon" />
            </UiButton>
            <UiButton
              v-if="!isHomeRoute && !isSkillsRoute"
              class="header-search-button"
              size="icon"
              variant="surface"
              :aria-label="t('thread_search_label')"
              :title="t('thread_search_label')"
              @click="toggleThreadSearch"
            >
              <IconTablerSearch class="header-settings-icon" />
            </UiButton>
            <UiButton
              v-if="!isHomeRoute && !isSkillsRoute && !isSettingsRoute"
              class="header-settings-button"
              size="icon"
              variant="surface"
              :aria-label="t('settings_thread_label')"
              :title="t('settings_thread_label')"
              @click="isSettingsPanelOpen = true"
            >
              <IconTablerSettings class="header-settings-icon" />
            </UiButton>
          </template>
        </ContentHeader>

        <div v-if="!isHomeRoute && !isSkillsRoute && !isSettingsRoute && isThreadSearchVisible" class="thread-search-bar">
          <IconTablerSearch class="thread-search-bar-icon" />
          <input
            v-model="threadSearchQuery"
            class="thread-search-input"
            type="text"
            :placeholder="t('thread_search_placeholder')"
          />
          <span class="thread-search-meta">{{ visibleMessages.length }}</span>
          <button
            v-if="threadSearchQuery.length > 0"
            class="thread-search-clear"
            type="button"
            :aria-label="t('sidebar_clear_search')"
            @click="threadSearchQuery = ''"
          >
            <IconTablerX class="sidebar-search-clear-icon" />
          </button>
        </div>

        <section class="content-body">
          <template v-if="isSettingsRoute">
            <section class="global-settings-view">
              <header class="global-settings-hero">
                <div>
                  <p class="global-settings-eyebrow">{{ t('settings_label') }}</p>
                  <h2 class="global-settings-title">{{ t('settings_label') }}</h2>
                  <p class="global-settings-subtitle">{{ t('settings_global_subtitle') }}</p>
                </div>
              </header>

              <div class="global-settings-grid">
                <section class="settings-section settings-section-page">
                  <header class="settings-page-section-head">
                    <div>
                      <p class="settings-section-label">{{ t('settings_group_interface') }}</p>
                    </div>
                  </header>
                  <div class="settings-section-content">
                    <ThemeSwitcher
                      :model-value="themePreference"
                      @update:model-value="onThemePreferenceChange"
                    />
                    <label class="ui-locale-label">{{ t('app_language') }}</label>
                    <UiSelect
                      :model-value="localePreference"
                      :options="localeOptions"
                      @update:model-value="onLocalePreferenceChange"
                    />
                  </div>
                </section>

                <section class="settings-section settings-section-page">
                  <header class="settings-page-section-head">
                    <div>
                      <p class="settings-section-label">{{ t('settings_group_conversation') }}</p>
                    </div>
                  </header>
                  <div class="settings-section-content">
                    <UiSwitch
                      :model-value="isAutoRefreshEnabled"
                      :label="t('settings_auto_refresh_label')"
                      :description="t('settings_auto_refresh_description')"
                      @update:model-value="onAutoRefreshSwitchChange"
                    />
                    <UiSwitch
                      :model-value="settings.pressEnterToSend"
                      :label="t('settings_enter_to_send_label')"
                      :description="t('settings_enter_to_send_description')"
                      @update:model-value="onPressEnterToSendChange"
                    />
                  </div>
                </section>

                <section class="settings-section settings-section-page">
                  <header class="settings-page-section-head">
                    <div>
                      <p class="settings-section-label">{{ t('settings_group_openclaw') }}</p>
                    </div>
                  </header>
                  <div class="settings-section-content">
                    <article class="debug-status-card" :data-state="openClawDashboardStatus.ok ? 'online' : 'offline'">
                      <p class="diagnostics-label">{{ t('openclaw_dashboard_label') }}</p>
                      <p class="diagnostics-value">
                        {{ openClawDashboardStatus.ok ? t('dashboard_status_online') : t('dashboard_status_offline') }}
                      </p>
                      <p class="debug-status-detail">{{ openClawDashboardStatus.detail || t('dashboard_status_unknown') }}</p>
                    </article>
                    <div class="workflow-actions">
                      <UiButton variant="surface" size="sm" @click="refreshOpenClawDashboardStatus">
                        {{ t('dashboard_refresh_status') }}
                      </UiButton>
                      <UiButton variant="surface" size="sm" @click="restartOpenClawServices">
                        {{ t('dashboard_restart') }}
                      </UiButton>
                      <UiButton variant="surface" size="sm" @click="openOpenClawDashboard">
                        {{ t('dashboard_open') }}
                      </UiButton>
                    </div>
                    <p v-if="dashboardStatusMessage" class="workflow-status-message">{{ dashboardStatusMessage }}</p>
                  </div>
                </section>

                <section class="settings-section settings-section-page settings-section-page-wide">
                  <header class="settings-page-section-head">
                    <div>
                      <p class="settings-section-label">{{ t('settings_group_runtime') }}</p>
                    </div>
                    <UiButton variant="surface" size="sm" class="diagnostics-refresh-button" @click="refreshDiagnostics">
                      {{ t('diagnostics_refresh') }}
                    </UiButton>
                  </header>
                  <div class="settings-section-content">
                    <p v-if="diagnosticsError" class="diagnostics-error">{{ diagnosticsError }}</p>
                    <div class="diagnostics-summary-grid">
                      <article class="diagnostics-card">
                        <p class="diagnostics-label">{{ t('diagnostics_active_thread') }}</p>
                        <p class="diagnostics-value">{{ selectedThreadId || t('diagnostics_none') }}</p>
                      </article>
                      <article class="diagnostics-card">
                        <p class="diagnostics-label">{{ t('diagnostics_model') }}</p>
                        <p class="diagnostics-value">{{ selectedModelId || t('diagnostics_none') }}</p>
                      </article>
                      <article class="diagnostics-card">
                        <p class="diagnostics-label">{{ t('diagnostics_reasoning') }}</p>
                        <p class="diagnostics-value">{{ selectedReasoningEffort || t('diagnostics_none') }}</p>
                      </article>
                      <article class="diagnostics-card">
                        <p class="diagnostics-label">{{ t('diagnostics_requests') }}</p>
                        <p class="diagnostics-value">{{ selectedThreadServerRequests.length }}</p>
                      </article>
                      <article class="diagnostics-card">
                        <p class="diagnostics-label">{{ t('diagnostics_stream') }}</p>
                        <p class="diagnostics-value">{{ connectionHealth.notificationStreamConnected ? t('diagnostics_connected') : t('diagnostics_disconnected') }}</p>
                      </article>
                      <article class="diagnostics-card">
                        <p class="diagnostics-label">{{ t('diagnostics_last_event') }}</p>
                        <p class="diagnostics-value">{{ formattedLastNotificationAt }}</p>
                      </article>
                      <article class="diagnostics-card">
                        <p class="diagnostics-label">{{ t('diagnostics_last_sync') }}</p>
                        <p class="diagnostics-value">{{ formattedLastSyncAt }}</p>
                      </article>
                      <article class="diagnostics-card diagnostics-card-wide">
                        <p class="diagnostics-label">{{ t('diagnostics_current_error') }}</p>
                        <p class="diagnostics-value diagnostics-value-wrap">{{ error || t('diagnostics_none') }}</p>
                      </article>
                    </div>
                    <div class="diagnostics-summary-grid">
                      <article class="diagnostics-card">
                        <p class="diagnostics-label">{{ t('openclaw_gateway_status_label') }}</p>
                        <p class="diagnostics-value">{{ String(openClawRuntimeDiagnostics.gatewayStatus?.state ?? t('diagnostics_none')) }}</p>
                        <p class="diagnostics-inline-detail">{{ String(openClawRuntimeDiagnostics.gatewayStatus?.detail ?? '') }}</p>
                      </article>
                      <article class="diagnostics-card">
                        <p class="diagnostics-label">{{ t('openclaw_control_ui_status_label') }}</p>
                        <p class="diagnostics-value">{{ String(openClawRuntimeDiagnostics.controlUiStatus?.state ?? t('diagnostics_none')) }}</p>
                        <p class="diagnostics-inline-detail">{{ String(openClawRuntimeDiagnostics.controlUiStatus?.detail ?? '') }}</p>
                      </article>
                    </div>
                    <div v-if="openClawRuntimeDiagnostics.gatewayLog" class="diagnostics-log-block">
                      <p class="diagnostics-log-title">{{ t('openclaw_gateway_log_label') }}</p>
                      <pre class="diagnostics-log-pre">{{ openClawRuntimeDiagnostics.gatewayLog }}</pre>
                    </div>
                    <div v-if="openClawRuntimeDiagnostics.controlUiLog" class="diagnostics-log-block">
                      <p class="diagnostics-log-title">{{ t('openclaw_control_ui_log_label') }}</p>
                      <pre class="diagnostics-log-pre">{{ openClawRuntimeDiagnostics.controlUiLog }}</pre>
                    </div>
                    <div v-if="diagnosticErrors.length > 0" class="diagnostics-log-block">
                      <p class="diagnostics-log-title">{{ t('diagnostics_errors') }}</p>
                      <article
                        v-for="entry in diagnosticErrors"
                        :key="entry.id"
                        class="diagnostics-log-entry diagnostics-log-entry-error"
                      >
                        <div class="diagnostics-log-row">
                          <p class="diagnostics-log-heading">{{ entry.title }}</p>
                          <span class="diagnostics-log-time">{{ formatDiagnosticsTime(entry.atIso) }}</span>
                        </div>
                        <p class="diagnostics-log-detail">{{ entry.detail }}</p>
                      </article>
                    </div>
                    <div v-if="diagnosticEvents.length > 0" class="diagnostics-log-block">
                      <p class="diagnostics-log-title">{{ t('diagnostics_events') }}</p>
                      <article
                        v-for="entry in diagnosticEvents"
                        :key="entry.id"
                        class="diagnostics-log-entry"
                      >
                        <div class="diagnostics-log-row">
                          <p class="diagnostics-log-heading">{{ entry.title }}</p>
                          <span class="diagnostics-log-time">{{ formatDiagnosticsTime(entry.atIso) }}</span>
                        </div>
                        <p class="diagnostics-log-detail">{{ entry.detail }}</p>
                      </article>
                    </div>
                    <ApiMethodsPanel :methods="rpcMethodCatalog" :is-loading="isDiagnosticsLoading" />
                    <ApiMethodsPanel :methods="rpcNotificationCatalog" :is-loading="isDiagnosticsLoading" />
                  </div>
                </section>
              </div>
            </section>
          </template>
          <template v-else-if="isSkillsRoute">
            <SkillsHub />
          </template>
          <template v-else-if="isHomeRoute">
            <div class="content-grid">
              <div class="new-thread-empty">
                <p class="new-thread-hero">{{ t('home_hero') }}</p>
                <NewThreadProjectPicker class="new-thread-project-picker" :model-value="newThreadCwd"
                  :options="newThreadFolderOptions" :default-root="workspaceDefaultRoot"
                  :is-creating="isCreatingWorkspace" :create-error="workspaceCreateError"
                  @update:model-value="onSelectNewThreadFolder" @create-project="onCreateWorkspace" />
                <p class="new-thread-guide">{{ t('home_quick_guide') }}</p>
              </div>

              <ThreadComposer :active-thread-id="composerThreadContextId" :disabled="isSendingMessage"
                :models="availableModelIds" :selected-model="selectedModelId"
                :selected-reasoning-effort="selectedReasoningEffort" :is-turn-in-progress="false"
                :draft-seed="composerDraftSeed"
                :is-interrupting-turn="false" @submit="onSubmitThreadMessage"
                @update:selected-model="onSelectModel" @update:selected-reasoning-effort="onSelectReasoningEffort" />
            </div>
          </template>
          <template v-else>
            <div class="content-grid">
              <div class="content-thread">
                <div
                  v-if="threadSearchQuery.trim().length > 0 && visibleMessages.length === 0"
                  class="thread-search-empty"
                >
                  {{ t('thread_search_no_match') }}
                </div>
                <ThreadConversation :messages="visibleMessages" :is-loading="isLoadingMessages"
                  :active-thread-id="composerThreadContextId" :scroll-state="selectedThreadScrollState"
                  :live-overlay="liveOverlay"
                  :pending-requests="selectedThreadServerRequests"
                  @update-scroll-state="onUpdateThreadScrollState"
                  @respond-server-request="onRespondServerRequest"
                  @copy-message="onCopyMessage"
                  @edit-message="onEditMessage"
                  @resend-message="onResendMessage"
                  @regenerate-message="onRegenerateMessage"
                  @delete-from-message="onDeleteFromMessage"
                  @branch-from-message="onBranchFromMessage" />
              </div>

              <ThreadComposer :active-thread-id="composerThreadContextId"
                :disabled="isSendingMessage || isLoadingMessages" :models="availableModelIds"
                :selected-model="selectedModelId" :selected-reasoning-effort="selectedReasoningEffort"
                :draft-seed="composerDraftSeed"
                :edit-message-label="editingMessageLabel"
                :is-turn-in-progress="isSelectedThreadInProgress" :is-interrupting-turn="isInterruptingTurn"
                @submit="onSubmitThreadMessage" @update:selected-model="onSelectModel"
                @update:selected-reasoning-effort="onSelectReasoningEffort" @interrupt="onInterruptTurn"
                @cancel-edit="clearEditingMessage" />
            </div>
          </template>
        </section>
      </section>
    </template>
  </DesktopLayout>

  <SettingsPanel
    :open="isSettingsPanelOpen"
    :title="t('settings_thread_label')"
    @update:open="isSettingsPanelOpen = $event"
    @close="isSettingsPanelOpen = false"
  >
    <AccordionRoot class="settings-accordion" type="multiple" :default-value="['project', 'workflow']">
      <AccordionItem class="settings-section" value="project">
        <AccordionHeader>
          <AccordionTrigger class="settings-section-trigger">
            <span class="settings-section-label">{{ t('settings_section_project') }}</span>
            <IconTablerChevronDown class="settings-section-chevron" />
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent class="settings-section-content">
          <div class="diagnostics-summary-grid">
            <article class="diagnostics-card">
              <p class="diagnostics-label">{{ t('thread_settings_thread_id') }}</p>
              <p class="diagnostics-value">{{ selectedThreadId || t('diagnostics_none') }}</p>
            </article>
            <article class="diagnostics-card">
              <p class="diagnostics-label">{{ t('thread_settings_project') }}</p>
              <p class="diagnostics-value">{{ activeProjectName || t('diagnostics_none') }}</p>
            </article>
            <article class="diagnostics-card diagnostics-card-wide">
              <p class="diagnostics-label">{{ t('thread_settings_workspace') }}</p>
              <p class="diagnostics-value diagnostics-value-wrap">{{ selectedThread?.cwd || t('diagnostics_none') }}</p>
            </article>
            <article class="diagnostics-card">
              <p class="diagnostics-label">{{ t('thread_settings_status') }}</p>
              <p class="diagnostics-value">{{ isSelectedThreadInProgress ? t('thread_settings_status_in_progress') : t('thread_settings_status_idle') }}</p>
            </article>
            <article class="diagnostics-card">
              <p class="diagnostics-label">{{ t('thread_settings_pending_requests') }}</p>
              <p class="diagnostics-value">{{ selectedThreadServerRequests.length }}</p>
            </article>
          </div>
          <label class="ui-locale-label">{{ t('thread_settings_model') }}</label>
          <UiSelect
            :model-value="selectedModelId"
            :options="sessionModelOptions"
            @update:model-value="onSelectModel"
          />
          <label class="ui-locale-label">{{ t('thread_settings_reasoning') }}</label>
          <UiSelect
            :model-value="selectedReasoningEffort || PROJECT_NONE_OPTION"
            :options="sessionReasoningOptions"
            @update:model-value="onThreadReasoningChange"
          />
          <p class="diagnostics-label">{{ activeProjectName || t('diagnostics_none') }}</p>
          <label class="ui-locale-label">{{ t('project_default_model_label') }}</label>
          <UiSelect
            :model-value="projectPreference.defaultModel || PROJECT_NONE_OPTION"
            :options="projectModelOptions"
            :placeholder="t('project_default_model_none')"
            @update:model-value="onProjectDefaultModelChange"
          />
          <label class="ui-locale-label">{{ t('project_default_reasoning_label') }}</label>
          <UiSelect
            :model-value="projectPreference.defaultReasoning || PROJECT_NONE_OPTION"
            :options="projectReasoningOptions"
            :placeholder="t('project_default_reasoning_none')"
            @update:model-value="onProjectDefaultReasoningChange"
          />
          <label class="ui-locale-label">{{ t('project_instructions_label') }}</label>
          <textarea
            v-model="projectInstructionsDraft"
            class="project-instructions-input"
            :placeholder="t('project_instructions_placeholder')"
            @change="onProjectInstructionsChange"
          />
          <UiButton variant="surface" size="sm" @click="applyActiveProjectDefaults">
            {{ t('project_apply_defaults') }}
          </UiButton>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem class="settings-section" value="workflow">
        <AccordionHeader>
          <AccordionTrigger class="settings-section-trigger">
            <span class="settings-section-label">{{ t('settings_section_workflow') }}</span>
            <IconTablerChevronDown class="settings-section-chevron" />
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent class="settings-section-content">
          <input
            ref="threadImportInputRef"
            class="thread-import-input"
            type="file"
            accept=".json,.md,.markdown,.txt,application/json,text/markdown,text/plain"
            @change="onThreadImportChange"
          />
          <div class="workflow-actions">
            <UiButton variant="surface" size="sm" @click="exportCurrentThread('json')">
              {{ t('thread_export_json') }}
            </UiButton>
            <UiButton variant="surface" size="sm" @click="exportCurrentThread('markdown')">
              {{ t('thread_export_markdown') }}
            </UiButton>
            <UiButton variant="surface" size="sm" @click="openThreadImportPicker">
              {{ t('thread_import') }}
            </UiButton>
            <UiButton
              v-if="canUseNativeShare"
              variant="surface"
              size="sm"
              @click="shareCurrentThread"
            >
              {{ t('thread_share') }}
            </UiButton>
          </div>
          <p v-if="workflowStatusMessage" class="workflow-status-message">{{ workflowStatusMessage }}</p>
          <div class="saved-view-editor">
            <label class="ui-locale-label" for="saved-view-name">{{ t('saved_view_name_label') }}</label>
            <div class="saved-view-editor-row">
              <input
                id="saved-view-name"
                v-model="savedViewNameDraft"
                class="saved-view-input"
                type="text"
                :placeholder="t('saved_view_name_placeholder')"
                @keydown.enter.prevent="saveCurrentView"
              />
              <UiButton variant="surface" size="sm" @click="saveCurrentView">
                {{ t('saved_view_save') }}
              </UiButton>
            </div>
          </div>
          <div v-if="savedViews.length > 0" class="saved-view-list">
            <article
              v-for="view in savedViews"
              :key="view.id"
              class="saved-view-card"
            >
              <div class="saved-view-copy">
                <p class="saved-view-name">{{ view.name }}</p>
                <p class="saved-view-meta">
                  {{ formatSavedViewMeta(view) }}
                </p>
              </div>
              <div class="saved-view-actions">
                <UiButton variant="ghost" size="sm" @click="applySavedView(view.id)">
                  {{ t('saved_view_apply') }}
                </UiButton>
                <UiButton variant="ghost" size="sm" @click="removeSavedView(view.id)">
                  {{ t('saved_view_remove') }}
                </UiButton>
              </div>
            </article>
          </div>
        </AccordionContent>
      </AccordionItem>

    </AccordionRoot>
  </SettingsPanel>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'radix-vue'
import DesktopLayout from './components/layout/DesktopLayout.vue'
import SidebarThreadTree from './components/sidebar/SidebarThreadTree.vue'
import ContentHeader from './components/content/ContentHeader.vue'
import ThreadConversation from './components/content/ThreadConversation.vue'
import ThreadComposer from './components/content/ThreadComposer.vue'
import SkillsHub from './components/content/SkillsHub.vue'
import ApiMethodsPanel from './components/content/ApiMethodsPanel.vue'
import NewThreadProjectPicker from './components/content/NewThreadProjectPicker.vue'
import SidebarThreadControls from './components/sidebar/SidebarThreadControls.vue'
import SettingsPanel from './components/ui/SettingsPanel.vue'
import ThemeSwitcher from './components/ui/ThemeSwitcher.vue'
import UiButton from './components/ui/UiButton.vue'
import UiSelect from './components/ui/UiSelect.vue'
import UiSwitch from './components/ui/UiSwitch.vue'
import IconTablerSearch from './components/icons/IconTablerSearch.vue'
import IconTablerChevronDown from './components/icons/IconTablerChevronDown.vue'
import IconTablerSettings from './components/icons/IconTablerSettings.vue'
import IconTablerX from './components/icons/IconTablerX.vue'
import IconTablerExternalLink from './components/icons/IconTablerExternalLink.vue'
import { getMethodCatalog, getNotificationCatalog } from './api/codexGateway'
import { useDesktopState } from './composables/useDesktopState'
import { useUiI18n, type LocalePreference } from './composables/useUiI18n'
import { useProjectPreferences } from './composables/useProjectPreferences'
import { useSavedViews, type SavedView } from './composables/useSavedViews'
import { useUiSettings } from './composables/useUiSettings'
import { useUiTheme, type ThemePreference } from './composables/useUiTheme'
import { createWorkspace, getDefaultWorkspaceRoot } from './api/workspaces'
import type { ComposerImageAttachment, ComposerSkillSelection, ReasoningEffort, ThreadScrollState, UiMessage } from './types/codex'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'codex-web-local.sidebar-collapsed.v1'
const PROJECT_NONE_OPTION = '__none__'
const { localePreference, setLocalePreference, t } = useUiI18n()
const { themePreference, setThemePreference } = useUiTheme()
const { getProjectPreference, setProjectPreference } = useProjectPreferences()
const { savedViews, addSavedView, removeSavedView } = useSavedViews()
const { settings, setPressEnterToSend } = useUiSettings()
const OPENCLAW_GATEWAY_PORT_STORAGE_KEY = 'anyclaw.openclaw.gateway.port.v1'
const OPENCLAW_CONTROL_UI_PORT_STORAGE_KEY = 'anyclaw.openclaw.controlui.port.v1'
const DEFAULT_CODEX_SERVER_PORT = 18923
const OPENCLAW_GATEWAY_PORT_DELTA = 134
const OPENCLAW_CONTROL_UI_PORT_DELTA = 78
const isCompactViewport = useMediaQuery('(max-width: 960px)')
const localeOptions = computed(() => [
  { value: 'system', label: t('app_language_system') },
  { value: 'zh-CN', label: t('app_language_zh_cn') },
  { value: 'en', label: t('app_language_en') },
])

function resolveRuntimePort(
  queryName: string,
  storageKey: string,
  fallbackPort: string,
): string {
  if (typeof window === 'undefined') return fallbackPort
  try {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = (params.get(queryName) ?? '').trim()
    if (/^\d+$/.test(fromQuery)) {
      window.localStorage.setItem(storageKey, fromQuery)
      return fromQuery
    }
    const fromStorage = (window.localStorage.getItem(storageKey) ?? '').trim()
    if (/^\d+$/.test(fromStorage)) return fromStorage
  } catch {
    // Ignore and fallback.
  }
  return fallbackPort
}

function deriveDefaultOpenClawPorts(): { gatewayPort: string; controlUiPort: string } {
  if (typeof window === 'undefined') {
    return { gatewayPort: '18789', controlUiPort: '19001' }
  }

  const serverPort = Number.parseInt(window.location.port || '', 10)
  if (!Number.isFinite(serverPort)) {
    return { gatewayPort: '18789', controlUiPort: '19001' }
  }

  const isolatedOffset = serverPort - DEFAULT_CODEX_SERVER_PORT
  const gatewayPort = DEFAULT_CODEX_SERVER_PORT - OPENCLAW_GATEWAY_PORT_DELTA + isolatedOffset
  const controlUiPort = DEFAULT_CODEX_SERVER_PORT + OPENCLAW_CONTROL_UI_PORT_DELTA + isolatedOffset
  return {
    gatewayPort: String(gatewayPort),
    controlUiPort: String(controlUiPort),
  }
}

const openClawDashboardUrl = computed(() => {
  const defaults = deriveDefaultOpenClawPorts()
  const gatewayPort = resolveRuntimePort(
    'openclawGatewayPort',
    OPENCLAW_GATEWAY_PORT_STORAGE_KEY,
    defaults.gatewayPort,
  )
  const controlUiPort = resolveRuntimePort(
    'openclawControlUiPort',
    OPENCLAW_CONTROL_UI_PORT_STORAGE_KEY,
    defaults.controlUiPort,
  )
  const params = new URLSearchParams({
    gatewayUrl: `ws://localhost:${gatewayPort}`,
    localePref: localePreference.value,
    simple: '1',
    openclawGatewayPort: gatewayPort,
    openclawControlUiPort: controlUiPort,
  })
  return `http://localhost:${controlUiPort}/chat?${params.toString()}`
})

const {
  projectGroups,
  projectDisplayNameById,
  selectedThread,
  selectedThreadScrollState,
  selectedThreadServerRequests,
  selectedLiveOverlay,
  selectedThreadId,
  availableModelIds,
  selectedModelId,
  selectedReasoningEffort,
  messages,
  isLoadingThreads,
  isLoadingMessages,
  isSendingMessage,
  isInterruptingTurn,
  isAutoRefreshEnabled,
  autoRefreshSecondsLeft,
  error,
  diagnosticEvents,
  diagnosticErrors,
  connectionHealth,
  refreshAll,
  selectThread,
  setThreadScrollState,
  archiveThreadById,
  deleteFromMessage,
  forkFromMessage,
  sendMessageToSelectedThread,
  sendMessageToNewThread,
  interruptSelectedThreadTurn,
  setSelectedModelId,
  setSelectedReasoningEffort,
  respondToPendingServerRequest,
  renameProject,
  removeProject,
  reorderProject,
  toggleAutoRefreshTimer,
  startPolling,
  stopPolling,
} = useDesktopState()

const route = useRoute()
const router = useRouter()
const isRouteSyncInProgress = ref(false)
const hasInitialized = ref(false)
const newThreadCwd = ref('')
const isSidebarCollapsed = ref(loadSidebarCollapsed())
const sidebarSearchQuery = ref('')
const isSidebarSearchVisible = ref(false)
const threadSearchQuery = ref('')
const isThreadSearchVisible = ref(false)
const isSettingsPanelOpen = ref(false)
const hasAttemptedOpenClawAutoRecover = ref(false)
const sidebarSearchInputRef = ref<HTMLInputElement | null>(null)
const threadImportInputRef = ref<HTMLInputElement | null>(null)
const rpcMethodCatalog = ref<string[]>([])
const rpcNotificationCatalog = ref<string[]>([])
const diagnosticsError = ref('')
const isDiagnosticsLoading = ref(false)
const editingMessageId = ref('')
const composerDraftSeed = ref<{ key: string; text: string } | null>(null)
const projectInstructionsDraft = ref('')
const savedViewNameDraft = ref('')
const workflowStatusMessage = ref('')
const dashboardStatusMessage = ref('')
const workspaceDefaultRoot = ref('')
const isCreatingWorkspace = ref(false)
const workspaceCreateError = ref('')
const createdWorkspaceOptions = ref<Array<{ value: string; label: string; projectName: string }>>([])
const openClawDashboardStatus = ref<{ ok: boolean; status: number; detail: string }>({
  ok: false,
  status: 0,
  detail: '',
})
const openClawRuntimeDiagnostics = ref<{
  gatewayStatus: Record<string, unknown> | null
  controlUiStatus: Record<string, unknown> | null
  runtimeHealth: Record<string, unknown> | null
  heartbeatBootstrap: Record<string, unknown> | null
  gatewayLog: string
  controlUiLog: string
}>({
  gatewayStatus: null,
  controlUiStatus: null,
  runtimeHealth: null,
  heartbeatBootstrap: null,
  gatewayLog: '',
  controlUiLog: '',
})

const routeThreadId = computed(() => {
  const rawThreadId = route.params.threadId
  return typeof rawThreadId === 'string' ? rawThreadId : ''
})

const knownThreadIdSet = computed(() => {
  const ids = new Set<string>()
  for (const group of projectGroups.value) {
    for (const thread of group.threads) {
      ids.add(thread.id)
    }
  }
  return ids
})

const isHomeRoute = computed(() => route.name === 'home')
const isSkillsRoute = computed(() => route.name === 'skills')
const isSettingsRoute = computed(() => route.name === 'settings')
const contentTitle = computed(() => {
  if (isSettingsRoute.value) return t('settings_label')
  if (isSkillsRoute.value) return t('skills_hub_title')
  if (isHomeRoute.value) return t('content_new_thread')
  return selectedThread.value?.title ?? t('content_choose_thread')
})
const autoRefreshButtonLabel = computed(() =>
  isAutoRefreshEnabled.value
    ? t('auto_refresh_in', { seconds: String(autoRefreshSecondsLeft.value) })
    : t('auto_refresh_enable'),
)
const filteredMessages = computed(() =>
  messages.value.filter((message) => {
    const type = normalizeMessageType(message.messageType, message.role)
    if (type === 'worked') return true
    if (type === 'turnActivity.live' || type === 'turnError.live' || type === 'agentReasoning.live') return false
    return true
  }),
)
const visibleMessages = computed(() => {
  const query = threadSearchQuery.value.trim().toLowerCase()
  if (!query) return filteredMessages.value
  return filteredMessages.value.filter((message) => {
    const text = `${message.text} ${message.rawPayload ?? ''}`.toLowerCase()
    return text.includes(query)
  })
})
const liveOverlay = computed(() => selectedLiveOverlay.value)
const composerThreadContextId = computed(() => (isHomeRoute.value ? '__new-thread__' : selectedThreadId.value))
const isSelectedThreadInProgress = computed(() => !isHomeRoute.value && selectedThread.value?.inProgress === true)
const editingMessageLabel = computed(() => (editingMessageId.value ? t('composer_editing_message') : ''))
const formattedLastNotificationAt = computed(() => formatDiagnosticsTime(connectionHealth.value.lastNotificationAtIso))
const formattedLastSyncAt = computed(() => formatDiagnosticsTime(connectionHealth.value.lastSyncAtIso))
const activeProjectName = computed(() => {
  if (isHomeRoute.value) {
    const selected = newThreadFolderOptions.value.find((option) => option.value === newThreadCwd.value)
    return selected?.projectName || ''
  }
  return selectedThread.value?.projectName ?? ''
})
const projectPreference = computed(() => getProjectPreference(activeProjectName.value))
const projectModelOptions = computed(() => [
  { value: PROJECT_NONE_OPTION, label: t('project_default_model_none') },
  ...availableModelIds.value.map((modelId) => ({ value: modelId, label: modelId })),
])
const sessionModelOptions = computed(() =>
  availableModelIds.value.map((modelId) => ({ value: modelId, label: modelId })),
)
const projectReasoningOptions = computed(() => [
  { value: PROJECT_NONE_OPTION, label: t('project_default_reasoning_none') },
  { value: 'none', label: t('thinking_none') },
  { value: 'minimal', label: t('thinking_minimal') },
  { value: 'low', label: t('thinking_low') },
  { value: 'medium', label: t('thinking_medium') },
  { value: 'high', label: t('thinking_high') },
  { value: 'xhigh', label: t('thinking_xhigh') },
])
const sessionReasoningOptions = computed(() => [
  { value: PROJECT_NONE_OPTION, label: t('project_default_reasoning_none') },
  { value: 'none', label: t('thinking_none') },
  { value: 'minimal', label: t('thinking_minimal') },
  { value: 'low', label: t('thinking_low') },
  { value: 'medium', label: t('thinking_medium') },
  { value: 'high', label: t('thinking_high') },
  { value: 'xhigh', label: t('thinking_xhigh') },
])
const canUseNativeShare = computed(() => typeof navigator !== 'undefined' && typeof navigator.share === 'function')
const DEFAULT_WORKSPACE_NAME = 'codex'

const newThreadFolderOptions = computed(() => {
  const options: Array<{ value: string; label: string; projectName: string }> = []
  const seenCwds = new Set<string>()

  for (const option of createdWorkspaceOptions.value) {
    if (!option.value || seenCwds.has(option.value)) continue
    seenCwds.add(option.value)
    options.push(option)
  }

  for (const group of projectGroups.value) {
    const cwd = group.threads[0]?.cwd?.trim() ?? ''
    if (!cwd || seenCwds.has(cwd)) continue
    seenCwds.add(cwd)
    options.push({
      value: cwd,
      label: projectDisplayNameById.value[group.projectName] ?? group.projectName,
      projectName: group.projectName,
    })
  }

  if (options.length === 0) {
    options.push({ value: DEFAULT_WORKSPACE_NAME, label: DEFAULT_WORKSPACE_NAME, projectName: DEFAULT_WORKSPACE_NAME })
  }

  return options
})

onMounted(() => {
  window.addEventListener('keydown', onWindowKeyDown)
  void initialize()
  void refreshDiagnostics()
  void ensureOpenClawAvailable()
  void loadWorkspaceDefaultRoot()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeyDown)
  stopPolling()
})

function toggleSidebarSearch(): void {
  isSidebarSearchVisible.value = !isSidebarSearchVisible.value
  if (isSidebarSearchVisible.value) {
    nextTick(() => sidebarSearchInputRef.value?.focus())
  } else {
    sidebarSearchQuery.value = ''
  }
}

function clearSidebarSearch(): void {
  sidebarSearchQuery.value = ''
  sidebarSearchInputRef.value?.focus()
}

function toggleThreadSearch(): void {
  isThreadSearchVisible.value = !isThreadSearchVisible.value
  if (!isThreadSearchVisible.value) {
    threadSearchQuery.value = ''
  }
}

function onSidebarSearchKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    isSidebarSearchVisible.value = false
    sidebarSearchQuery.value = ''
  }
}

function onSelectThread(threadId: string): void {
  if (!threadId) return
  clearEditingMessage()
  if (route.name === 'thread' && routeThreadId.value === threadId) return
  if (isCompactViewport.value) {
    setSidebarCollapsed(true)
  }
  void router.push({ name: 'thread', params: { threadId } })
}

function onArchiveThread(threadId: string): void {
  void archiveThreadById(threadId)
}

function openSkillsHub(): void {
  if (isCompactViewport.value) {
    setSidebarCollapsed(true)
  }
  if (isSkillsRoute.value) return
  void router.push({ name: 'skills' })
}

function openGlobalSettings(): void {
  if (isCompactViewport.value) {
    setSidebarCollapsed(true)
  }
  if (isSettingsRoute.value) return
  void router.push({ name: 'settings' })
}

function onStartNewThread(projectName: string): void {
  clearEditingMessage()
  const projectGroup = projectGroups.value.find((group) => group.projectName === projectName)
  const projectCwd = projectGroup?.threads[0]?.cwd?.trim() ?? ''
  if (projectCwd) {
    newThreadCwd.value = projectCwd
  }
  applyProjectDefaults(projectName)
  if (isCompactViewport.value) {
    setSidebarCollapsed(true)
  }
  if (isHomeRoute.value) return
  void router.push({ name: 'home' })
}

function onStartNewThreadFromToolbar(): void {
  clearEditingMessage()
  const cwd = selectedThread.value?.cwd?.trim() ?? ''
  const projectName = selectedThread.value?.projectName ?? ''
  if (cwd) {
    newThreadCwd.value = cwd
  }
  if (projectName) {
    applyProjectDefaults(projectName)
  }
  if (isCompactViewport.value) {
    setSidebarCollapsed(true)
  }
  if (isHomeRoute.value) return
  void router.push({ name: 'home' })
}

function onRenameProject(payload: { projectName: string; displayName: string }): void {
  renameProject(payload.projectName, payload.displayName)
}

function onRemoveProject(projectName: string): void {
  removeProject(projectName)
}

function onReorderProject(payload: { projectName: string; toIndex: number }): void {
  reorderProject(payload.projectName, payload.toIndex)
}

function onUpdateThreadScrollState(payload: { threadId: string; state: ThreadScrollState }): void {
  setThreadScrollState(payload.threadId, payload.state)
}

function onRespondServerRequest(payload: { id: number; result?: unknown; error?: { code?: number; message: string } }): void {
  void respondToPendingServerRequest(payload)
}

function onCopyMessage(messageId: string): void {
  const row = filteredMessages.value.find((message) => message.id === messageId)
  if (!row || row.text.trim().length === 0) return
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return
  void navigator.clipboard.writeText(row.text)
}

function onEditMessage(messageId: string): void {
  const row = filteredMessages.value.find((message) => message.id === messageId && message.role === 'user')
  if (!row || row.text.trim().length === 0) return
  editingMessageId.value = messageId
  composerDraftSeed.value = {
    key: `${messageId}:${Date.now()}`,
    text: row.text,
  }
}

function onResendMessage(messageId: string): void {
  const row = filteredMessages.value.find((message) => message.id === messageId)
  if (!row || row.text.trim().length === 0) return
  void sendMessageToSelectedThread(row.text)
}

function onRegenerateMessage(messageId: string): void {
  void (async () => {
    const assistantRow = filteredMessages.value.find((message) => message.id === messageId && message.role === 'assistant')
    if (!assistantRow) return
    const previousUserRow = findPreviousUserMessage(assistantRow)
    if (!previousUserRow || previousUserRow.text.trim().length === 0) return

    try {
      await deleteFromMessage(messageId)
      await sendMessageToSelectedThread(previousUserRow.text)
    } catch {
      // Error is already reflected in diagnostics state.
    }
  })()
}

function onDeleteFromMessage(messageId: string): void {
  if (typeof window !== 'undefined') {
    const shouldContinue = window.confirm(t('delete_turn_confirm'))
    if (!shouldContinue) return
  }
  void (async () => {
    try {
      await deleteFromMessage(messageId)
    } catch {}
  })()
}

function onBranchFromMessage(messageId: string): void {
  void (async () => {
    try {
      await forkFromMessage(messageId)
    } catch {}
  })()
}

function onLocalePreferenceChange(value: string): void {
  if (value === 'system' || value === 'zh-CN' || value === 'en') {
    setLocalePreference(value as LocalePreference)
  }
}

function onThemePreferenceChange(value: ThemePreference): void {
  setThemePreference(value)
}

function onToggleAutoRefreshTimer(): void {
  toggleAutoRefreshTimer()
}

function onAutoRefreshSwitchChange(value: boolean): void {
  if (value !== isAutoRefreshEnabled.value) {
    toggleAutoRefreshTimer()
  }
}

function onPressEnterToSendChange(value: boolean): void {
  setPressEnterToSend(value)
}

function openThreadImportPicker(): void {
  threadImportInputRef.value?.click()
}

function onProjectDefaultModelChange(value: string): void {
  if (!activeProjectName.value) return
  setProjectPreference(activeProjectName.value, { defaultModel: value === PROJECT_NONE_OPTION ? '' : value })
}

function onProjectDefaultReasoningChange(value: string): void {
  if (!activeProjectName.value) return
  setProjectPreference(
    activeProjectName.value,
    { defaultReasoning: value === PROJECT_NONE_OPTION ? '' : (value as ReasoningEffort | '') },
  )
}

function onProjectInstructionsChange(): void {
  if (!activeProjectName.value) return
  setProjectPreference(activeProjectName.value, { instructions: projectInstructionsDraft.value })
}

function onThreadReasoningChange(value: string): void {
  setSelectedReasoningEffort(value === PROJECT_NONE_OPTION ? '' : (value as ReasoningEffort | ''))
}

function applyProjectDefaults(projectName: string): void {
  if (!projectName) return
  const preference = getProjectPreference(projectName)
  if (preference.defaultModel && availableModelIds.value.includes(preference.defaultModel)) {
    setSelectedModelId(preference.defaultModel)
  }
  if (preference.defaultReasoning) {
    setSelectedReasoningEffort(preference.defaultReasoning)
  }
}

function applyActiveProjectDefaults(): void {
  applyProjectDefaults(activeProjectName.value)
}

async function refreshOpenClawDashboardStatus(): Promise<void> {
  dashboardStatusMessage.value = ''
  try {
    const controlUiPort = new URL(openClawDashboardUrl.value).port || '0'
    const response = await fetch(`/codex-api/openclaw/dashboard-status?port=${encodeURIComponent(controlUiPort)}`)
    const payload = await response.json() as { ok?: boolean; status?: number; detail?: string }
    openClawDashboardStatus.value = {
      ok: payload.ok === true,
      status: typeof payload.status === 'number' ? payload.status : 0,
      detail: typeof payload.detail === 'string' ? payload.detail : '',
    }
  } catch (error) {
    openClawDashboardStatus.value = {
      ok: false,
      status: 0,
      detail: error instanceof Error ? error.message : t('dashboard_status_unknown'),
    }
  }
}

async function refreshOpenClawRuntimeDiagnostics(): Promise<void> {
  try {
    const response = await fetch('/codex-api/openclaw/runtime-diagnostics')
    const payload = await response.json() as typeof openClawRuntimeDiagnostics.value
    openClawRuntimeDiagnostics.value = {
      gatewayStatus: payload.gatewayStatus ?? null,
      controlUiStatus: payload.controlUiStatus ?? null,
      runtimeHealth: payload.runtimeHealth ?? null,
      heartbeatBootstrap: payload.heartbeatBootstrap ?? null,
      gatewayLog: typeof payload.gatewayLog === 'string' ? payload.gatewayLog : '',
      controlUiLog: typeof payload.controlUiLog === 'string' ? payload.controlUiLog : '',
    }
  } catch {
    // Keep the previous diagnostics visible if this refresh fails.
  }
}

async function ensureOpenClawAvailable(): Promise<void> {
  await refreshOpenClawDashboardStatus()
  await refreshOpenClawRuntimeDiagnostics()
  if (openClawDashboardStatus.value.ok || hasAttemptedOpenClawAutoRecover.value) return
  hasAttemptedOpenClawAutoRecover.value = true
  await restartOpenClawServices(false)
}

async function openOpenClawDashboard(): Promise<void> {
  await refreshOpenClawDashboardStatus()
  if (!openClawDashboardStatus.value.ok) {
    dashboardStatusMessage.value = t('dashboard_offline_message', {
      detail: openClawDashboardStatus.value.detail || t('dashboard_status_unknown'),
    })
    restartOpenClawServices(true)
    return
  }
  dashboardStatusMessage.value = ''
  if (typeof window !== 'undefined') {
    window.location.assign('anyclaw://openclaw/dashboard')
  }
}

async function restartOpenClawServices(openAfter = false): Promise<void> {
  dashboardStatusMessage.value = t('dashboard_restart_pending')
  if (typeof window !== 'undefined') {
    window.location.assign(`anyclaw://openclaw/restart?open=${openAfter ? '1' : '0'}`)
  }
  ;[1800, 5000, 9000, 13000].forEach((delay) => {
    window.setTimeout(() => {
      void refreshOpenClawDashboardStatus()
      void refreshOpenClawRuntimeDiagnostics()
    }, delay)
  })
}

function saveCurrentView(): void {
  const name = savedViewNameDraft.value.trim()
  if (!name) {
    workflowStatusMessage.value = t('saved_view_name_required')
    return
  }

  addSavedView({
    name,
    sidebarQuery: sidebarSearchQuery.value,
    threadQuery: threadSearchQuery.value,
    projectName: activeProjectName.value,
    cwd: newThreadCwd.value,
    modelId: selectedModelId.value,
    reasoning: selectedReasoningEffort.value,
  })
  savedViewNameDraft.value = ''
  workflowStatusMessage.value = t('saved_view_saved')
}

function applySavedView(id: string): void {
  const view = savedViews.value.find((item) => item.id === id)
  if (!view) return
  sidebarSearchQuery.value = view.sidebarQuery
  isSidebarSearchVisible.value = view.sidebarQuery.length > 0
  threadSearchQuery.value = view.threadQuery
  isThreadSearchVisible.value = view.threadQuery.length > 0
  if (view.cwd) {
    newThreadCwd.value = view.cwd
  }
  if (view.projectName) {
    applyProjectDefaults(view.projectName)
  }
  if (view.modelId) {
    setSelectedModelId(view.modelId)
  }
  if (view.reasoning) {
    setSelectedReasoningEffort(view.reasoning)
  }
  workflowStatusMessage.value = t('saved_view_applied')
}

function formatSavedViewMeta(view: SavedView): string {
  const parts = [
    view.projectName || t('diagnostics_none'),
    view.modelId || t('project_default_model_none'),
    view.reasoning || t('project_default_reasoning_none'),
  ]
  return parts.join(' · ')
}

function setSidebarCollapsed(nextValue: boolean): void {
  if (isSidebarCollapsed.value === nextValue) return
  isSidebarCollapsed.value = nextValue
  saveSidebarCollapsed(nextValue)
}

function onWindowKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return
  if (!event.ctrlKey && !event.metaKey) return
  if (event.shiftKey || event.altKey) return
  if (event.key.toLowerCase() !== 'b') return
  event.preventDefault()
  setSidebarCollapsed(!isSidebarCollapsed.value)
}

function onSubmitThreadMessage(payload: {
  text: string
  attachments: ComposerImageAttachment[]
  skills: ComposerSkillSelection[]
}): void {
  const { text, attachments, skills } = payload
  if (isHomeRoute.value) {
    void submitFirstMessageForNewThread(text, attachments, skills)
    return
  }
  void (async () => {
    const editingId = editingMessageId.value
    try {
      if (editingId) {
        await deleteFromMessage(editingId)
      }
      await sendMessageToSelectedThread(text, attachments, skills)
      clearEditingMessage()
    } catch {
      // Error is already reflected in state.
    }
  })()
}

function onSelectNewThreadFolder(cwd: string): void {
  newThreadCwd.value = cwd.trim()
  const nextProject = newThreadFolderOptions.value.find((option) => option.value === newThreadCwd.value)?.projectName ?? ''
  if (nextProject) {
    applyProjectDefaults(nextProject)
  }
}

async function loadWorkspaceDefaultRoot(): Promise<void> {
  try {
    workspaceDefaultRoot.value = await getDefaultWorkspaceRoot()
  } catch {
    workspaceDefaultRoot.value = ''
  }
}

async function onCreateWorkspace(name: string): Promise<void> {
  isCreatingWorkspace.value = true
  workspaceCreateError.value = ''
  try {
    const workspace = await createWorkspace(name)
    const option = {
      value: workspace.cwd,
      label: workspace.name,
      projectName: workspace.name,
    }
    createdWorkspaceOptions.value = [
      option,
      ...createdWorkspaceOptions.value.filter((entry) => entry.value !== option.value),
    ]
    newThreadCwd.value = workspace.cwd
    applyProjectDefaults(workspace.name)
    workflowStatusMessage.value = `Created workspace ${workspace.name}.`
  } catch (error) {
    workspaceCreateError.value = error instanceof Error ? error.message : 'Workspace creation failed.'
  } finally {
    isCreatingWorkspace.value = false
  }
}

function onSelectModel(modelId: string): void {
  setSelectedModelId(modelId)
}

function onSelectReasoningEffort(effort: ReasoningEffort | ''): void {
  setSelectedReasoningEffort(effort)
}

function onInterruptTurn(): void {
  void interruptSelectedThreadTurn()
}

function loadSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)
  if (stored === null) return true
  return stored === '1'
}

function saveSidebarCollapsed(value: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? '1' : '0')
}

function clearEditingMessage(): void {
  editingMessageId.value = ''
  composerDraftSeed.value = null
}

function exportCurrentThread(format: 'json' | 'markdown'): void {
  const thread = selectedThread.value
  if (!thread) return

  const { blob, fileName } = buildThreadExport(thread.projectName, thread.id, thread.title, format)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

async function shareCurrentThread(): Promise<void> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || !selectedThread.value) return
  const file = buildThreadExport(
    selectedThread.value.projectName,
    selectedThread.value.id,
    selectedThread.value.title,
    'markdown',
  )
  const shareFile = new File([file.blob], file.fileName, { type: 'text/markdown' })
  const summary = filteredMessages.value.map((message) => `${message.role.toUpperCase()}: ${message.text}`).join('\n\n').slice(0, 4000)

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [shareFile] })) {
    await navigator.share({
      title: selectedThread.value.title,
      text: summary,
      files: [shareFile],
    })
    workflowStatusMessage.value = t('thread_share_ready')
    return
  }

  await navigator.share({
    title: selectedThread.value.title,
    text: summary,
  })
  workflowStatusMessage.value = t('thread_share_ready')
}

async function onThreadImportChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return

  try {
    const raw = await file.text()
    const imported = parseImportedThread(raw, file.name)
    if (!imported) {
      workflowStatusMessage.value = t('thread_import_invalid')
      return
    }

    clearEditingMessage()
    newThreadCwd.value = imported.cwd || newThreadCwd.value
    composerDraftSeed.value = {
      key: `import:${file.name}:${Date.now()}`,
      text: imported.prompt,
    }
    if (!isHomeRoute.value) {
      await router.replace({ name: 'home' })
    }
    workflowStatusMessage.value = t('thread_import_ready')
  } catch (error) {
    workflowStatusMessage.value = error instanceof Error ? error.message : t('thread_import_invalid')
  } finally {
    if (input) input.value = ''
  }
}

function buildThreadExport(
  projectName: string,
  threadId: string,
  threadTitle: string,
  format: 'json' | 'markdown',
): { blob: Blob; fileName: string } {
  const fileBase = `${projectName}-${threadId}`.replace(/[^a-z0-9-_]+/giu, '-')
  const payload =
    format === 'json'
      ? JSON.stringify(
          {
            thread: selectedThread.value,
            messages: filteredMessages.value,
          },
          null,
          2,
        )
      : [
          `# ${threadTitle}`,
          '',
          `Project: ${projectName}`,
          `Thread: ${threadId}`,
          '',
          ...filteredMessages.value.flatMap((message) => [
            `## ${message.role}`,
            '',
            message.text || '',
            ...(message.images?.length ? ['', ...message.images.map((image) => `![attachment](${image})`)] : []),
            '',
          ]),
        ].join('\n')

  return {
    blob: new Blob([payload], { type: format === 'json' ? 'application/json' : 'text/markdown' }),
    fileName: `${fileBase}.${format === 'json' ? 'json' : 'md'}`,
  }
}

function parseImportedThread(raw: string, fileName: string): { prompt: string; cwd: string } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (fileName.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(trimmed) as { thread?: { projectName?: string; cwd?: string; title?: string }; messages?: Array<{ role?: string; text?: string }> }
    const messages = Array.isArray(parsed.messages) ? parsed.messages : []
    const transcript = messages
      .filter((message) => typeof message.text === 'string' && message.text.trim().length > 0)
      .map((message) => `${(message.role ?? 'message').toUpperCase()}: ${message.text?.trim() ?? ''}`)
      .join('\n\n')
    if (!transcript) return null

    return {
      cwd: parsed.thread?.cwd?.trim() ?? '',
      prompt: [
        `Imported thread snapshot: ${parsed.thread?.title?.trim() || fileName}`,
        '',
        transcript,
      ].join('\n'),
    }
  }

  return {
    cwd: '',
    prompt: [
      `Imported thread snapshot: ${fileName}`,
      '',
      trimmed,
    ].join('\n'),
  }
}

function formatDiagnosticsTime(value: string): string {
  if (!value) return t('diagnostics_none')
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function findPreviousUserMessage(message: UiMessage): UiMessage | null {
  const messagesBeforeTarget = filteredMessages.value.filter((row) => {
    if (typeof message.turnIndex === 'number' && typeof row.turnIndex === 'number') {
      return row.turnIndex === message.turnIndex && row.role === 'user'
    }
    return false
  })
  if (messagesBeforeTarget.length > 0) {
    return messagesBeforeTarget[messagesBeforeTarget.length - 1] ?? null
  }

  const targetIndex = filteredMessages.value.findIndex((row) => row.id === message.id)
  for (let index = targetIndex - 1; index >= 0; index -= 1) {
    const row = filteredMessages.value[index]
    if (row?.role === 'user' && row.text.trim().length > 0) {
      return row
    }
  }
  return null
}

function normalizeMessageType(rawType: string | undefined, role: string): string {
  const normalized = (rawType ?? '').trim()
  if (normalized.length > 0) {
    return normalized
  }
  return role.trim() || 'message'
}

async function initialize(): Promise<void> {
  await refreshAll()
  hasInitialized.value = true
  await syncThreadSelectionWithRoute()
  startPolling()
}

async function refreshDiagnostics(): Promise<void> {
  isDiagnosticsLoading.value = true
  diagnosticsError.value = ''
  try {
    const [methods, notifications] = await Promise.all([
      getMethodCatalog(),
      getNotificationCatalog(),
    ])
    rpcMethodCatalog.value = methods
    rpcNotificationCatalog.value = notifications
    await refreshOpenClawRuntimeDiagnostics()
  } catch (error) {
    diagnosticsError.value = error instanceof Error ? error.message : t('diagnostics_load_failed')
  } finally {
    isDiagnosticsLoading.value = false
  }
}

async function syncThreadSelectionWithRoute(): Promise<void> {
  if (isRouteSyncInProgress.value) return
  isRouteSyncInProgress.value = true

  try {
    if (route.name === 'home') {
      if (selectedThreadId.value !== '') {
        await selectThread('')
      }
      return
    }

    if (route.name === 'thread') {
      const threadId = routeThreadId.value
      if (!threadId) return

      if (!knownThreadIdSet.value.has(threadId)) {
        await router.replace({ name: 'home' })
        return
      }

      if (selectedThreadId.value !== threadId) {
        await selectThread(threadId)
      }
      return
    }

    if (route.name === 'skills' || route.name === 'settings') {
      return
    }

  } finally {
    isRouteSyncInProgress.value = false
  }
}

watch(
  () =>
    [
      route.name,
      routeThreadId.value,
      isLoadingThreads.value,
      knownThreadIdSet.value.has(routeThreadId.value),
      selectedThreadId.value,
    ] as const,
  async () => {
    if (!hasInitialized.value) return
    await syncThreadSelectionWithRoute()
  },
)

watch(
  () => selectedThreadId.value,
  async (threadId) => {
    if (!hasInitialized.value) return
    if (isRouteSyncInProgress.value) return
    if (isHomeRoute.value || isSkillsRoute.value || isSettingsRoute.value) return

    if (!threadId) {
      if (route.name !== 'home') {
        await router.replace({ name: 'home' })
      }
      return
    }

    if (route.name === 'thread' && routeThreadId.value === threadId) return
    await router.replace({ name: 'thread', params: { threadId } })
  },
)

watch(
  () => newThreadFolderOptions.value,
  (options) => {
    if (options.length === 0) {
      newThreadCwd.value = ''
      return
    }
    const hasSelected = options.some((option) => option.value === newThreadCwd.value)
    if (!hasSelected) {
      newThreadCwd.value = options[0].value
    }
  },
  { immediate: true },
)

watch(
  () => activeProjectName.value,
  (projectName) => {
    projectInstructionsDraft.value = projectName ? getProjectPreference(projectName).instructions : ''
  },
  { immediate: true },
)

watch(
  () => isSettingsPanelOpen.value,
  (open) => {
    if (!open) return
    void refreshOpenClawDashboardStatus()
    void refreshOpenClawRuntimeDiagnostics()
  },
)

watch(
  () => isSettingsRoute.value,
  (open) => {
    if (!open) return
    void refreshOpenClawDashboardStatus()
    void refreshOpenClawRuntimeDiagnostics()
    void refreshDiagnostics()
  },
)

async function submitFirstMessageForNewThread(
  text: string,
  attachments: ComposerImageAttachment[],
  skills: ComposerSkillSelection[],
): Promise<void> {
  try {
    const threadId = await sendMessageToNewThread(text, newThreadCwd.value, attachments, skills)
    if (!threadId) return
    await router.replace({ name: 'thread', params: { threadId } })
  } catch {
    // Error is already reflected in state.
  }
}
</script>

<style scoped>
@reference "tailwindcss";

.sidebar-root {
  @apply min-h-full py-4 px-2 flex flex-col gap-2 select-none overflow-y-auto;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface-base) 86%, transparent), transparent 18%),
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent 38%);
}

.sidebar-root input,
.sidebar-root textarea {
  @apply select-text;
}

.sidebar-skills-link {
  @apply flex w-full flex-col items-start gap-1 rounded-[1rem] border px-3 py-3 text-left transition-colors duration-200;
  border-color: color-mix(in srgb, var(--border-subtle) 88%, transparent);
  background: color-mix(in srgb, var(--surface-elevated) 86%, transparent);
}

.sidebar-skills-link:hover,
.sidebar-skills-link-active {
  border-color: color-mix(in srgb, var(--accent-primary) 48%, var(--border-strong));
  background: color-mix(in srgb, var(--accent-primary) 10%, var(--surface-elevated));
}

.sidebar-skills-link-title {
  @apply text-sm font-semibold;
  color: var(--text-default);
}

.sidebar-skills-link-meta {
  @apply text-xs;
  color: var(--text-muted);
}

.content-root {
  @apply h-full min-h-0 w-full flex flex-col overflow-y-hidden overflow-x-visible;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 92%, transparent), var(--surface-base));
}

.global-settings-view {
  @apply flex min-h-0 flex-col gap-4 px-3 pb-6 pt-4 md:px-5;
}

.global-settings-hero {
  @apply rounded-[1.5rem] border px-4 py-4 md:px-5;
  border-color: var(--border-subtle);
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent-primary) 14%, transparent), transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 96%, transparent), var(--surface-base));
  box-shadow: var(--shadow-soft);
}

.global-settings-eyebrow {
  @apply m-0 text-[0.7rem] font-semibold uppercase tracking-[0.22em];
  color: var(--accent-primary);
}

.global-settings-title {
  @apply m-0 pt-2 text-xl font-semibold tracking-[-0.03em] md:text-2xl;
  color: var(--text-default);
  font-family: var(--font-display);
}

.global-settings-subtitle {
  @apply m-0 pt-2 text-sm leading-6;
  color: var(--text-muted);
}

.global-settings-grid {
  @apply grid min-h-0 gap-4 xl:grid-cols-2;
}

.settings-section-page {
  @apply p-4 md:p-5;
}

.settings-section-page-wide {
  @apply xl:col-span-2;
}

.settings-page-section-head {
  @apply mb-4 flex items-start justify-between gap-3;
}

.sidebar-thread-controls-host {
  @apply mt-1 -translate-y-px px-2 pb-1;
}

.sidebar-search-toggle {
  @apply h-6.75 w-6.75 rounded-md border flex items-center justify-center transition-colors duration-200;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-muted);
  box-shadow: var(--shadow-soft);
}

.sidebar-search-toggle[aria-pressed='true'] {
  border-color: color-mix(in srgb, var(--accent-primary) 50%, var(--border-strong));
  background: color-mix(in srgb, var(--accent-primary) 16%, var(--surface-elevated));
  color: var(--text-default);
}

.sidebar-search-toggle-icon {
  @apply w-4 h-4;
}

.sidebar-search-bar {
  @apply flex items-center gap-1.5 mx-2 px-2 py-1 rounded-md border transition-colors duration-200;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-soft);
}

.sidebar-search-bar-icon {
  @apply w-3.5 h-3.5 shrink-0;
  color: var(--text-muted);
}

.sidebar-search-input {
  @apply flex-1 min-w-0 bg-transparent text-sm outline-none border-none p-0;
  color: var(--text-default);
}

.sidebar-search-input::placeholder {
  color: var(--text-muted);
}

.sidebar-search-clear {
  @apply w-4 h-4 rounded flex items-center justify-center transition-colors duration-200;
  color: var(--text-muted);
}

.sidebar-search-clear:hover {
  color: var(--text-default);
}

.sidebar-search-clear-icon {
  @apply w-3.5 h-3.5;
}

.sidebar-thread-controls-header-host {
  @apply ml-1;
}

.content-body {
  @apply flex-1 min-h-0 w-full flex flex-col gap-3 pt-1 pb-4 overflow-y-auto overflow-x-visible;
}

.thread-search-bar {
  @apply mx-3 flex items-center gap-2 rounded-2xl border px-3 py-2;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-elevated) 94%, transparent);
  box-shadow: var(--shadow-soft);
}

.thread-search-bar-icon {
  @apply h-4 w-4 shrink-0;
  color: var(--text-muted);
}

.thread-search-input {
  @apply min-w-0 flex-1 border-none bg-transparent p-0 text-sm outline-none;
  color: var(--text-default);
}

.thread-search-input::placeholder {
  color: var(--text-muted);
}

.thread-search-meta {
  @apply text-[11px] uppercase tracking-[0.14em];
  color: var(--text-muted);
}

.thread-search-clear {
  @apply inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200;
  color: var(--text-muted);
}

.thread-search-clear:hover {
  color: var(--text-default);
  background: color-mix(in srgb, var(--surface-hover) 76%, transparent);
}

.thread-search-empty {
  @apply mb-3 rounded-2xl border px-4 py-3 text-sm;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-hover) 80%, transparent);
  color: var(--text-muted);
}

.content-error {
  @apply m-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700;
}

.content-grid {
  @apply flex-1 min-h-0 flex flex-col gap-3;
}

.content-thread {
  @apply flex-1 min-h-0;
}

.new-thread-empty {
  @apply flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto px-6 pb-4;
}

.new-thread-hero {
  @apply m-0 text-[2.5rem] font-black leading-[1.05] tracking-[-0.04em];
  color: var(--text-default);
  font-family: var(--font-display);
}

.new-thread-project-picker {
  @apply w-full max-w-2xl;
}

.new-thread-guide {
  @apply mt-3 max-w-xl text-center text-sm leading-6;
  color: var(--text-muted);
}

.openclaw-dashboard-link {
  @apply mt-auto mx-2 mb-1 flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium border text-left transition-colors duration-200 no-underline;
  color: var(--accent-primary);
  background: color-mix(in srgb, var(--accent-primary) 8%, var(--surface-elevated));
  border-color: color-mix(in srgb, var(--accent-primary) 24%, var(--border-strong));
  box-shadow: var(--shadow-soft);
}

.openclaw-dashboard-link:hover {
  background: color-mix(in srgb, var(--accent-primary) 14%, var(--surface-elevated));
  border-color: color-mix(in srgb, var(--accent-primary) 38%, var(--border-strong));
}

.openclaw-dashboard-icon {
  @apply w-4 h-4 shrink-0;
}

.openclaw-dashboard-label {
  @apply truncate;
}

.openclaw-dashboard-copy {
  @apply flex min-w-0 flex-1 flex-col;
}

.openclaw-dashboard-meta {
  @apply text-[11px] uppercase tracking-[0.14em];
  color: var(--text-muted);
}

.openclaw-dashboard-version {
  @apply pt-1 text-[11px] font-semibold uppercase tracking-[0.14em];
  color: color-mix(in srgb, var(--accent-primary) 72%, var(--text-default));
}

.ui-locale-label {
  @apply text-xs;
  color: var(--text-muted);
}

.project-instructions-input {
  @apply min-h-28 w-full rounded-2xl border px-3 py-3 text-sm outline-none transition-colors duration-200;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-default);
  box-shadow: var(--shadow-soft);
  resize: vertical;
}

.project-instructions-input:focus-visible {
  border-color: color-mix(in srgb, var(--accent-primary) 44%, var(--border-strong));
}

.ui-locale-select {
  @apply h-8 rounded-md border px-2 text-xs;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-default);
  box-shadow: var(--shadow-soft);
}

.header-settings-button {
  @apply h-9 w-9;
}

.header-global-settings-button {
  @apply shrink-0;
}

.header-settings-icon {
  @apply h-4 w-4;
}

.settings-section {
  @apply min-w-0 overflow-hidden rounded-2xl border px-4 py-2;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-elevated) 94%, transparent);
}

.settings-section-label {
  @apply m-0 text-[11px] font-semibold uppercase tracking-[0.22em];
  color: var(--text-muted);
}

.settings-accordion {
  @apply flex flex-col gap-3;
}

.settings-section-trigger {
  @apply flex min-w-0 w-full items-center justify-between gap-3 py-2 text-left outline-none;
}

.settings-section-chevron {
  @apply h-4 w-4 shrink-0 transition-transform duration-200;
  color: var(--text-muted);
}

.settings-section-trigger[data-state='open'] .settings-section-chevron {
  transform: rotate(180deg);
}

.settings-section-content {
  @apply min-w-0 flex flex-col gap-3 pb-3;
}

.debug-status-card {
  @apply rounded-2xl border px-3 py-3;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-hover) 80%, transparent);
}

.debug-status-card[data-state='online'] {
  border-color: color-mix(in srgb, var(--accent-success) 26%, var(--border-subtle));
}

.debug-status-detail {
  @apply mt-2 mb-0 text-sm leading-6 break-words;
  color: var(--text-muted);
}

.diagnostics-summary-grid {
  @apply grid gap-2 sm:grid-cols-2;
}

.diagnostics-card {
  @apply rounded-2xl border px-3 py-3;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-hover) 80%, transparent);
}

.diagnostics-card-wide {
  @apply sm:col-span-2;
}

.diagnostics-label {
  @apply m-0 text-[11px] font-semibold uppercase tracking-[0.18em];
  color: var(--text-muted);
}

.diagnostics-value {
  @apply mt-2 mb-0 break-all text-sm;
  color: var(--text-default);
}

.diagnostics-value-wrap {
  @apply break-words;
}

.diagnostics-inline-detail {
  @apply mt-2 mb-0 text-xs leading-5 break-words;
  color: var(--text-muted);
}

.diagnostics-refresh-button {
  @apply w-fit;
}

.diagnostics-error {
  @apply m-0 text-sm;
  color: #f87171;
}

.diagnostics-log-block {
  @apply flex flex-col gap-2;
}

.diagnostics-log-title {
  @apply m-0 text-[11px] font-semibold uppercase tracking-[0.18em];
  color: var(--text-muted);
}

.diagnostics-log-entry {
  @apply rounded-2xl border px-3 py-3;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-hover) 78%, transparent);
}

.diagnostics-log-entry-error {
  border-color: color-mix(in srgb, #f87171 32%, var(--border-subtle));
  background: color-mix(in srgb, #7f1d1d 18%, var(--surface-hover));
}

.diagnostics-log-row {
  @apply flex items-start justify-between gap-3;
}

.diagnostics-log-heading {
  @apply m-0 text-sm font-semibold;
  color: var(--text-default);
}

.diagnostics-log-time {
  @apply shrink-0 text-[11px] uppercase tracking-[0.14em];
  color: var(--text-muted);
}

.diagnostics-log-detail {
  @apply mt-2 mb-0 text-sm leading-6 break-words;
  color: var(--text-muted);
}

.diagnostics-log-pre {
  @apply m-0 overflow-x-auto rounded-2xl border px-3 py-3 text-xs leading-6 whitespace-pre-wrap;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-hover) 74%, transparent);
  color: var(--text-default);
}

.workflow-actions {
  @apply flex flex-wrap gap-2;
}

.workflow-status-message {
  @apply m-0 text-sm leading-6;
  color: var(--text-muted);
}

.thread-import-input {
  @apply hidden;
}

.saved-view-editor {
  @apply flex flex-col gap-2;
}

.saved-view-editor-row {
  @apply flex flex-wrap items-center gap-2;
}

.saved-view-input {
  @apply min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition-colors duration-200;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-default);
}

.saved-view-input::placeholder {
  color: var(--text-muted);
}

.saved-view-input:focus-visible {
  border-color: color-mix(in srgb, var(--accent-primary) 44%, var(--border-strong));
}

.saved-view-list {
  @apply flex flex-col gap-2;
}

.saved-view-card {
  @apply flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-3 py-3;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-hover) 80%, transparent);
}

.saved-view-copy {
  @apply min-w-0 flex-1;
}

.saved-view-name {
  @apply m-0 text-sm font-semibold;
  color: var(--text-default);
}

.saved-view-meta {
  @apply mt-1 mb-0 text-xs leading-5;
  color: var(--text-muted);
}

.saved-view-actions {
  @apply flex flex-wrap gap-2;
}

@media (max-width: 960px) {
  .sidebar-root {
    @apply px-2 py-3;
  }

  .content-root {
    @apply min-h-screen;
  }

  .content-body {
    @apply gap-2 overflow-y-auto px-0 pb-[max(0.75rem,env(safe-area-inset-bottom))];
  }

  .global-settings-view {
    @apply px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))];
  }

  .thread-search-bar {
    @apply mx-2;
  }

  .content-grid {
    @apply gap-2;
  }

  .new-thread-empty {
    @apply min-h-0 items-start justify-end px-4 pt-6 text-left;
  }

  .new-thread-hero {
    @apply text-[2rem];
  }

  .new-thread-project-picker {
    @apply max-w-none;
  }

  .new-thread-guide {
    @apply mt-2 text-left;
  }

  .header-settings-button {
    @apply h-10 w-10;
  }
}

</style>

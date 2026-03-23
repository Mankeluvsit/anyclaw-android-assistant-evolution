<template>
  <section class="conversation-root">
    <p v-if="isLoading" class="conversation-loading">{{ t('conversation_loading') }}</p>

    <p
      v-else-if="messages.length === 0 && pendingRequests.length === 0 && !liveOverlay"
      class="conversation-empty"
    >
      {{ t('conversation_empty') }}
    </p>

    <ScrollAreaRoot v-else class="conversation-scroll">
      <ScrollAreaViewport ref="conversationListRef" class="conversation-list" @scroll="onConversationScroll">
        <ul class="conversation-list-inner">
      <li
        v-for="request in pendingRequests"
        :key="`server-request:${request.id}`"
        class="conversation-item conversation-item-request"
      >
        <div class="message-row">
          <div class="message-stack">
            <article class="request-card">
              <p class="request-title">{{ request.method }}</p>
              <p class="request-meta">Request #{{ request.id }} · {{ formatIsoTime(request.receivedAtIso) }}</p>

              <p v-if="readRequestReason(request)" class="request-reason">{{ readRequestReason(request) }}</p>

              <section v-if="request.method === 'item/commandExecution/requestApproval'" class="request-actions">
                <button type="button" class="request-button request-button-primary" @click="onRespondApproval(request.id, 'accept')">{{ t('request_accept') }}</button>
                <button type="button" class="request-button" @click="onRespondApproval(request.id, 'acceptForSession')">{{ t('request_accept_session') }}</button>
                <button type="button" class="request-button" @click="onRespondApproval(request.id, 'decline')">{{ t('request_decline') }}</button>
                <button type="button" class="request-button" @click="onRespondApproval(request.id, 'cancel')">{{ t('request_cancel') }}</button>
              </section>

              <section v-else-if="request.method === 'item/fileChange/requestApproval'" class="request-actions">
                <button type="button" class="request-button request-button-primary" @click="onRespondApproval(request.id, 'accept')">{{ t('request_accept') }}</button>
                <button type="button" class="request-button" @click="onRespondApproval(request.id, 'acceptForSession')">{{ t('request_accept_session') }}</button>
                <button type="button" class="request-button" @click="onRespondApproval(request.id, 'decline')">{{ t('request_decline') }}</button>
                <button type="button" class="request-button" @click="onRespondApproval(request.id, 'cancel')">{{ t('request_cancel') }}</button>
              </section>

              <section v-else-if="request.method === 'item/tool/requestUserInput'" class="request-user-input">
                <div
                  v-for="question in readToolQuestions(request)"
                  :key="`${request.id}:${question.id}`"
                  class="request-question"
                >
                  <p class="request-question-title">{{ question.header || question.question }}</p>
                  <p v-if="question.header && question.question" class="request-question-text">{{ question.question }}</p>
                  <select
                    class="request-select"
                    :value="readQuestionAnswer(request.id, question.id, question.options[0] || '')"
                    @change="onQuestionAnswerChange(request.id, question.id, $event)"
                  >
                    <option v-for="option in question.options" :key="`${request.id}:${question.id}:${option}`" :value="option">
                      {{ option }}
                    </option>
                  </select>
                  <input
                    v-if="question.isOther"
                    class="request-input"
                    type="text"
                    :value="readQuestionOtherAnswer(request.id, question.id)"
                    :placeholder="t('request_other_answer')"
                    @input="onQuestionOtherAnswerInput(request.id, question.id, $event)"
                  />
                </div>

                <button type="button" class="request-button request-button-primary" @click="onRespondToolRequestUserInput(request)">
                  {{ t('request_submit_answers') }}
                </button>
              </section>

              <section v-else-if="request.method === 'item/tool/call'" class="request-actions">
                <button type="button" class="request-button request-button-primary" @click="onRespondToolCallFailure(request.id)">{{ t('request_fail_tool_call') }}</button>
                <button type="button" class="request-button" @click="onRespondToolCallSuccess(request.id)">{{ t('request_success_empty') }}</button>
              </section>

              <section v-else class="request-actions">
                <button type="button" class="request-button request-button-primary" @click="onRespondEmptyResult(request.id)">{{ t('request_return_empty') }}</button>
                <button type="button" class="request-button" @click="onRejectUnknownRequest(request.id)">{{ t('request_reject_unknown') }}</button>
              </section>
            </article>
          </div>
        </div>
      </li>

      <li
        v-for="message in messages"
        :key="message.id"
        class="conversation-item"
        :data-role="message.role"
        :data-message-type="message.messageType || ''"
      >
        <div class="message-row" :data-role="message.role" :data-message-type="message.messageType || ''">
          <div class="message-stack" :data-role="message.role">
            <article class="message-body" :data-role="message.role">
              <ul
                v-if="message.images && message.images.length > 0"
                class="message-image-list"
                :data-role="message.role"
              >
                <li v-for="imageUrl in message.images" :key="imageUrl" class="message-image-item">
                  <button class="message-image-button" type="button" @click="openImageModal(imageUrl)">
                    <img class="message-image-preview" :src="imageUrl" alt="Message image preview" loading="lazy" />
                  </button>
                </li>
              </ul>

              <article
                v-if="message.text.length > 0"
                class="message-card"
                :data-role="message.role"
              >
                <div v-if="message.messageType === 'worked'" class="worked-separator" aria-live="polite">
                  <span class="worked-separator-line" aria-hidden="true" />
                  <p class="worked-separator-text">{{ message.text }}</p>
                  <span class="worked-separator-line" aria-hidden="true" />
                </div>
                <ThreadMessageContent v-else :text="message.text" />
                <div
                  v-if="message.messageType !== 'worked' && (message.role === 'assistant' || message.role === 'user')"
                  class="message-actions-inline"
                >
                  <UiDropdownMenu :align="message.role === 'user' ? 'end' : 'start'">
                    <template #trigger>
                      <button class="message-action-trigger" type="button" :aria-label="t('message_action_more')">
                        <IconTablerDots class="message-action-trigger-icon" />
                      </button>
                    </template>
                    <UiDropdownMenuItem @select="onCopyMessage(message.id)">
                      {{ t('message_action_copy') }}
                    </UiDropdownMenuItem>
                    <UiDropdownMenuItem
                      v-if="message.role === 'user'"
                      @select="onEditMessage(message.id)"
                    >
                      {{ t('message_action_edit') }}
                    </UiDropdownMenuItem>
                    <UiDropdownMenuItem
                      v-if="message.role === 'user'"
                      @select="onResendMessage(message.id)"
                    >
                      {{ t('message_action_resend') }}
                    </UiDropdownMenuItem>
                    <UiDropdownMenuItem
                      v-if="message.role === 'assistant'"
                      @select="onRegenerateMessage(message.id)"
                    >
                      {{ t('message_action_regenerate') }}
                    </UiDropdownMenuItem>
                    <UiDropdownMenuItem
                      :disabled="typeof message.turnIndex !== 'number'"
                      @select="onDeleteFromMessage(message.id)"
                    >
                      {{ t('message_action_delete') }}
                    </UiDropdownMenuItem>
                    <UiDropdownMenuItem
                      :disabled="typeof message.turnIndex !== 'number'"
                      @select="onBranchFromMessage(message.id)"
                    >
                      {{ t('message_action_branch') }}
                    </UiDropdownMenuItem>
                  </UiDropdownMenu>
                </div>
              </article>
            </article>
          </div>
        </div>
      </li>
      <li v-if="liveOverlay" class="conversation-item conversation-item-overlay">
        <div class="message-row">
          <div class="message-stack">
            <article class="live-overlay-inline" aria-live="polite">
              <p class="live-overlay-label">{{ liveOverlay.activityLabel }}</p>
              <details
                v-if="liveOverlay.reasoningText"
                class="live-overlay-reasoning-shell"
                :open="liveOverlay.reasoningText.length < 220"
              >
                <summary class="live-overlay-reasoning-summary">{{ t('conversation_thinking_label') }}</summary>
                <p class="live-overlay-reasoning">
                  {{ liveOverlay.reasoningText }}
                </p>
              </details>
              <p v-if="liveOverlay.errorText" class="live-overlay-error">{{ liveOverlay.errorText }}</p>
            </article>
          </div>
        </div>
      </li>
          <li ref="bottomAnchorRef" class="conversation-bottom-anchor" />
        </ul>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar class="conversation-scrollbar" orientation="vertical">
        <ScrollAreaThumb class="conversation-scrollbar-thumb" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <div v-if="modalImageUrl.length > 0" class="image-modal-backdrop" @click="closeImageModal">
      <div class="image-modal-content" @click.stop>
        <button class="image-modal-close" type="button" :aria-label="t('image_preview_close')" @click="closeImageModal">
          <IconTablerX class="icon-svg" />
        </button>
        <img class="image-modal-image" :src="modalImageUrl" :alt="t('image_preview_close')" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'radix-vue'
import type { ThreadScrollState, UiLiveOverlay, UiMessage, UiServerRequest } from '../../types/codex'
import IconTablerDots from '../icons/IconTablerDots.vue'
import IconTablerX from '../icons/IconTablerX.vue'
import ThreadMessageContent from './ThreadMessageContent.vue'
import { useUiI18n } from '../../composables/useUiI18n'
import UiDropdownMenu from '../ui/UiDropdownMenu.vue'
import UiDropdownMenuItem from '../ui/UiDropdownMenuItem.vue'

const { t } = useUiI18n()

const props = defineProps<{
  messages: UiMessage[]
  pendingRequests: UiServerRequest[]
  liveOverlay: UiLiveOverlay | null
  isLoading: boolean
  activeThreadId: string
  scrollState: ThreadScrollState | null
}>()

const emit = defineEmits<{
  updateScrollState: [payload: { threadId: string; state: ThreadScrollState }]
  respondServerRequest: [payload: { id: number; result?: unknown; error?: { code?: number; message: string } }]
  copyMessage: [messageId: string]
  editMessage: [messageId: string]
  resendMessage: [messageId: string]
  regenerateMessage: [messageId: string]
  deleteFromMessage: [messageId: string]
  branchFromMessage: [messageId: string]
}>()

const conversationListRef = ref<HTMLElement | null>(null)
const bottomAnchorRef = ref<HTMLElement | null>(null)
const modalImageUrl = ref('')
const toolQuestionAnswers = ref<Record<string, string>>({})
const toolQuestionOtherAnswers = ref<Record<string, string>>({})
const BOTTOM_THRESHOLD_PX = 16
let scrollRestoreFrame = 0
let bottomLockFrame = 0
let bottomLockFramesLeft = 0
const trackedPendingImages = new WeakSet<HTMLImageElement>()

type ParsedToolQuestion = {
  id: string
  header: string
  question: string
  isOther: boolean
  options: string[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function formatIsoTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString()
}

function readRequestReason(request: UiServerRequest): string {
  const params = asRecord(request.params)
  const reason = params?.reason
  return typeof reason === 'string' ? reason.trim() : ''
}

function toolQuestionKey(requestId: number, questionId: string): string {
  return `${String(requestId)}:${questionId}`
}

function readToolQuestions(request: UiServerRequest): ParsedToolQuestion[] {
  const params = asRecord(request.params)
  const questions = Array.isArray(params?.questions) ? params.questions : []
  const parsed: ParsedToolQuestion[] = []

  for (const row of questions) {
    const question = asRecord(row)
    if (!question) continue
    const id = typeof question.id === 'string' ? question.id : ''
    if (!id) continue

    const options = Array.isArray(question.options)
      ? question.options
        .map((option) => asRecord(option))
        .map((option) => option?.label)
        .filter((option): option is string => typeof option === 'string' && option.length > 0)
      : []

    parsed.push({
      id,
      header: typeof question.header === 'string' ? question.header : '',
      question: typeof question.question === 'string' ? question.question : '',
      isOther: question.isOther === true,
      options,
    })
  }

  return parsed
}

function readQuestionAnswer(requestId: number, questionId: string, fallback: string): string {
  const key = toolQuestionKey(requestId, questionId)
  const saved = toolQuestionAnswers.value[key]
  if (typeof saved === 'string' && saved.length > 0) return saved
  return fallback
}

function readQuestionOtherAnswer(requestId: number, questionId: string): string {
  const key = toolQuestionKey(requestId, questionId)
  return toolQuestionOtherAnswers.value[key] ?? ''
}

function onQuestionAnswerChange(requestId: number, questionId: string, event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  const key = toolQuestionKey(requestId, questionId)
  toolQuestionAnswers.value = {
    ...toolQuestionAnswers.value,
    [key]: target.value,
  }
}

function onQuestionOtherAnswerInput(requestId: number, questionId: string, event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  const key = toolQuestionKey(requestId, questionId)
  toolQuestionOtherAnswers.value = {
    ...toolQuestionOtherAnswers.value,
    [key]: target.value,
  }
}

function onRespondApproval(requestId: number, decision: 'accept' | 'acceptForSession' | 'decline' | 'cancel'): void {
  emit('respondServerRequest', {
    id: requestId,
    result: { decision },
  })
}

function onRespondToolRequestUserInput(request: UiServerRequest): void {
  const questions = readToolQuestions(request)
  const answers: Record<string, { answers: string[] }> = {}

  for (const question of questions) {
    const selected = readQuestionAnswer(request.id, question.id, question.options[0] || '')
    const other = readQuestionOtherAnswer(request.id, question.id).trim()
    const values = [selected, other].map((value) => value.trim()).filter((value) => value.length > 0)
    answers[question.id] = { answers: values }
  }

  emit('respondServerRequest', {
    id: request.id,
    result: { answers },
  })
}

function onRespondToolCallFailure(requestId: number): void {
  emit('respondServerRequest', {
    id: requestId,
    result: {
      success: false,
      contentItems: [
        {
          type: 'inputText',
          text: 'Tool call rejected from codex-web-local UI.',
        },
      ],
    },
  })
}

function onRespondToolCallSuccess(requestId: number): void {
  emit('respondServerRequest', {
    id: requestId,
    result: {
      success: true,
      contentItems: [],
    },
  })
}

function onRespondEmptyResult(requestId: number): void {
  emit('respondServerRequest', {
    id: requestId,
    result: {},
  })
}

function onRejectUnknownRequest(requestId: number): void {
  emit('respondServerRequest', {
    id: requestId,
    error: {
      code: -32000,
      message: 'Rejected from codex-web-local UI.',
    },
  })
}

function scrollToBottom(): void {
  const container = conversationListRef.value
  const anchor = bottomAnchorRef.value
  if (!container || !anchor) return
  container.scrollTop = container.scrollHeight
  anchor.scrollIntoView({ block: 'end' })
}

function isAtBottom(container: HTMLElement): boolean {
  const distance = container.scrollHeight - (container.scrollTop + container.clientHeight)
  return distance <= BOTTOM_THRESHOLD_PX
}

function emitScrollState(container: HTMLElement): void {
  if (!props.activeThreadId) return
  const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0)
  const scrollRatio = maxScrollTop > 0 ? Math.min(Math.max(container.scrollTop / maxScrollTop, 0), 1) : 1
  emit('updateScrollState', {
    threadId: props.activeThreadId,
    state: {
      scrollTop: container.scrollTop,
      isAtBottom: isAtBottom(container),
      scrollRatio,
    },
  })
}

function applySavedScrollState(): void {
  const container = conversationListRef.value
  if (!container) return

  const savedState = props.scrollState
  if (!savedState || savedState.isAtBottom) {
    enforceBottomState()
    return
  }

  const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0)
  const targetScrollTop =
    typeof savedState.scrollRatio === 'number'
      ? savedState.scrollRatio * maxScrollTop
      : savedState.scrollTop
  container.scrollTop = Math.min(Math.max(targetScrollTop, 0), maxScrollTop)
  emitScrollState(container)
}

function enforceBottomState(): void {
  const container = conversationListRef.value
  if (!container) return
  scrollToBottom()
  emitScrollState(container)
}

function shouldLockToBottom(): boolean {
  const savedState = props.scrollState
  return !savedState || savedState.isAtBottom === true
}

function runBottomLockFrame(): void {
  if (!shouldLockToBottom()) {
    bottomLockFramesLeft = 0
    bottomLockFrame = 0
    return
  }

  enforceBottomState()
  bottomLockFramesLeft -= 1
  if (bottomLockFramesLeft <= 0) {
    bottomLockFrame = 0
    return
  }
  bottomLockFrame = requestAnimationFrame(runBottomLockFrame)
}

function scheduleBottomLock(frames = 6): void {
  if (!shouldLockToBottom()) return
  if (bottomLockFrame) {
    cancelAnimationFrame(bottomLockFrame)
    bottomLockFrame = 0
  }
  bottomLockFramesLeft = Math.max(frames, 1)
  bottomLockFrame = requestAnimationFrame(runBottomLockFrame)
}

function onPendingImageSettled(): void {
  scheduleBottomLock(3)
}

function bindPendingImageHandlers(): void {
  if (!shouldLockToBottom()) return
  const container = conversationListRef.value
  if (!container) return

  const images = container.querySelectorAll<HTMLImageElement>('img.message-image-preview')
  for (const image of images) {
    if (image.complete || trackedPendingImages.has(image)) continue
    trackedPendingImages.add(image)
    image.addEventListener('load', onPendingImageSettled, { once: true })
    image.addEventListener('error', onPendingImageSettled, { once: true })
  }
}

async function scheduleScrollRestore(): Promise<void> {
  await nextTick()
  if (scrollRestoreFrame) {
    cancelAnimationFrame(scrollRestoreFrame)
  }
  scrollRestoreFrame = requestAnimationFrame(() => {
    scrollRestoreFrame = 0
    applySavedScrollState()
    bindPendingImageHandlers()
    scheduleBottomLock()
  })
}

watch(
  () => props.messages,
  async () => {
    if (props.isLoading) return
    await scheduleScrollRestore()
  },
)

watch(
  () => props.liveOverlay,
  async (overlay) => {
    if (!overlay) return
    await nextTick()
    enforceBottomState()
    scheduleBottomLock(8)
  },
  { deep: true },
)

watch(
  () => props.isLoading,
  async (loading) => {
    if (loading) return
    await scheduleScrollRestore()
  },
)

watch(
  () => props.activeThreadId,
  () => {
    modalImageUrl.value = ''
  },
  { flush: 'post' },
)

function onConversationScroll(): void {
  const container = conversationListRef.value
  if (!container || props.isLoading) return
  emitScrollState(container)
}

function openImageModal(imageUrl: string): void {
  modalImageUrl.value = imageUrl
}

function closeImageModal(): void {
  modalImageUrl.value = ''
}

function onCopyMessage(messageId: string): void {
  emit('copyMessage', messageId)
}

function onEditMessage(messageId: string): void {
  emit('editMessage', messageId)
}

function onResendMessage(messageId: string): void {
  emit('resendMessage', messageId)
}

function onRegenerateMessage(messageId: string): void {
  emit('regenerateMessage', messageId)
}

function onDeleteFromMessage(messageId: string): void {
  emit('deleteFromMessage', messageId)
}

function onBranchFromMessage(messageId: string): void {
  emit('branchFromMessage', messageId)
}

onBeforeUnmount(() => {
  if (scrollRestoreFrame) {
    cancelAnimationFrame(scrollRestoreFrame)
  }
  if (bottomLockFrame) {
    cancelAnimationFrame(bottomLockFrame)
  }
})
</script>

<style scoped>
@reference "tailwindcss";

.conversation-root {
  @apply h-full min-h-0 p-0 flex flex-col overflow-y-hidden overflow-x-visible bg-transparent border-none rounded-none;
}

.conversation-loading {
  @apply m-0 px-6 text-sm;
  color: var(--text-muted);
}

.conversation-empty {
  @apply m-0 px-6 text-sm;
  color: var(--text-muted);
}

.conversation-list {
  @apply h-full min-h-0 overflow-y-auto overflow-x-visible;
}

.conversation-list-inner {
  @apply m-0 flex min-h-full list-none flex-col gap-6 px-4 py-0 sm:px-6;
}

.conversation-scroll {
  @apply h-full min-h-0;
}

.conversation-scrollbar {
  @apply flex w-3 touch-none select-none p-0.5;
}

.conversation-scrollbar-thumb {
  @apply relative flex-1 rounded-full;
  background: color-mix(in srgb, var(--border-strong) 88%, transparent);
}

.conversation-item {
  @apply m-0 w-full flex;
}

.conversation-item-request {
  @apply justify-center;
}

.conversation-item-overlay {
  @apply justify-center;
}

.message-row {
  @apply relative mx-auto flex w-full max-w-180;
}

.message-row[data-role='user'] {
  @apply justify-end;
}

.message-row[data-role='assistant'],
.message-row[data-role='system'] {
  @apply justify-start;
}

.conversation-bottom-anchor {
  @apply h-px;
}

.message-stack {
  @apply flex w-full flex-col gap-2;
}

.request-card {
  @apply w-full max-w-180 rounded-xl border px-4 py-3 flex flex-col gap-2;
  border-color: color-mix(in srgb, var(--accent-primary) 24%, var(--border-strong));
  background: color-mix(in srgb, var(--accent-primary) 8%, var(--surface-elevated));
  box-shadow: var(--shadow-soft);
}

.request-title {
  @apply m-0 text-sm leading-5 font-semibold;
  color: var(--text-default);
}

.request-meta {
  @apply m-0 text-xs leading-4;
  color: var(--text-muted);
}

.request-reason {
  @apply m-0 text-sm leading-5 whitespace-pre-wrap;
  color: var(--text-default);
}

.request-actions {
  @apply flex flex-wrap gap-2;
}

.request-button {
  @apply rounded-md border px-3 py-1.5 text-xs transition-colors duration-200;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-default);
}

.request-button-primary {
  border-color: color-mix(in srgb, var(--accent-primary) 54%, transparent);
  background: var(--accent-primary);
  color: var(--accent-on-primary);
}

.request-user-input {
  @apply flex flex-col gap-3;
}

.request-question {
  @apply flex flex-col gap-1;
}

.request-question-title {
  @apply m-0 text-sm leading-5 font-medium;
  color: var(--text-default);
}

.request-question-text {
  @apply m-0 text-xs leading-4;
  color: var(--text-muted);
}

.request-select {
  @apply h-8 rounded-md border px-2 text-sm;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-default);
}

.request-input {
  @apply h-8 rounded-md border px-2 text-sm;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-default);
}

.request-input::placeholder {
  color: var(--text-muted);
}

.live-overlay-inline {
  @apply flex w-full max-w-180 flex-col gap-2 rounded-2xl border px-4 py-3;
  border-color: color-mix(in srgb, var(--accent-primary) 18%, var(--border-subtle));
  background: color-mix(in srgb, var(--surface-elevated) 88%, transparent);
  box-shadow: var(--shadow-soft);
}

.live-overlay-label {
  @apply m-0 text-sm leading-5 font-medium;
  color: var(--text-default);
}

.live-overlay-reasoning-shell {
  @apply rounded-2xl border px-3 py-2;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-hover) 74%, transparent);
}

.live-overlay-reasoning-summary {
  @apply cursor-pointer text-[11px] font-semibold uppercase tracking-[0.16em];
  color: var(--text-muted);
}

.live-overlay-reasoning {
  @apply mb-0 mt-2 text-sm leading-6 whitespace-pre-wrap;
  color: var(--text-muted);
}

.live-overlay-error {
  @apply m-0 text-sm leading-5 text-rose-600 whitespace-pre-wrap;
}

.message-body {
  @apply flex flex-col max-w-full;
  width: fit-content;
}

.message-body[data-role='user'] {
  @apply ml-auto items-end;
  align-self: flex-end;
}

.message-image-list {
  @apply list-none m-0 mb-2 p-0 flex flex-wrap gap-2;
}

.message-image-list[data-role='user'] {
  @apply ml-auto justify-end;
}

.message-image-item {
  @apply m-0;
}

.message-image-button {
  @apply block rounded-xl overflow-hidden border p-0 transition-colors duration-200;
  border-color: var(--border-subtle);
  background: var(--surface-elevated);
}

.message-image-preview {
  @apply block w-16 h-16 object-cover;
}

.message-card {
  @apply flex max-w-[min(76ch,100%)] flex-col gap-3 px-0 py-0 bg-transparent border-none rounded-none;
}

.message-actions-inline {
  @apply flex pt-1;
}

.message-card[data-role='user'] .message-actions-inline {
  @apply justify-end;
}

.message-card[data-role='assistant'] .message-actions-inline,
.message-card[data-role='system'] .message-actions-inline {
  @apply justify-start;
}

.message-action-trigger {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-full border outline-none transition-colors duration-200;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
  color: var(--text-muted);
}

.message-action-trigger:hover {
  background: var(--surface-hover);
  color: var(--text-default);
}

.message-action-trigger-icon {
  @apply h-4 w-4;
}

.message-stack[data-role='user'] {
  @apply items-end;
}

.message-stack[data-role='assistant'],
.message-stack[data-role='system'] {
  @apply items-start;
}

.message-card[data-role='user'] {
  @apply rounded-2xl px-4 py-3 max-w-[min(560px,100%)];
  background: color-mix(in srgb, var(--accent-primary) 10%, var(--surface-hover));
  box-shadow: var(--shadow-soft);
  width: fit-content;
  margin-left: auto;
  align-self: flex-end;
}

.message-card[data-role='assistant'],
.message-card[data-role='system'] {
  @apply rounded-[1.4rem] border px-4 py-3;
  border-color: color-mix(in srgb, var(--border-subtle) 92%, transparent);
  background: color-mix(in srgb, var(--surface-elevated) 90%, transparent);
  box-shadow: var(--shadow-soft);
}

.conversation-item[data-message-type='worked'] .message-stack,
.conversation-item[data-message-type='worked'] .message-body,
.conversation-item[data-message-type='worked'] .message-card {
  @apply w-full max-w-full;
}

.worked-separator {
  @apply w-full flex items-center gap-4;
}

.worked-separator-line {
  @apply h-px flex-1;
  background: color-mix(in srgb, var(--border-strong) 82%, transparent);
}

.worked-separator-text {
  @apply m-0 text-sm leading-relaxed font-normal;
  color: var(--text-muted);
}

@media (max-width: 960px) {
  .conversation-list-inner {
    @apply gap-4 px-3;
  }

  .message-row {
    @apply max-w-full;
  }

  .message-card[data-role='assistant'],
  .message-card[data-role='system'],
  .message-card[data-role='user'] {
    max-width: min(100%, 42rem);
  }

  .message-card[data-role='assistant'],
  .message-card[data-role='system'] {
    @apply px-3.5 py-3;
  }

  .message-card[data-role='user'] {
    @apply px-3.5 py-3;
  }
}

.image-modal-backdrop {
  @apply fixed inset-0 z-50 bg-black/40 p-6 flex items-center justify-center;
}

.image-modal-content {
  @apply relative max-w-[min(92vw,1100px)] max-h-[92vh];
}

.image-modal-close {
  @apply absolute top-2 right-2 z-10 w-10 h-10 rounded-full border flex items-center justify-center;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
  color: var(--text-default);
}

.image-modal-image {
  @apply block max-w-full max-h-[90vh] rounded-2xl shadow-2xl;
  background: var(--surface-elevated);
}

.icon-svg {
  @apply w-5 h-5;
}
</style>

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { STORAGE_KEYS, POLLING_INTERVAL } from '@/constants'
import type { ChatMessage } from '@/types'
import {
  getStorageJson,
  setStorageJson,
  getFullStorageKey,
  safeJsonParse
} from '@/utils/storage'
import { generateMessageId } from '@/utils/generators'

/**
 * 채팅 스토어
 * 채팅 메시지 관리
 */
export const useChatStore = defineStore('chat', () => {
  // 채팅 메시지 목록
  const messages = ref<ChatMessage[]>(getStorageJson<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, []))

  /**
   * 메시지 전송
   */
  function sendMessage(
    sender: string,
    senderId: string,
    message: string,
    isTeacher: boolean
  ): void {
    const newMessage: ChatMessage = {
      id: generateMessageId(),
      sender,
      senderId,
      message,
      timestamp: Date.now(),
      isTeacher
    }
    messages.value.push(newMessage)
    setStorageJson(STORAGE_KEYS.CHAT_MESSAGES, messages.value)
    console.log('[Chat] 메시지 전송:', sender, message)
  }

  /**
   * 메시지 목록 새로고침
   */
  function refreshMessages(): void {
    messages.value = getStorageJson<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, [])
  }

  /**
   * 모든 메시지 삭제
   */
  function clearMessages(): void {
    messages.value = []
    setStorageJson(STORAGE_KEYS.CHAT_MESSAGES, [])
  }

  /**
   * 최근 N개 메시지 가져오기
   */
  function getRecentMessages(count: number = 50): ChatMessage[] {
    return messages.value.slice(-count)
  }

  // Watch: localStorage 자동 저장
  watch(messages, (newValue) => {
    setStorageJson(STORAGE_KEYS.CHAT_MESSAGES, newValue)
  }, { deep: true })

  // 폴링 설정
  let pollingInterval: ReturnType<typeof setInterval> | null = null

  function setupPolling(): void {
    if (typeof window === 'undefined') return

    // storage 이벤트 (다른 탭)
    window.addEventListener('storage', (e) => {
      const messagesKey = getFullStorageKey(STORAGE_KEYS.CHAT_MESSAGES)

      if (e.key === messagesKey && e.newValue !== null) {
        messages.value = safeJsonParse(e.newValue, [])
      }
    })

    // 폴링 (같은 탭)
    pollingInterval = setInterval(() => {
      const currentMessages = getStorageJson<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, [])
      if (messages.value.length !== currentMessages.length) {
        messages.value = currentMessages
      }
    }, POLLING_INTERVAL)
  }

  function stopPolling(): void {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  // 초기화 시 폴링 설정
  setupPolling()

  return {
    // State
    messages,

    // Actions
    sendMessage,
    refreshMessages,
    clearMessages,
    getRecentMessages,
    stopPolling
  }
})

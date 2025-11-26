import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { STORAGE_KEYS, DEFAULT_SPLIT_PERCENT, POLLING_INTERVAL } from '@/constants'
import {
  getStorageBoolean,
  setStorageBoolean,
  getStorageNumber,
  setStorageNumber,
  getFullStorageKey
} from '@/utils/storage'
import { useAuthStore } from './authStore'

/**
 * 집중 모드 스토어
 * 집중 모드, 화면 분할 비율, 콘텐츠 스크롤 위치 관리
 */
export const useFocusModeStore = defineStore('focusMode', () => {
  const authStore = useAuthStore()

  // 집중 모드 상태
  const focusMode = ref(getStorageBoolean(STORAGE_KEYS.FOCUS_MODE, false))

  // 화면 분할 비율 (0-100)
  const splitPercent = ref(getStorageNumber(STORAGE_KEYS.SPLIT_PERCENT, DEFAULT_SPLIT_PERCENT))

  // 콘텐츠 스크롤 위치
  const contentScrollPosition = ref(getStorageNumber(STORAGE_KEYS.CONTENT_SCROLL_POSITION, 0))

  // 콘텐츠 패널 너비 (판서 좌표 동기화용)
  const contentPaneWidth = ref(getStorageNumber(STORAGE_KEYS.CONTENT_PANE_WIDTH, 0))

  /**
   * 집중 모드 토글 (교사 전용)
   */
  function toggleFocusMode(): void {
    if (!authStore.isTeacher) {
      console.warn('[FocusMode] 학생은 집중 모드를 변경할 수 없습니다.')
      return
    }
    focusMode.value = !focusMode.value
  }

  /**
   * 집중 모드 설정 (교사 전용)
   */
  function setFocusMode(value: boolean): void {
    if (!authStore.isTeacher) {
      console.warn('[FocusMode] 학생은 집중 모드를 변경할 수 없습니다.')
      return
    }
    focusMode.value = value
  }

  /**
   * 화면 분할 비율 설정 (교사 전용)
   */
  function setSplitPercent(value: number): void {
    if (!authStore.isTeacher) {
      console.warn('[FocusMode] 학생은 화면 분할 비율을 변경할 수 없습니다.')
      return
    }
    splitPercent.value = value
  }

  /**
   * 콘텐츠 스크롤 위치 설정 (교사 전용)
   */
  function setContentScrollPosition(value: number): void {
    if (!authStore.isTeacher) return
    contentScrollPosition.value = value
  }

  /**
   * 콘텐츠 패널 너비 설정 (교사 전용)
   */
  function setContentPaneWidth(value: number): void {
    if (!authStore.isTeacher) return
    contentPaneWidth.value = value
  }

  // Watch: localStorage 자동 저장 (교사만)
  watch(focusMode, (newValue) => {
    if (authStore.isTeacher) {
      setStorageBoolean(STORAGE_KEYS.FOCUS_MODE, newValue)
    }
  })

  watch(splitPercent, (newValue) => {
    if (authStore.isTeacher) {
      setStorageNumber(STORAGE_KEYS.SPLIT_PERCENT, newValue)
    }
  })

  watch(contentScrollPosition, (newValue) => {
    if (authStore.isTeacher) {
      setStorageNumber(STORAGE_KEYS.CONTENT_SCROLL_POSITION, newValue)
    }
  })

  watch(contentPaneWidth, (newValue) => {
    if (authStore.isTeacher) {
      setStorageNumber(STORAGE_KEYS.CONTENT_PANE_WIDTH, newValue)
    }
  })

  // storage 이벤트 리스너 (학생 화면에서 교사 변경 감지)
  let pollingInterval: ReturnType<typeof setInterval> | null = null

  function setupPolling(): void {
    if (typeof window === 'undefined') return

    // storage 이벤트 (다른 탭)
    window.addEventListener('storage', (e) => {
      if (authStore.isTeacher) return

      const focusModeKey = getFullStorageKey(STORAGE_KEYS.FOCUS_MODE)
      const splitPercentKey = getFullStorageKey(STORAGE_KEYS.SPLIT_PERCENT)
      const scrollPositionKey = getFullStorageKey(STORAGE_KEYS.CONTENT_SCROLL_POSITION)
      const contentPaneWidthKey = getFullStorageKey(STORAGE_KEYS.CONTENT_PANE_WIDTH)

      if (e.key === focusModeKey && e.newValue !== null) {
        focusMode.value = e.newValue === 'true'
      }
      if (e.key === splitPercentKey && e.newValue !== null) {
        splitPercent.value = parseFloat(e.newValue)
      }
      if (e.key === scrollPositionKey && e.newValue !== null) {
        contentScrollPosition.value = parseInt(e.newValue)
      }
      if (e.key === contentPaneWidthKey && e.newValue !== null) {
        contentPaneWidth.value = parseInt(e.newValue)
      }
    })

    // 폴링 (같은 탭)
    pollingInterval = setInterval(() => {
      if (authStore.isTeacher) return

      const currentFocusMode = getStorageBoolean(STORAGE_KEYS.FOCUS_MODE, false)
      if (focusMode.value !== currentFocusMode) {
        focusMode.value = currentFocusMode
      }

      const currentSplitPercent = getStorageNumber(STORAGE_KEYS.SPLIT_PERCENT, DEFAULT_SPLIT_PERCENT)
      if (splitPercent.value !== currentSplitPercent) {
        splitPercent.value = currentSplitPercent
      }

      const currentScrollPosition = getStorageNumber(STORAGE_KEYS.CONTENT_SCROLL_POSITION, 0)
      if (contentScrollPosition.value !== currentScrollPosition) {
        contentScrollPosition.value = currentScrollPosition
      }

      const currentContentPaneWidth = getStorageNumber(STORAGE_KEYS.CONTENT_PANE_WIDTH, 0)
      if (contentPaneWidth.value !== currentContentPaneWidth) {
        contentPaneWidth.value = currentContentPaneWidth
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
    focusMode,
    splitPercent,
    contentScrollPosition,
    contentPaneWidth,

    // Actions
    toggleFocusMode,
    setFocusMode,
    setSplitPercent,
    setContentScrollPosition,
    setContentPaneWidth,
    stopPolling
  }
})

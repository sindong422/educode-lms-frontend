import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { STORAGE_KEYS, POLLING_INTERVAL } from '@/constants'
import type { WhiteboardPath, CurrentDrawingPath, WhiteboardPathsByStep } from '@/types'
import {
  getStorageBoolean,
  setStorageBoolean,
  getStorageJson,
  setStorageJson,
  getFullStorageKey,
  safeJsonParse
} from '@/utils/storage'
import { generatePathId } from '@/utils/generators'
import { useAuthStore } from './authStore'
import { useLessonStore } from './lessonStore'

/**
 * 판서 동기화 스토어
 * 화이트보드 경로, 활성화 상태, 실시간 그리기 데이터 관리
 * 레슨 단계별로 판서 데이터를 분리 저장
 */
export const useWhiteboardStore = defineStore('whiteboard', () => {
  const authStore = useAuthStore()
  const lessonStore = useLessonStore()

  // 단계별 판서 경로 목록 (step -> paths)
  const whiteboardPathsByStep = ref<WhiteboardPathsByStep>(
    getStorageJson<WhiteboardPathsByStep>(STORAGE_KEYS.WHITEBOARD_PATHS, {})
  )

  // 판서 활성화 상태
  const isWhiteboardActive = ref(getStorageBoolean(STORAGE_KEYS.WHITEBOARD_ACTIVE, false))

  // 실시간 그리기 데이터 (현재 그리는 중인 경로)
  const currentDrawingPath = ref<CurrentDrawingPath | null>(
    getStorageJson<CurrentDrawingPath | null>(STORAGE_KEYS.CURRENT_DRAWING_PATH, null)
  )

  /**
   * 현재 단계의 판서 경로 (computed)
   */
  const whiteboardPaths = computed<WhiteboardPath[]>(() => {
    const step = lessonStore.currentStep
    return whiteboardPathsByStep.value[step] || []
  })

  /**
   * 판서 경로 추가 (교사 전용)
   */
  function addWhiteboardPath(path: Omit<WhiteboardPath, 'id' | 'timestamp'>): void {
    if (!authStore.isTeacher) return

    const step = lessonStore.currentStep
    const newPath: WhiteboardPath = {
      ...path,
      id: generatePathId(),
      timestamp: Date.now()
    }

    // 해당 단계의 배열이 없으면 초기화
    if (!whiteboardPathsByStep.value[step]) {
      whiteboardPathsByStep.value[step] = []
    }

    whiteboardPathsByStep.value[step].push(newPath)
    console.log('[Whiteboard] 판서 경로 추가 (Step:', step, '):', newPath.id)
  }

  /**
   * 판서 경로 삭제 (교사 전용 - 지우개로 삭제 시)
   */
  function removeWhiteboardPath(pathId: string): void {
    if (!authStore.isTeacher) return

    const step = lessonStore.currentStep
    if (whiteboardPathsByStep.value[step]) {
      whiteboardPathsByStep.value[step] = whiteboardPathsByStep.value[step].filter(
        p => p.id !== pathId
      )
      console.log('[Whiteboard] 판서 경로 삭제 (Step:', step, '):', pathId)
    }
  }

  /**
   * 현재 단계 판서 전체 지우기 (교사 전용)
   */
  function clearWhiteboardPaths(): void {
    if (!authStore.isTeacher) return

    const step = lessonStore.currentStep
    whiteboardPathsByStep.value[step] = []
    console.log('[Whiteboard] 현재 단계 판서 전체 삭제 (Step:', step, ')')
  }

  /**
   * 모든 단계의 판서 전체 지우기 (교사 전용)
   */
  function clearAllWhiteboardPaths(): void {
    if (!authStore.isTeacher) return

    whiteboardPathsByStep.value = {}
    console.log('[Whiteboard] 모든 단계 판서 전체 삭제')
  }

  /**
   * 실시간 그리기 업데이트 (교사 전용)
   */
  function updateCurrentDrawingPath(pathData: CurrentDrawingPath | null): void {
    if (!authStore.isTeacher) return
    currentDrawingPath.value = pathData
  }

  /**
   * 판서 활성화 설정 (교사 전용)
   */
  function setWhiteboardActive(value: boolean): void {
    if (!authStore.isTeacher) return
    isWhiteboardActive.value = value
    console.log('[Whiteboard] 판서 활성화:', value)
  }

  // Watch: localStorage 자동 저장 (교사만)
  watch(whiteboardPathsByStep, (newValue) => {
    if (authStore.isTeacher) {
      setStorageJson(STORAGE_KEYS.WHITEBOARD_PATHS, newValue)
    }
  }, { deep: true })

  watch(isWhiteboardActive, (newValue) => {
    if (authStore.isTeacher) {
      setStorageBoolean(STORAGE_KEYS.WHITEBOARD_ACTIVE, newValue)
    }
  })

  watch(currentDrawingPath, (newValue) => {
    if (authStore.isTeacher) {
      setStorageJson(STORAGE_KEYS.CURRENT_DRAWING_PATH, newValue)
    }
  }, { deep: true })

  // 폴링 설정
  let pollingInterval: ReturnType<typeof setInterval> | null = null

  function setupPolling(): void {
    if (typeof window === 'undefined') return

    // storage 이벤트 (다른 탭)
    window.addEventListener('storage', (e) => {
      if (authStore.isTeacher) return

      const pathsKey = getFullStorageKey(STORAGE_KEYS.WHITEBOARD_PATHS)
      const activeKey = getFullStorageKey(STORAGE_KEYS.WHITEBOARD_ACTIVE)
      const drawingKey = getFullStorageKey(STORAGE_KEYS.CURRENT_DRAWING_PATH)

      if (e.key === pathsKey && e.newValue !== null) {
        whiteboardPathsByStep.value = safeJsonParse(e.newValue, {})
      }
      if (e.key === activeKey && e.newValue !== null) {
        isWhiteboardActive.value = e.newValue === 'true'
      }
      if (e.key === drawingKey && e.newValue !== null) {
        currentDrawingPath.value = safeJsonParse(e.newValue, null)
      }
    })

    // 폴링 (같은 탭)
    pollingInterval = setInterval(() => {
      if (authStore.isTeacher) return

      const currentPaths = getStorageJson<WhiteboardPathsByStep>(STORAGE_KEYS.WHITEBOARD_PATHS, {})
      if (JSON.stringify(whiteboardPathsByStep.value) !== JSON.stringify(currentPaths)) {
        whiteboardPathsByStep.value = currentPaths
      }

      const currentActive = getStorageBoolean(STORAGE_KEYS.WHITEBOARD_ACTIVE, false)
      if (isWhiteboardActive.value !== currentActive) {
        isWhiteboardActive.value = currentActive
      }

      const currentDrawing = getStorageJson<CurrentDrawingPath | null>(STORAGE_KEYS.CURRENT_DRAWING_PATH, null)
      if (JSON.stringify(currentDrawingPath.value) !== JSON.stringify(currentDrawing)) {
        currentDrawingPath.value = currentDrawing
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
    whiteboardPathsByStep,
    isWhiteboardActive,
    currentDrawingPath,

    // Getters
    whiteboardPaths,

    // Actions
    addWhiteboardPath,
    removeWhiteboardPath,
    clearWhiteboardPaths,
    clearAllWhiteboardPaths,
    updateCurrentDrawingPath,
    setWhiteboardActive,
    stopPolling
  }
})

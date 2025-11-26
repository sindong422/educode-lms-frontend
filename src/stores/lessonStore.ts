import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { STORAGE_KEYS, POLLING_INTERVAL } from '@/constants'
import { lessonContent, TOTAL_STEPS } from '@/data/lessonContent'
import { getInitialCode } from '@/data/taskContent'
import {
  getStorageNumber,
  setStorageNumber,
  getStorageItem,
  setStorageItem,
  getFullStorageKey
} from '@/utils/storage'
import { useAuthStore } from './authStore'
import { useFocusModeStore } from './focusModeStore'

/**
 * 학습 단계 스토어
 * 현재 학습 단계 및 콘텐츠 관리
 */
export const useLessonStore = defineStore('lesson', () => {
  const authStore = useAuthStore()
  const focusModeStore = useFocusModeStore()

  // 현재 학습 단계
  const currentStep = ref(getStorageNumber(STORAGE_KEYS.CURRENT_LESSON_STEP, 0))

  // 코드 에디터 내용
  const codeContent = ref(getStorageItem('lessonCode') || getInitialCode(currentStep.value))

  // 총 단계 수
  const totalSteps = computed(() => TOTAL_STEPS)

  // 현재 단계의 콘텐츠
  const currentContent = computed(() => lessonContent[currentStep.value] || lessonContent[0])

  /**
   * 학습 단계 설정 (교사 전용)
   */
  function setCurrentLessonStep(value: number): void {
    if (!authStore.isTeacher) {
      console.warn('[Lesson] 학생은 학습 단계를 변경할 수 없습니다.')
      return
    }
    currentStep.value = value
  }

  /**
   * 다음 단계로 이동
   */
  function nextStep(): void {
    if (currentStep.value < totalSteps.value - 1) {
      currentStep.value++
      // 새 단계의 초기 코드로 변경
      codeContent.value = getInitialCode(currentStep.value)
    }
  }

  /**
   * 이전 단계로 이동
   */
  function prevStep(): void {
    if (currentStep.value > 0) {
      currentStep.value--
      // 새 단계의 초기 코드로 변경
      codeContent.value = getInitialCode(currentStep.value)
    }
  }

  /**
   * 특정 단계로 이동
   */
  function goToStep(step: number): void {
    if (step >= 0 && step < totalSteps.value) {
      currentStep.value = step
      codeContent.value = getInitialCode(step)
    }
  }

  // Watch: localStorage 자동 저장 (교사만)
  watch(currentStep, (newValue) => {
    if (authStore.isTeacher) {
      setStorageNumber(STORAGE_KEYS.CURRENT_LESSON_STEP, newValue)
    }
  })

  watch(codeContent, (newValue) => {
    setStorageItem('lessonCode', newValue)
  })

  // 폴링 설정 (학생용)
  let pollingInterval: ReturnType<typeof setInterval> | null = null

  function setupPolling(): void {
    if (typeof window === 'undefined') return

    // storage 이벤트 (다른 탭) - 집중 모드일 때만 동기화
    window.addEventListener('storage', (e) => {
      if (authStore.isTeacher) return
      if (!focusModeStore.focusMode) return // 집중 모드가 아니면 무시

      const stepKey = getFullStorageKey(STORAGE_KEYS.CURRENT_LESSON_STEP)

      if (e.key === stepKey && e.newValue !== null) {
        currentStep.value = parseInt(e.newValue)
      }
    })

    // 폴링 (같은 탭) - 집중 모드일 때만 동기화
    pollingInterval = setInterval(() => {
      if (authStore.isTeacher) return
      if (!focusModeStore.focusMode) return // 집중 모드가 아니면 무시

      const currentStoredStep = getStorageNumber(STORAGE_KEYS.CURRENT_LESSON_STEP, 0)
      if (currentStep.value !== currentStoredStep) {
        currentStep.value = currentStoredStep
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
    currentStep,
    codeContent,

    // Getters
    totalSteps,
    currentContent,

    // Actions
    setCurrentLessonStep,
    nextStep,
    prevStep,
    goToStep,
    stopPolling
  }
})

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { STORAGE_KEYS, POLLING_INTERVAL } from '@/constants'
import type { CursorPosition } from '@/types'
import {
  getStorageBoolean,
  setStorageBoolean,
  getStorageItem,
  setStorageItem,
  getStorageJson,
  setStorageJson,
  getFullStorageKey
} from '@/utils/storage'
import { useAuthStore } from './authStore'

/**
 * 코드 공유 스토어
 * 교사 코드 공유 상태, 공유된 학생 코드, 커서 위치 관리
 */
export const useCodeShareStore = defineStore('codeShare', () => {
  const authStore = useAuthStore()

  // 교사 코드 공유 상태 (기본값: true)
  const shareCodeEditor = ref(getStorageBoolean(STORAGE_KEYS.SHARE_CODE_EDITOR, true))

  // 공유 코드 내용
  const sharedCodeContent = ref(getStorageItem(STORAGE_KEYS.CODE_CONTENT) || '')

  // 공유된 학생 코드 관련 상태
  const sharedStudentId = ref(getStorageItem(STORAGE_KEYS.SHARED_STUDENT_ID) || '')
  const sharedStudentName = ref(getStorageItem(STORAGE_KEYS.SHARED_STUDENT_NAME) || '')
  const sharedStudentCode = ref(getStorageItem(STORAGE_KEYS.SHARED_STUDENT_CODE) || '')

  // 교사 커서 위치
  const teacherCursorPosition = ref<CursorPosition | null>(
    getStorageJson<CursorPosition | null>(STORAGE_KEYS.TEACHER_CURSOR, null)
  )

  /**
   * 코드 공유 토글 (교사 전용)
   */
  function toggleShareCode(): void {
    if (!authStore.isTeacher) {
      console.warn('[CodeShare] 학생은 코드 공유를 변경할 수 없습니다.')
      return
    }
    shareCodeEditor.value = !shareCodeEditor.value
  }

  /**
   * 코드 공유 상태 설정 (교사 전용)
   */
  function setShareCodeEditor(value: boolean): void {
    if (!authStore.isTeacher) {
      console.warn('[CodeShare] 학생은 코드 공유를 변경할 수 없습니다.')
      return
    }
    shareCodeEditor.value = value
  }

  /**
   * 공유 코드 내용 설정 (교사 전용)
   */
  function setSharedCodeContent(value: string): void {
    if (!authStore.isTeacher) return
    sharedCodeContent.value = value
  }

  /**
   * 학생 코드 공유 설정 (교사 전용)
   */
  function shareStudentCode(studentId: string, studentName: string, code: string): void {
    if (!authStore.isTeacher) {
      console.warn('[CodeShare] 학생은 학생 코드를 공유할 수 없습니다.')
      return
    }
    sharedStudentId.value = studentId
    sharedStudentName.value = studentName
    sharedStudentCode.value = code
    console.log('[CodeShare] 학생 코드 공유:', studentName, '(ID:', studentId, ')')
  }

  /**
   * 학생 코드 공유 해제 (교사 전용)
   */
  function clearSharedStudentCode(): void {
    if (!authStore.isTeacher) {
      console.warn('[CodeShare] 학생은 학생 코드 공유를 해제할 수 없습니다.')
      return
    }
    console.log('[CodeShare] 학생 코드 공유 해제')
    sharedStudentId.value = ''
    sharedStudentName.value = ''
    sharedStudentCode.value = ''
  }

  /**
   * 교사 커서 위치 저장 (교사 전용)
   */
  function setTeacherCursorPosition(position: CursorPosition | null): void {
    if (!authStore.isTeacher) return
    teacherCursorPosition.value = position
    setStorageJson(STORAGE_KEYS.TEACHER_CURSOR, position)
  }

  /**
   * 교사 커서 위치 조회
   */
  function getTeacherCursorPosition(): CursorPosition | null {
    return getStorageJson<CursorPosition | null>(STORAGE_KEYS.TEACHER_CURSOR, null)
  }

  // Watch: localStorage 자동 저장 (교사만)
  watch(shareCodeEditor, (newValue) => {
    if (authStore.isTeacher) {
      setStorageBoolean(STORAGE_KEYS.SHARE_CODE_EDITOR, newValue)
    }
  })

  watch(sharedCodeContent, (newValue) => {
    if (authStore.isTeacher) {
      setStorageItem(STORAGE_KEYS.CODE_CONTENT, newValue)
    }
  })

  watch(sharedStudentId, (newValue) => {
    if (authStore.isTeacher) {
      setStorageItem(STORAGE_KEYS.SHARED_STUDENT_ID, newValue)
    }
  })

  watch(sharedStudentName, (newValue) => {
    if (authStore.isTeacher) {
      setStorageItem(STORAGE_KEYS.SHARED_STUDENT_NAME, newValue)
    }
  })

  watch(sharedStudentCode, (newValue) => {
    if (authStore.isTeacher) {
      setStorageItem(STORAGE_KEYS.SHARED_STUDENT_CODE, newValue)
    }
  })

  // 폴링 설정
  let pollingInterval: ReturnType<typeof setInterval> | null = null

  function setupPolling(): void {
    if (typeof window === 'undefined') return

    // storage 이벤트 (다른 탭)
    window.addEventListener('storage', (e) => {
      if (authStore.isTeacher) return

      const shareCodeKey = getFullStorageKey(STORAGE_KEYS.SHARE_CODE_EDITOR)
      const codeContentKey = getFullStorageKey(STORAGE_KEYS.CODE_CONTENT)
      const sharedStudentIdKey = getFullStorageKey(STORAGE_KEYS.SHARED_STUDENT_ID)
      const sharedStudentNameKey = getFullStorageKey(STORAGE_KEYS.SHARED_STUDENT_NAME)
      const sharedStudentCodeKey = getFullStorageKey(STORAGE_KEYS.SHARED_STUDENT_CODE)

      if (e.key === shareCodeKey && e.newValue !== null) {
        shareCodeEditor.value = e.newValue === 'true'
      }
      if (e.key === codeContentKey && e.newValue !== null) {
        sharedCodeContent.value = e.newValue
      }
      if (e.key === sharedStudentIdKey && e.newValue !== null) {
        sharedStudentId.value = e.newValue
      }
      if (e.key === sharedStudentNameKey && e.newValue !== null) {
        sharedStudentName.value = e.newValue
      }
      if (e.key === sharedStudentCodeKey && e.newValue !== null) {
        sharedStudentCode.value = e.newValue
      }
    })

    // 폴링 (같은 탭)
    pollingInterval = setInterval(() => {
      if (authStore.isTeacher) return

      const currentShareCode = getStorageBoolean(STORAGE_KEYS.SHARE_CODE_EDITOR, true)
      if (shareCodeEditor.value !== currentShareCode) {
        shareCodeEditor.value = currentShareCode
      }

      const currentCodeContent = getStorageItem(STORAGE_KEYS.CODE_CONTENT) || ''
      if (sharedCodeContent.value !== currentCodeContent) {
        sharedCodeContent.value = currentCodeContent
      }

      const currentSharedStudentId = getStorageItem(STORAGE_KEYS.SHARED_STUDENT_ID) || ''
      if (sharedStudentId.value !== currentSharedStudentId) {
        sharedStudentId.value = currentSharedStudentId
      }

      const currentSharedStudentName = getStorageItem(STORAGE_KEYS.SHARED_STUDENT_NAME) || ''
      if (sharedStudentName.value !== currentSharedStudentName) {
        sharedStudentName.value = currentSharedStudentName
      }

      const currentSharedStudentCode = getStorageItem(STORAGE_KEYS.SHARED_STUDENT_CODE) || ''
      if (sharedStudentCode.value !== currentSharedStudentCode) {
        sharedStudentCode.value = currentSharedStudentCode
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
    shareCodeEditor,
    sharedCodeContent,
    sharedStudentId,
    sharedStudentName,
    sharedStudentCode,
    teacherCursorPosition,

    // Actions
    toggleShareCode,
    setShareCodeEditor,
    setSharedCodeContent,
    shareStudentCode,
    clearSharedStudentCode,
    setTeacherCursorPosition,
    getTeacherCursorPosition,
    stopPolling
  }
})

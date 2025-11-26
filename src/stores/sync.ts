import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { WhiteboardPath, CurrentDrawingPath, CursorPosition, Student } from '@/types'
import { useAuthStore } from './authStore'
import { useFocusModeStore } from './focusModeStore'
import { useCodeShareStore } from './codeShareStore'
import { useWhiteboardStore } from './whiteboardStore'
import { useStudentStore } from './studentStore'
import { useLessonStore } from './lessonStore'

/**
 * 통합 Sync 스토어
 * 기존 useSyncStore와 동일한 인터페이스를 제공하여 호환성 유지
 * 내부적으로 분리된 스토어들을 조합하여 사용
 */
export const useSyncStore = defineStore('sync', () => {
  // 분리된 스토어들
  const authStore = useAuthStore()
  const focusModeStore = useFocusModeStore()
  const codeShareStore = useCodeShareStore()
  const whiteboardStore = useWhiteboardStore()
  const studentStore = useStudentStore()
  const lessonStore = useLessonStore()

  // ===== State (computed로 다른 스토어에서 가져옴) =====

  // Auth
  const isTeacher = computed(() => authStore.isTeacher)
  const teacherName = computed(() => authStore.teacherName)

  // Focus Mode
  const focusMode = computed(() => focusModeStore.focusMode)
  const splitPercent = computed(() => focusModeStore.splitPercent)
  const contentScrollPosition = computed(() => focusModeStore.contentScrollPosition)
  const syncedContentPaneWidth = computed(() => focusModeStore.contentPaneWidth)

  // Code Share
  const shareCodeEditor = computed(() => codeShareStore.shareCodeEditor)
  const sharedCodeContent = computed(() => codeShareStore.sharedCodeContent)
  const sharedStudentId = computed(() => codeShareStore.sharedStudentId)
  const sharedStudentName = computed(() => codeShareStore.sharedStudentName)
  const sharedStudentCode = computed(() => codeShareStore.sharedStudentCode)
  const teacherCursorPosition = computed(() => codeShareStore.teacherCursorPosition)

  // Whiteboard
  const whiteboardPaths = computed(() => whiteboardStore.whiteboardPaths)
  const isWhiteboardActive = computed(() => whiteboardStore.isWhiteboardActive)
  const currentDrawingPath = computed(() => whiteboardStore.currentDrawingPath)

  // Students
  const students = computed(() => studentStore.students)

  // Lesson
  const currentLessonStep = computed(() => lessonStore.currentStep)

  // ===== Actions (다른 스토어로 위임) =====

  // Auth
  function setTeacherRole(value: boolean): void {
    authStore.setTeacherRole(value)
  }

  function setTeacherName(name: string): void {
    authStore.setTeacherName(name)
  }

  // Focus Mode
  function toggleFocusMode(): void {
    focusModeStore.toggleFocusMode()
  }

  function setFocusMode(value: boolean): void {
    focusModeStore.setFocusMode(value)
  }

  function setSplitPercent(value: number): void {
    focusModeStore.setSplitPercent(value)
  }

  function setContentScrollPosition(value: number): void {
    focusModeStore.setContentScrollPosition(value)
  }

  function setSyncedContentPaneWidth(value: number): void {
    focusModeStore.setContentPaneWidth(value)
  }

  // Code Share
  function toggleShareCode(): void {
    codeShareStore.toggleShareCode()
  }

  function setShareCodeEditor(value: boolean): void {
    codeShareStore.setShareCodeEditor(value)
  }

  function setSharedCodeContent(value: string): void {
    codeShareStore.setSharedCodeContent(value)
  }

  function shareStudentCode(studentId: string, studentName: string): void {
    const code = studentStore.getStudentCode(studentId)
    codeShareStore.shareStudentCode(studentId, studentName, code)
  }

  function clearSharedStudentCode(): void {
    codeShareStore.clearSharedStudentCode()
  }

  function setTeacherCursorPosition(position: CursorPosition | null): void {
    codeShareStore.setTeacherCursorPosition(position)
  }

  function getTeacherCursorPosition(): CursorPosition | null {
    return codeShareStore.getTeacherCursorPosition()
  }

  // Whiteboard
  function addWhiteboardPath(path: Omit<WhiteboardPath, 'id' | 'timestamp'>): void {
    whiteboardStore.addWhiteboardPath(path)
  }

  function removeWhiteboardPath(pathId: string): void {
    whiteboardStore.removeWhiteboardPath(pathId)
  }

  function clearWhiteboardPaths(): void {
    whiteboardStore.clearWhiteboardPaths()
  }

  function updateCurrentDrawingPath(pathData: CurrentDrawingPath | null): void {
    whiteboardStore.updateCurrentDrawingPath(pathData)
  }

  function setWhiteboardActive(value: boolean): void {
    whiteboardStore.setWhiteboardActive(value)
  }

  // Students
  function registerStudent(studentId: string, studentName: string): void {
    studentStore.registerStudent(studentId, studentName)
  }

  function saveStudentCode(studentId: string, code: string): void {
    studentStore.saveStudentCode(studentId, code)
  }

  function getStudentCode(studentId: string): string {
    return studentStore.getStudentCode(studentId)
  }

  function saveStudentCursor(studentId: string, position: CursorPosition | null): void {
    studentStore.saveStudentCursor(studentId, position)
  }

  function getStudentCursor(studentId: string): CursorPosition | null {
    return studentStore.getStudentCursor(studentId)
  }

  function getStudentList(): Student[] {
    return studentStore.getStudentList()
  }

  // Lesson
  function setCurrentLessonStep(value: number): void {
    lessonStore.setCurrentLessonStep(value)
  }

  // Polling 정리
  function stopPolling(): void {
    focusModeStore.stopPolling()
    codeShareStore.stopPolling()
    whiteboardStore.stopPolling()
    studentStore.stopPolling()
    lessonStore.stopPolling()
    console.log('[Sync] 모든 폴링 중지됨')
  }

  return {
    // State (기존 인터페이스와 호환)
    isTeacher,
    teacherName,
    focusMode,
    splitPercent,
    contentScrollPosition,
    syncedContentPaneWidth,
    shareCodeEditor,
    sharedCodeContent,
    sharedStudentId,
    sharedStudentName,
    sharedStudentCode,
    teacherCursorPosition,
    whiteboardPaths,
    isWhiteboardActive,
    currentDrawingPath,
    students,
    currentLessonStep,

    // Actions (기존 인터페이스와 호환)
    setTeacherRole,
    setTeacherName,
    toggleFocusMode,
    setFocusMode,
    setSplitPercent,
    setContentScrollPosition,
    setSyncedContentPaneWidth,
    toggleShareCode,
    setShareCodeEditor,
    setSharedCodeContent,
    shareStudentCode,
    clearSharedStudentCode,
    setTeacherCursorPosition,
    getTeacherCursorPosition,
    addWhiteboardPath,
    removeWhiteboardPath,
    clearWhiteboardPaths,
    updateCurrentDrawingPath,
    setWhiteboardActive,
    registerStudent,
    saveStudentCode,
    getStudentCode,
    saveStudentCursor,
    getStudentCursor,
    getStudentList,
    setCurrentLessonStep,
    stopPolling
  }
})

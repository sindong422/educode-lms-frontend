import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { STORAGE_KEYS, POLLING_INTERVAL } from '@/constants'
import type { Student, CursorPosition } from '@/types'
import {
  getStorageJson,
  setStorageJson,
  getStorageItem,
  setStorageItem,
  getStudentStorageKey,
  getFullStorageKey,
  safeJsonParse
} from '@/utils/storage'
import { useAuthStore } from './authStore'

/**
 * 학생 관리 스토어
 * 학생 목록, 학생 코드, 학생 커서 위치 관리
 */
export const useStudentStore = defineStore('student', () => {
  const authStore = useAuthStore()

  // 학생 목록
  const students = ref<Student[]>(getStorageJson<Student[]>(STORAGE_KEYS.STUDENTS, []))

  /**
   * 학생 등록 (학생이 처음 접속 시 자동 등록)
   */
  function registerStudent(studentId: string, studentName: string): void {
    // 이미 등록된 학생인지 확인
    const existingStudent = students.value.find(s => s.id === studentId)
    if (existingStudent) {
      console.log('[Student] 이미 등록된 학생:', studentId)
      return
    }

    // 새 학생 추가
    students.value.push({ id: studentId, name: studentName })
    setStorageJson(STORAGE_KEYS.STUDENTS, students.value)
    console.log('[Student] ✅ 학생 등록 완료:', studentId, studentName)
    console.log('[Student] 전체 학생 목록:', students.value)
  }

  /**
   * 학생 코드 저장 (학생 전용)
   */
  function saveStudentCode(studentId: string, code: string): void {
    if (authStore.isTeacher) return
    const key = getStudentStorageKey(studentId, 'code')
    setStorageItem(key, code)
    console.log('[Student] 학생 코드 저장됨:', studentId, '길이:', code.length)
  }

  /**
   * 학생 코드 조회 (교사 전용)
   */
  function getStudentCode(studentId: string): string {
    const key = getStudentStorageKey(studentId, 'code')
    return getStorageItem(key) || ''
  }

  /**
   * 학생 커서 위치 저장 (학생 전용)
   */
  function saveStudentCursor(studentId: string, position: CursorPosition | null): void {
    if (authStore.isTeacher) return
    const key = getStudentStorageKey(studentId, 'cursor')
    setStorageJson(key, position)
  }

  /**
   * 학생 커서 위치 조회 (교사 전용)
   */
  function getStudentCursor(studentId: string): CursorPosition | null {
    const key = getStudentStorageKey(studentId, 'cursor')
    return getStorageJson<CursorPosition | null>(key, null)
  }

  /**
   * 학생 목록 조회
   */
  function getStudentList(): Student[] {
    return students.value
  }

  /**
   * 학생 이름으로 조회
   */
  function getStudentById(studentId: string): Student | undefined {
    return students.value.find(s => s.id === studentId)
  }

  // Watch: localStorage 자동 저장
  watch(students, (newValue) => {
    setStorageJson(STORAGE_KEYS.STUDENTS, newValue)
    console.log('[Student] 학생 목록 업데이트:', newValue)
  }, { deep: true })

  // 폴링 설정
  let pollingInterval: ReturnType<typeof setInterval> | null = null

  function setupPolling(): void {
    if (typeof window === 'undefined') return

    // storage 이벤트 (다른 탭)
    window.addEventListener('storage', (e) => {
      const studentsKey = getFullStorageKey(STORAGE_KEYS.STUDENTS)

      if (e.key === studentsKey && e.newValue !== null) {
        students.value = safeJsonParse(e.newValue, [])
      }
    })

    // 폴링 (같은 탭) - 학생 목록은 교사/학생 모두 폴링
    pollingInterval = setInterval(() => {
      const currentStudents = getStorageJson<Student[]>(STORAGE_KEYS.STUDENTS, [])
      if (JSON.stringify(students.value) !== JSON.stringify(currentStudents)) {
        console.log('[Student] 학생 목록 업데이트 (폴링):', currentStudents)
        students.value = currentStudents
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
    students,

    // Actions
    registerStudent,
    saveStudentCode,
    getStudentCode,
    saveStudentCursor,
    getStudentCursor,
    getStudentList,
    getStudentById,
    stopPolling
  }
})

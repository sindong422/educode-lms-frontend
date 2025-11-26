import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { STORAGE_KEYS, DEFAULT_TEACHER_NAME } from '@/constants'
import {
  getStorageBoolean,
  setStorageBoolean,
  getStorageItem,
  setStorageItem
} from '@/utils/storage'

/**
 * 인증/역할 관리 스토어
 * 교사/학생 역할 구분 및 교사 정보 관리
 */
export const useAuthStore = defineStore('auth', () => {
  // 교사/학생 역할
  const isTeacher = ref(getStorageBoolean(STORAGE_KEYS.IS_TEACHER, false))

  // 교사 이름
  const teacherName = ref(getStorageItem(STORAGE_KEYS.TEACHER_NAME) || DEFAULT_TEACHER_NAME)

  /**
   * 교사 역할 설정
   */
  function setTeacherRole(value: boolean): void {
    isTeacher.value = value
    setStorageBoolean(STORAGE_KEYS.IS_TEACHER, value)
    console.log('[Auth] 역할 설정:', value ? '교사' : '학생')
  }

  /**
   * 교사 이름 설정
   */
  function setTeacherName(name: string): void {
    if (!isTeacher.value) return
    teacherName.value = name
    setStorageItem(STORAGE_KEYS.TEACHER_NAME, name)
  }

  /**
   * 교사 전용 동작 래퍼
   * 교사가 아닌 경우 경고 출력
   */
  function teacherOnly<T>(action: () => T, actionName: string = '이 작업'): T | undefined {
    if (!isTeacher.value) {
      console.warn(`[Auth] 학생은 ${actionName}을(를) 수행할 수 없습니다.`)
      return undefined
    }
    return action()
  }

  return {
    // State
    isTeacher,
    teacherName,

    // Actions
    setTeacherRole,
    setTeacherName,
    teacherOnly
  }
})

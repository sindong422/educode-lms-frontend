import { STORAGE_PREFIX } from '@/constants'

/**
 * 안전한 JSON 파싱
 * @param value - 파싱할 문자열
 * @param fallback - 파싱 실패 시 반환할 기본값
 */
export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch (e) {
    console.warn('[Storage] JSON 파싱 실패, 기본값 사용:', (e as Error).message)
    return fallback
  }
}

/**
 * localStorage에서 값 읽기 (프리픽스 자동 적용)
 * @param key - 스토리지 키
 */
export function getStorageItem(key: string): string | null {
  return localStorage.getItem(`${STORAGE_PREFIX}${key}`)
}

/**
 * localStorage에 값 저장 (프리픽스 자동 적용)
 * @param key - 스토리지 키
 * @param value - 저장할 값
 */
export function setStorageItem(key: string, value: string): void {
  localStorage.setItem(`${STORAGE_PREFIX}${key}`, value)
}

/**
 * localStorage에서 값 삭제 (프리픽스 자동 적용)
 * @param key - 스토리지 키
 */
export function removeStorageItem(key: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
}

/**
 * localStorage에서 JSON 값 읽기 (프리픽스 자동 적용)
 * @param key - 스토리지 키
 * @param fallback - 파싱 실패 시 반환할 기본값
 */
export function getStorageJson<T>(key: string, fallback: T): T {
  const value = getStorageItem(key)
  return safeJsonParse(value, fallback)
}

/**
 * localStorage에 JSON 값 저장 (프리픽스 자동 적용)
 * @param key - 스토리지 키
 * @param value - 저장할 객체
 */
export function setStorageJson<T>(key: string, value: T): void {
  setStorageItem(key, JSON.stringify(value))
}

/**
 * localStorage에서 boolean 값 읽기
 * @param key - 스토리지 키
 * @param fallback - 기본값
 */
export function getStorageBoolean(key: string, fallback: boolean = false): boolean {
  const value = getStorageItem(key)
  if (value === null) return fallback
  return value === 'true'
}

/**
 * localStorage에 boolean 값 저장
 * @param key - 스토리지 키
 * @param value - 저장할 boolean 값
 */
export function setStorageBoolean(key: string, value: boolean): void {
  setStorageItem(key, value.toString())
}

/**
 * localStorage에서 number 값 읽기
 * @param key - 스토리지 키
 * @param fallback - 기본값
 */
export function getStorageNumber(key: string, fallback: number = 0): number {
  const value = getStorageItem(key)
  if (value === null) return fallback
  const parsed = parseFloat(value)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * localStorage에 number 값 저장
 * @param key - 스토리지 키
 * @param value - 저장할 number 값
 */
export function setStorageNumber(key: string, value: number): void {
  setStorageItem(key, value.toString())
}

/**
 * 학생별 스토리지 키 생성
 * @param studentId - 학생 ID
 * @param suffix - 키 접미사 (code, cursor 등)
 */
export function getStudentStorageKey(studentId: string, suffix: string): string {
  return `student:${studentId}:${suffix}`
}

/**
 * 전체 스토리지 키 생성 (프리픽스 포함)
 * @param key - 스토리지 키
 */
export function getFullStorageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`
}

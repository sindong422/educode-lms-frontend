import { ref, watch, onUnmounted, type Ref } from 'vue'
import { STORAGE_PREFIX, POLLING_INTERVAL } from '@/constants'
import { safeJsonParse } from '@/utils/storage'

/**
 * localStorage와 동기화되는 반응형 값을 생성합니다.
 * @param key - 스토리지 키 (프리픽스 자동 적용)
 * @param defaultValue - 기본값
 * @param options - 옵션
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: {
    /** localStorage 변경 감지 여부 (다른 탭/창에서의 변경) */
    listenToStorage?: boolean
    /** 폴링 사용 여부 (같은 탭에서의 변경) */
    polling?: boolean
    /** 폴링 간격 (ms) */
    pollingInterval?: number
    /** 쓰기 가능 여부 (false면 읽기 전용) */
    writable?: boolean
  } = {}
): Ref<T> {
  const {
    listenToStorage = true,
    polling = false,
    pollingInterval = POLLING_INTERVAL,
    writable = true
  } = options

  const fullKey = `${STORAGE_PREFIX}${key}`

  // localStorage에서 초기값 읽기
  const getStoredValue = (): T => {
    const stored = localStorage.getItem(fullKey)
    if (stored === null) return defaultValue

    // 타입에 따라 파싱
    if (typeof defaultValue === 'boolean') {
      return (stored === 'true') as T
    }
    if (typeof defaultValue === 'number') {
      const parsed = parseFloat(stored)
      return (isNaN(parsed) ? defaultValue : parsed) as T
    }
    if (typeof defaultValue === 'string') {
      return stored as T
    }
    // 객체/배열
    return safeJsonParse(stored, defaultValue)
  }

  const value = ref<T>(getStoredValue()) as Ref<T>

  // 값이 변경되면 localStorage에 저장
  if (writable) {
    watch(value, (newValue) => {
      if (newValue === null || newValue === undefined) {
        localStorage.removeItem(fullKey)
      } else if (typeof newValue === 'object') {
        localStorage.setItem(fullKey, JSON.stringify(newValue))
      } else {
        localStorage.setItem(fullKey, String(newValue))
      }
    }, { deep: true })
  }

  // storage 이벤트 리스너 (다른 탭에서의 변경 감지)
  if (listenToStorage && typeof window !== 'undefined') {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === fullKey && e.newValue !== null) {
        value.value = getStoredValue()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    onUnmounted(() => {
      window.removeEventListener('storage', handleStorageChange)
    })
  }

  // 폴링 (같은 탭에서의 변경 감지)
  let pollingIntervalId: ReturnType<typeof setInterval> | null = null
  if (polling && typeof window !== 'undefined') {
    pollingIntervalId = setInterval(() => {
      const stored = getStoredValue()
      const current = value.value

      // 깊은 비교
      const storedStr = typeof stored === 'object' ? JSON.stringify(stored) : String(stored)
      const currentStr = typeof current === 'object' ? JSON.stringify(current) : String(current)

      if (storedStr !== currentStr) {
        value.value = stored
      }
    }, pollingInterval)

    onUnmounted(() => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId)
      }
    })
  }

  return value
}

/**
 * localStorage 폴링을 수행하는 composable
 * 여러 키를 한번에 폴링합니다.
 */
export function useStoragePolling(
  callbacks: Record<string, (value: string | null) => void>,
  interval: number = POLLING_INTERVAL
): { stop: () => void } {
  let pollingIntervalId: ReturnType<typeof setInterval> | null = null

  if (typeof window !== 'undefined') {
    pollingIntervalId = setInterval(() => {
      Object.entries(callbacks).forEach(([key, callback]) => {
        const fullKey = `${STORAGE_PREFIX}${key}`
        const value = localStorage.getItem(fullKey)
        callback(value)
      })
    }, interval)

    onUnmounted(() => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId)
      }
    })
  }

  return {
    stop: () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId)
        pollingIntervalId = null
      }
    }
  }
}

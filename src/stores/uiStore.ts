import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWindowSize } from '@vueuse/core'

type MobileViewMode = 'content' | 'code'

/**
 * UI 상태 스토어
 * 모바일 감지, 뷰 모드 관리
 */
export const useUIStore = defineStore('ui', () => {
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value < 768)

  // Mobile View Mode: 'content' | 'code'
  const mobileViewMode = ref<MobileViewMode>('content')

  function toggleMobileView(): void {
    mobileViewMode.value = mobileViewMode.value === 'content' ? 'code' : 'content'
  }

  function setMobileViewMode(mode: MobileViewMode): void {
    mobileViewMode.value = mode
  }

  return {
    isMobile,
    mobileViewMode,
    toggleMobileView,
    setMobileViewMode
  }
})

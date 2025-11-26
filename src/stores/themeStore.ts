import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

type Theme = 'dark' | 'light'

/**
 * 테마 스토어
 * 다크/라이트 테마 관리
 */
export const useThemeStore = defineStore('theme', () => {
  // Initialize from localStorage or default to 'light'
  const savedTheme = localStorage.getItem('theme') as Theme | null
  const theme = ref<Theme>(savedTheme || 'light')

  function applyTheme(newTheme: Theme): void {
    if (newTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  // Apply initial theme
  applyTheme(theme.value)

  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(newTheme: Theme): void {
    theme.value = newTheme
  }

  // Watch for changes and save/apply
  watch(theme, (newTheme) => {
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  })

  return {
    theme,
    toggleTheme,
    setTheme
  }
})

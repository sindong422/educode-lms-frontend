<script setup>
import { useThemeStore } from '../../stores/themeStore'

const themeStore = useThemeStore()
</script>

<template>
  <button 
    class="theme-toggle-btn" 
    @click="themeStore.toggleTheme"
    :title="themeStore.theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'"
  >
    <!-- Sun Icon (for Dark Mode) -->
    <svg v-if="themeStore.theme === 'dark'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
    
    <!-- Moon Icon (for Light Mode) -->
    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s;
  cursor: pointer;
}

.theme-toggle-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
  transform: rotate(15deg);
}

/* 모바일 대응 */
@media (max-width: 768px) {
  .theme-toggle-btn {
    width: 36px;
    height: 36px;
  }

  .theme-toggle-btn svg {
    width: 18px;
    height: 18px;
  }
}
</style>

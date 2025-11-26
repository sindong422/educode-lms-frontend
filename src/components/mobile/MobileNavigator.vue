<script setup>
import { useUIStore } from '../../stores/uiStore'

const uiStore = useUIStore()
</script>

<template>
  <div class="mobile-nav glass-panel">
    <button 
      class="nav-item" 
      :class="{ active: uiStore.mobileViewMode === 'content' }"
      @click="uiStore.mobileViewMode = 'content'"
    >
      <span class="icon"></span>
      <span class="label">학습</span>
    </button>
    
    <button 
      class="nav-item" 
      :class="{ active: uiStore.mobileViewMode === 'code' }"
      @click="uiStore.mobileViewMode = 'code'"
    >
      <span class="icon"></span>
      <span class="label">실습</span>
    </button>
  </div>
</template>

<style scoped>
.mobile-nav {
  height: 44px;
  min-height: 44px;
  flex-shrink: 0;
  display: flex;
  border-top: 1px solid var(--glass-border);
  background: var(--bg-secondary);
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
  font-size: 0.9rem;
  font-weight: 600;
}

.nav-item.active {
  color: var(--text-accent);
  background: rgba(59, 130, 246, 0.1);
}

.icon {
  display: none;
}

.label {
  font-size: 0.9rem;
  font-weight: 600;
}
</style>

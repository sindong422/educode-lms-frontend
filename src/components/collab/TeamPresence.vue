<script setup>
import { ref } from 'vue'

const isOpen = ref(false)
const teamMembers = ref([
  { id: 0, name: '나', status: 'online', color: '#8b5cf6', isMe: true },
  { id: 1, name: 'Alice', status: 'online', color: '#10b981' },
  { id: 2, name: 'Bob', status: 'coding', color: '#3b82f6' },
  { id: 3, name: 'Charlie', status: 'offline', color: '#94a3b8' }
])
</script>

<template>
  <div class="team-presence">
    <button class="team-btn" @click="isOpen = !isOpen" :class="{ active: isOpen }">
      <span class="icon">👥</span>
      <span class="count">{{ teamMembers.filter(m => m.status !== 'offline').length }}</span>
    </button>
    
    <div v-if="isOpen" class="team-dropdown glass-panel">
      <h3>팀원 목록</h3>
      <div class="member-list">
        <div v-for="member in teamMembers" :key="member.id" class="member-item">
          <div class="avatar" :style="{ background: member.color }">
            {{ member.name[0] }}
            <div class="status-dot" :class="member.status"></div>
          </div>
          <div class="info">
            <span class="name">{{ member.name }}</span>
            <span class="status-text">{{ member.status }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-presence {
  position: relative;
}

.team-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: var(--disabled-bg);
  color: var(--text-primary);
  border: 1px solid transparent;
  transition: all 0.2s;
}

.team-btn:hover, .team-btn.active {
  background: var(--hover-bg);
  border-color: var(--text-accent);
}

.count {
  background: var(--text-accent);
  color: var(--bg-primary);
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-weight: bold;
}

.team-dropdown {
  position: absolute;
  top: 120%;
  right: 0;
  width: 250px;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  z-index: 1000;
  box-shadow: var(--shadow-xl);
}

.team-dropdown h3 {
  font-size: 0.9rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.member-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.member-item:hover {
  background: var(--disabled-bg);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  position: relative;
  color: white;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--bg-secondary);
}

.status-dot.online { background: var(--success-color); }
.status-dot.coding { background: var(--primary-color); }
.status-dot.offline { background: var(--text-secondary); }

.info {
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 0.9rem;
  font-weight: 500;
}

.status-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
</style>

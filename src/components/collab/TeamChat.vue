<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSyncStore } from '../../stores/sync'

const route = useRoute()
const syncStore = useSyncStore()
const newMessage = ref('')
const messagesContainer = ref(null)

// Props로 열림/닫힘 상태 제어
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:isOpen'])

// 로컬 스토리지 키
const CHAT_MESSAGES_KEY = 'educode:chat:messages'

// 교사/학생 모드
const isTeacher = computed(() => syncStore.isTeacher)
const currentUserName = computed(() => {
  if (isTeacher.value) {
    return '교사'
  }
  return route.query.studentName || '학생'
})
const currentUserId = computed(() => {
  if (isTeacher.value) {
    return 'teacher'
  }
  return route.query.studentId || 'student'
})

// 교사 정보
const teacher = { id: 'teacher', name: '교사', color: '#10b981' }

// 메시지 목록 (로컬 스토리지에서 로드)
const messages = ref([])

// 로컬 스토리지에서 메시지 로드
const loadMessages = () => {
  try {
    const stored = localStorage.getItem(CHAT_MESSAGES_KEY)
    if (stored) {
      messages.value = JSON.parse(stored)
    } else {
      // 초기 메시지
      messages.value = [
        { id: Date.now(), userId: 'teacher', text: '안녕하세요! 궁금한 점이 있으면 언제든지 물어보세요.', timestamp: Date.now() }
      ]
      saveMessages()
    }
  } catch (e) {
    console.error('메시지 로드 실패:', e)
    messages.value = []
  }
}

// 로컬 스토리지에 메시지 저장
const saveMessages = () => {
  try {
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages.value))
  } catch (e) {
    console.error('메시지 저장 실패:', e)
  }
}

// 메시지 전송
const sendMessage = () => {
  if (!newMessage.value.trim()) return

  const message = {
    id: Date.now(),
    userId: currentUserId.value,
    userName: currentUserName.value,
    text: newMessage.value,
    timestamp: Date.now()
  }

  messages.value.push(message)
  saveMessages()
  newMessage.value = ''
  scrollToBottom()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 메시지 개수 변경 감지
watch(() => messages.value.length, scrollToBottom)

// 사용자 정보 가져오기
const getUser = (msg) => {
  if (msg.userId === 'teacher') {
    return teacher
  }
  // 학생 메시지
  return {
    name: msg.userName || '학생',
    color: '#3b82f6'
  }
}

// 시간 포맷
const formatTime = (ts) => {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Storage 이벤트 리스너 (다른 탭에서 메시지 추가 시 동기화)
const handleStorageChange = (e) => {
  if (e.key === CHAT_MESSAGES_KEY && e.newValue) {
    try {
      messages.value = JSON.parse(e.newValue)
      scrollToBottom()
    } catch (error) {
      console.error('Storage 이벤트 처리 실패:', error)
    }
  }
}

onMounted(() => {
  loadMessages()
  window.addEventListener('storage', handleStorageChange)
  scrollToBottom()
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
})

// 채팅 제목
const chatTitle = computed(() => {
  if (isTeacher.value) {
    return '학생 문의'
  }
  return '교사 문의'
})

// 플레이스홀더
const placeholder = computed(() => {
  if (isTeacher.value) {
    return '학생에게 메시지를 보내세요...'
  }
  return '교사에게 메시지를 보내세요...'
})

// 읽지 않은 메시지 개수 (자신이 보낸 메시지 제외)
const unreadCount = computed(() => {
  return messages.value.filter(msg => msg.userId !== currentUserId.value).length
})

// 외부에서 사용할 수 있도록 unreadCount 노출
defineExpose({
  unreadCount
})
</script>

<template>
  <div v-if="props.isOpen" class="chat-dropdown glass-panel">
    <div class="chat-header-title">
      <h3>{{ chatTitle }}</h3>
    </div>

    <div class="messages-list" ref="messagesContainer">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-item"
        :class="{ 'own-message': msg.userId === currentUserId }"
      >
        <div class="msg-header">
          <span class="sender" :style="{ color: getUser(msg).color }">{{ getUser(msg).name }}</span>
          <span class="time">{{ formatTime(msg.timestamp) }}</span>
        </div>
        <div class="msg-content">{{ msg.text }}</div>
      </div>
    </div>

    <div class="input-area">
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
        :placeholder="placeholder"
        type="text"
      />
      <button @click="sendMessage">전송</button>
    </div>
  </div>
</template>

<style scoped>
.chat-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 320px;
  max-height: 450px;
  margin-top: 0.5rem;
  border-radius: var(--radius-md);
  z-index: 1000;
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.chat-header-title {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.chat-header-title h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 250px;
  max-height: 300px;
}

.message-item {
  background: var(--bg-secondary);
  padding: 8px;
  border-radius: 8px;
  max-width: 85%;
  border: 1px solid var(--border-color);
}

.own-message {
  align-self: flex-end;
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

.msg-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 4px;
}

.sender {
  font-weight: bold;
}

.time {
  color: var(--text-secondary);
}

.msg-content {
  font-size: 0.9rem;
  line-height: 1.4;
}

.input-area {
  padding: var(--spacing-md);
  display: flex;
  gap: 8px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.input-area input {
  flex: 1;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 0 12px;
  height: 36px;
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.input-area input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.input-area button {
  background: var(--primary-color);
  color: white;
  padding: 0 12px;
  height: 36px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

/* 모바일 대응 */
@media (max-width: 768px) {
  .chat-dropdown {
    position: fixed !important;
    top: 60px !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 60px !important;
    width: 100% !important;
    height: calc(100vh - 120px) !important;
    height: calc(100dvh - 120px) !important;
    max-height: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
    background: var(--bg-primary) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: none !important;
    z-index: 9999 !important;
  }

  .messages-list {
    max-height: none !important;
    flex: 1 !important;
  }
}
</style>

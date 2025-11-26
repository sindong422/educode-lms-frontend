<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SplitPane from '../../components/layout/SplitPane.vue'
import ContentPane from '../../components/content/ContentPane.vue'
import CodingPane from '../../components/editor/CodingPane.vue'
import SharedWhiteboard from '../../components/collab/SharedWhiteboard.vue'
import ThemeToggle from '../../components/common/ThemeToggle.vue'
import TeamChat from '../../components/collab/TeamChat.vue'
import MobileNavigator from '../../components/mobile/MobileNavigator.vue'
import { useSyncStore } from '../../stores/sync'
import { useUIStore } from '../../stores/uiStore'

// Stores
const syncStore = useSyncStore()
const uiStore = useUIStore()

// 🔧 교사 역할을 즉시 설정 (자식 컴포넌트 마운트 전에 실행됨)
syncStore.setTeacherRole(true)

// 채팅 상태
const isChatOpen = ref(false)
const chatRef = ref(null)

const isFocusMode = computed(() => syncStore.focusMode)
const isWhiteboardActive = ref(false)

// 판서 표시 여부: 판서 모드가 켜져있거나 저장된 판서 내역이 있으면 표시
const shouldShowWhiteboard = computed(() =>
  isWhiteboardActive.value || syncStore.whiteboardPaths.length > 0
)

// 현재 차시 정보
const currentChapter = {
  number: 1,
  title: '자바 기초 문법'
}

const toggleFocusMode = () => {
  syncStore.toggleFocusMode()
  // 판서 모드 + 집중 모드 활성화 시 콘텐츠 너비 동기화
  if (isWhiteboardActive.value && !isFocusMode.value) {
    // 토글 후 true가 되므로 현재 false일 때 동기화
    updateContentPaneWidth()
  }
}

const toggleWhiteboard = () => {
  isWhiteboardActive.value = !isWhiteboardActive.value
  syncStore.setWhiteboardActive(isWhiteboardActive.value)
  // 판서 모드 + 집중 모드 활성화 시 콘텐츠 너비 동기화
  if (isWhiteboardActive.value && isFocusMode.value) {
    updateContentPaneWidth()
  }
}

// 판서 이벤트 핸들러
const handlePathAdded = (path) => {
  syncStore.addWhiteboardPath(path)
}

const handlePathRemoved = (pathId) => {
  syncStore.removeWhiteboardPath(pathId)
}

const handleDrawingUpdate = (pathData) => {
  syncStore.updateCurrentDrawingPath(pathData)
}

const handleWhiteboardClear = () => {
  syncStore.clearWhiteboardPaths()
}

// 화면 분할 비율 변경 시 sync store 업데이트
const handleSplitChange = (percent) => {
  syncStore.setSplitPercent(percent)
  updateContentPaneWidth()
}

// 콘텐츠 패널 너비 계산 (판서 좌표 정규화용)
const workspaceRef = ref(null)
const contentPaneWidth = ref(0)
const screenWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1920)

const updateContentPaneWidth = () => {
  if (workspaceRef.value) {
    contentPaneWidth.value = workspaceRef.value.clientWidth * (syncStore.splitPercent / 100)
    // 판서 모드 + 집중 모드일 때 학생에게 콘텐츠 너비 동기화
    if (isWhiteboardActive.value && isFocusMode.value) {
      syncStore.setSyncedContentPaneWidth(contentPaneWidth.value)
    }
  }
}

const updateScreenWidth = () => {
  screenWidth.value = window.innerWidth
}

onMounted(() => {
  updateContentPaneWidth()
  updateScreenWidth()
  window.addEventListener('resize', updateContentPaneWidth)
  window.addEventListener('resize', updateScreenWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContentPaneWidth)
  window.removeEventListener('resize', updateScreenWidth)
})
</script>

<template>
  <div class="teacher-course-view">
    <!-- Desktop View -->
    <div v-if="!uiStore.isMobile" class="desktop-layout">
      <!-- Teacher Header -->
      <header class="teacher-header glass-panel">
        <div class="left-controls">
          <button class="back-btn" @click="$router.back()" title="뒤로가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2 class="title">{{ currentChapter.title }}</h2>
          <div class="live-badge" v-if="isFocusMode">LIVE</div>
        </div>

        <div class="right-controls">
          <ThemeToggle />
          <div class="chat-container" style="position: relative;">
            <button class="chat-btn" @click="isChatOpen = !isChatOpen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span v-if="chatRef?.unreadCount > 0" class="chat-badge">{{ chatRef.unreadCount }}</span>
            </button>
            <TeamChat :isOpen="isChatOpen" ref="chatRef" />
          </div>
          <button
            class="control-btn"
            :class="{ active: isWhiteboardActive }"
            @click="toggleWhiteboard"
          >
            판서 {{ isWhiteboardActive ? 'ON' : 'OFF' }}
          </button>
          <button
            class="control-btn"
            :class="{ active: isFocusMode }"
            @click="toggleFocusMode"
          >
            {{ isFocusMode ? '집중학습 ON' : '집중학습 OFF' }}
          </button>
        </div>
      </header>

      <!-- Main Content Area (Split Pane like Student) -->
      <div class="content-area">
        <div class="workspace" ref="workspaceRef">
          <SplitPane :initialSplit="40" @split-change="handleSplitChange">
            <template #first>
              <div class="content-with-whiteboard">
                <ContentPane />
                <!-- Whiteboard Overlay (콘텐츠 영역 안에 배치) -->
                <div class="whiteboard-overlay" v-if="shouldShowWhiteboard">
                  <SharedWhiteboard
                    mode="teacher"
                    :transparent="true"
                    :contentScrollPosition="syncStore.contentScrollPosition"
                    :contentPaneWidth="contentPaneWidth"
                    :drawingEnabled="isWhiteboardActive"
                    :syncedPaths="syncStore.whiteboardPaths"
                    @pathAdded="handlePathAdded"
                    @pathRemoved="handlePathRemoved"
                    @drawingUpdate="handleDrawingUpdate"
                    @clear="handleWhiteboardClear"
                  />
                </div>
              </div>
            </template>
            <template #second>
              <CodingPane />
            </template>
          </SplitPane>
        </div>
      </div>
    </div>

    <!-- Mobile View -->
    <div v-else class="mobile-layout">
      <header class="mobile-top-bar glass-panel">
        <div class="left-controls">
          <button class="back-btn" @click="$router.back()" title="뒤로가기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2 class="title">{{ currentChapter.title }}</h2>
          <div class="live-badge" v-if="isFocusMode">LIVE</div>
        </div>
        <div class="right-actions" style="display: flex; gap: 0.5rem; align-items: center;">
          <ThemeToggle />
          <div class="chat-container" style="position: relative;">
            <button class="chat-btn-mobile" @click="isChatOpen = !isChatOpen">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span v-if="chatRef?.unreadCount > 0" class="chat-badge">{{ chatRef.unreadCount }}</span>
            </button>
            <TeamChat :isOpen="isChatOpen" ref="chatRef" />
          </div>
          <button
            class="control-btn-mobile"
            :class="{ active: isWhiteboardActive }"
            @click="toggleWhiteboard"
            title="판서"
          >
            판서
          </button>
          <button
            class="control-btn-mobile"
            :class="{ active: isFocusMode }"
            @click="toggleFocusMode"
            title="집중학습"
          >
            집중
          </button>
        </div>
      </header>

      <div class="mobile-content" v-show="uiStore.mobileViewMode === 'content'">
        <ContentPane />
        <!-- Whiteboard Overlay for Mobile (콘텐츠 영역 안에 배치) -->
        <div class="whiteboard-overlay" v-if="shouldShowWhiteboard">
          <SharedWhiteboard
            mode="teacher"
            :transparent="true"
            :contentScrollPosition="syncStore.contentScrollPosition"
            :contentPaneWidth="screenWidth"
            :drawingEnabled="isWhiteboardActive"
            :syncedPaths="syncStore.whiteboardPaths"
            @pathAdded="handlePathAdded"
            @pathRemoved="handlePathRemoved"
            @drawingUpdate="handleDrawingUpdate"
            @clear="handleWhiteboardClear"
          />
        </div>
      </div>
      <div class="mobile-code" v-show="uiStore.mobileViewMode === 'code'">
        <CodingPane />
      </div>

      <MobileNavigator />
    </div>
  </div>
</template>

<style scoped>
.teacher-course-view {
  width: 100vw;
  height: 100vh;
  height: 100dvh; /* iOS Safari 대응 */
  background: var(--bg-primary);
  color: var(--text-primary);
}

.desktop-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.teacher-header {
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  z-index: 20;
}

.left-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.title {
  font-size: 1.1rem;
  font-weight: bold;
}

.live-badge {
  background: var(--error-color);
  color: white;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: bold;
  animation: pulse 2s infinite;
}

.right-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.8rem;
  white-space: nowrap;
  transition: all 0.2s;
}

.control-btn:hover {
  background: var(--bg-tertiary);
}

.control-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.content-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.workspace {
  width: 100%;
  height: 100%;
}

.content-with-whiteboard {
  width: 100%;
  height: 100%;
  position: relative; /* 화이트보드 오버레이 기준점 */
}

.whiteboard-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000; /* Above code editor */
  pointer-events: none; /* Let clicks pass through, canvas/toolbar handle their own */
}

/* Mobile Layout */
.mobile-layout {
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mobile-top-bar {
  height: 45px;
  min-height: 45px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  border-bottom: 1px solid var(--border-color);
  position: relative;
  z-index: 50;
}

.right-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.control-btn-mobile {
  padding: 0.3rem 0.6rem;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.control-btn-mobile:hover {
  background: var(--bg-tertiary);
}

.control-btn-mobile.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.chat-container {
  position: relative;
}

.chat-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.chat-btn:hover {
  background: var(--bg-tertiary);
}

.chat-btn-mobile {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.chat-btn-mobile:hover {
  background: var(--bg-tertiary);
}

.chat-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--danger-color);
  color: white;
  font-size: 0.6rem;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 700;
  padding: 0 3px;
  box-shadow: 0 2px 4px var(--shadow-color);
  border: 2px solid var(--bg-primary);
}

.mobile-content, .mobile-code {
  flex: 1;
  min-height: 0; /* flex item이 제대로 줄어들도록 */
  overflow: hidden;
  position: relative;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSyncStore } from '../../stores/sync'

const props = defineProps({
  initialSplit: {
    type: Number,
    default: 50
  },
  minSize: {
    type: Number,
    default: 20
  },
  collapseThreshold: {
    type: Number,
    default: 15 // 이 비율 이하로 줄어들면 완전히 접힘
  },
  direction: {
    type: String,
    default: 'horizontal', // 'horizontal' | 'vertical'
    validator: (value) => ['horizontal', 'vertical'].includes(value)
  }
})

const emit = defineEmits(['split-change'])

const syncStore = useSyncStore()
const localSplitPercent = ref(props.initialSplit)
const containerRef = ref(null)
const isDragging = ref(false)
const lastNormalSplit = ref(props.initialSplit) // 접히기 전 마지막 정상 비율 저장

const isHorizontal = computed(() => props.direction === 'horizontal')

// 접힌 상태 감지
const isLeftCollapsed = computed(() => splitPercent.value === 0)
const isRightCollapsed = computed(() => splitPercent.value === 100)
const isCollapsed = computed(() => isLeftCollapsed.value || isRightCollapsed.value)

// 학생 모드 + 집중 모드 ON 여부
const isSyncMode = computed(() => !syncStore.isTeacher && syncStore.focusMode)

// 실제 사용할 분할 비율 (학생 집중 모드일 때는 sync store 값 사용)
const splitPercent = computed(() => {
  return isSyncMode.value ? syncStore.splitPercent : localSplitPercent.value
})

// 드래그 가능 여부 (학생 집중 모드일 때는 드래그 불가, 단 접힌 상태에서 펼치기는 가능)
const canDrag = computed(() => !isSyncMode.value)

// sync store의 splitPercent 변경 감지 (학생 모드에서만)
watch(() => syncStore.splitPercent, (newValue) => {
  if (isSyncMode.value) {
    // 학생 집중 모드일 때는 sync store 값으로 자동 업데이트
    // (splitPercent computed가 자동으로 반영)
  }
})

// 접힌 상태에서 펼치기
const expandPane = () => {
  if (!canDrag.value) return

  // 저장된 마지막 정상 비율로 복원
  const targetPercent = lastNormalSplit.value
  localSplitPercent.value = targetPercent
  emit('split-change', targetPercent)
}

// 핸들 클릭 처리 (접힌 상태면 펼치기, 아니면 드래그 시작)
const handleClick = (e) => {
  if (!canDrag.value) return

  if (isCollapsed.value) {
    expandPane()
  }
}

const startDrag = (e) => {
  if (!canDrag.value) return

  // 접힌 상태에서는 드래그 대신 펼치기 (터치/클릭 모두 처리)
  if (isCollapsed.value) {
    expandPane()
    return
  }

  isDragging.value = true
  document.body.style.cursor = isHorizontal.value ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'

  // 마우스 이벤트
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)

  // 터치 이벤트
  window.addEventListener('touchmove', onTouchDrag, { passive: false })
  window.addEventListener('touchend', stopDrag)
  window.addEventListener('touchcancel', stopDrag)
}

// 접기/펼치기 로직을 포함한 비율 계산
const calculatePercent = (rawPercent) => {
  // 우측 패널(실습)이 너무 좁으면 완전히 접기 (100%)
  if (rawPercent > (100 - props.collapseThreshold)) {
    // 접히기 전 현재 비율 저장 (이미 접힌 상태가 아니라면)
    if (localSplitPercent.value > 0 && localSplitPercent.value < 100) {
      lastNormalSplit.value = localSplitPercent.value
    }
    return 100
  }
  // 좌측 패널(학습)이 너무 좁으면 완전히 접기 (0%)
  if (rawPercent < props.collapseThreshold) {
    // 접히기 전 현재 비율 저장 (이미 접힌 상태가 아니라면)
    if (localSplitPercent.value > 0 && localSplitPercent.value < 100) {
      lastNormalSplit.value = localSplitPercent.value
    }
    return 0
  }
  // 일반 범위
  if (rawPercent >= props.minSize && rawPercent <= (100 - props.minSize)) {
    return rawPercent
  }
  return null // 변경하지 않음
}

const onDrag = (e) => {
  if (!isDragging.value || !containerRef.value || !canDrag.value) return

  const rect = containerRef.value.getBoundingClientRect()
  let rawPercent

  if (isHorizontal.value) {
    const x = e.clientX - rect.left
    rawPercent = (x / rect.width) * 100
  } else {
    const y = e.clientY - rect.top
    rawPercent = (y / rect.height) * 100
  }

  const percent = calculatePercent(rawPercent)
  if (percent !== null) {
    localSplitPercent.value = percent
    emit('split-change', percent)
  }
}

// 터치 드래그 핸들러
const onTouchDrag = (e) => {
  if (!isDragging.value || !containerRef.value || !canDrag.value) return

  e.preventDefault() // 스크롤 방지

  const touch = e.touches[0]
  const rect = containerRef.value.getBoundingClientRect()
  let rawPercent

  if (isHorizontal.value) {
    const x = touch.clientX - rect.left
    rawPercent = (x / rect.width) * 100
  } else {
    const y = touch.clientY - rect.top
    rawPercent = (y / rect.height) * 100
  }

  const percent = calculatePercent(rawPercent)
  if (percent !== null) {
    localSplitPercent.value = percent
    emit('split-change', percent)
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  // 마우스 이벤트 제거
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)

  // 터치 이벤트 제거
  window.removeEventListener('touchmove', onTouchDrag)
  window.removeEventListener('touchend', stopDrag)
  window.removeEventListener('touchcancel', stopDrag)
}
</script>

<template>
  <div 
    class="split-container" 
    ref="containerRef"
    :class="{ vertical: !isHorizontal }"
  >
    <div 
      class="pane first" 
      :style="{ [isHorizontal ? 'width' : 'height']: `${splitPercent}%` }"
    >
      <slot name="first"></slot>
    </div>
    
    <div
      class="resizer"
      :class="{
        disabled: !canDrag,
        collapsed: isCollapsed,
        'collapsed-left': isLeftCollapsed,
        'collapsed-right': isRightCollapsed
      }"
      @mousedown="startDrag"
      @touchstart.prevent="startDrag"
      @click="handleClick"
    >
      <div class="handle" :class="{ 'handle-collapsed': isCollapsed }">
        <div v-if="!isCollapsed" class="handle-dots"></div>
        <div v-else class="handle-arrow">
          <template v-if="isHorizontal">{{ isLeftCollapsed ? '›' : '‹' }}</template>
          <template v-else>{{ isLeftCollapsed ? '⌄' : '⌃' }}</template>
        </div>
      </div>
    </div>
    
    <div 
      class="pane second" 
      :style="{ [isHorizontal ? 'width' : 'height']: `${100 - splitPercent}%` }"
    >
      <slot name="second"></slot>
    </div>
  </div>
</template>

<style scoped>
.split-container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.split-container.vertical {
  flex-direction: column;
}

.pane {
  overflow: auto;
}

/* Horizontal Resizer (Default) */
.resizer {
  width: 6px;
  background: var(--bg-tertiary);
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 10;
  flex-shrink: 0;
  position: relative;
}

.resizer:hover, .resizer:active {
  background: var(--text-accent);
}

.resizer.disabled {
  cursor: default;
  opacity: 0.5;
}

.resizer.disabled:hover {
  background: var(--bg-tertiary);
}

/* 접힌 상태의 resizer */
.resizer.collapsed {
  cursor: pointer;
  width: 6px;
}

.resizer.collapsed:hover {
  background: var(--text-accent);
}

/* 핸들 기본 스타일 (원형) */
.handle {
  position: absolute;
  width: 20px;
  height: 20px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.resizer:hover .handle,
.resizer:active .handle {
  background: var(--text-accent);
  border-color: var(--text-accent);
  transform: scale(1.15);
}

/* 접힌 상태 핸들 (사다리꼴) */
.handle.handle-collapsed {
  width: 22px;
  height: 48px;
  border-radius: 4px;
  background: var(--text-accent);
  border-color: var(--text-accent);
}

/* 좌측 접힌 경우 - 오른쪽으로 펼치는 사다리꼴 (왼쪽이 넓음) */
.resizer.collapsed-left .handle-collapsed {
  border-radius: 6px 0 0 6px;
  clip-path: polygon(0 0, 100% 15%, 100% 85%, 0 100%);
}

/* 우측 접힌 경우 - 왼쪽으로 펼치는 사다리꼴 (오른쪽이 넓음) */
.resizer.collapsed-right .handle-collapsed {
  border-radius: 0 6px 6px 0;
  clip-path: polygon(0 15%, 100% 0, 100% 100%, 0 85%);
}

.resizer.collapsed:hover .handle-collapsed {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.5);
}

/* 핸들 점 (일반 상태) */
.handle-dots {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.handle-dots::before,
.handle-dots::after {
  content: '';
  width: 4px;
  height: 4px;
  background: var(--text-secondary);
  border-radius: 50%;
}

.resizer:hover .handle-dots::before,
.resizer:hover .handle-dots::after {
  background: var(--text-primary);
}

/* 화살표 (접힌 상태) */
.handle-arrow {
  font-size: 18px;
  font-weight: bold;
  color: var(--text-primary);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}


/* Vertical Resizer */
.split-container.vertical .resizer {
  width: 100%;
  height: 6px;
  cursor: row-resize;
}

.split-container.vertical .resizer.collapsed {
  height: 6px;
  width: 100%;
}

.split-container.vertical .handle-dots {
  flex-direction: row;
}

/* 세로 분할 - 접힌 상태 핸들 (눕힌 사다리꼴) */
.split-container.vertical .handle.handle-collapsed {
  width: 48px;
  height: 22px;
}

/* 상단 접힌 경우 - 아래로 펼치는 사다리꼴 (위가 넓음) */
.split-container.vertical .resizer.collapsed-left .handle-collapsed {
  border-radius: 6px 6px 0 0;
  clip-path: polygon(0 0, 100% 0, 85% 100%, 15% 100%);
}

/* 하단 접힌 경우 - 위로 펼치는 사다리꼴 (아래가 넓음) */
.split-container.vertical .resizer.collapsed-right .handle-collapsed {
  border-radius: 0 0 6px 6px;
  clip-path: polygon(15% 0, 85% 0, 100% 100%, 0 100%);
}

/* 모바일/태블릿에서 터치 영역 */
@media (max-width: 1024px) {
  .handle {
    width: 22px;
    height: 22px;
  }

  .handle.handle-collapsed {
    width: 18px;
    height: 40px;
  }

  .handle-dots::before,
  .handle-dots::after {
    width: 4px;
    height: 4px;
  }

  .handle-dots {
    gap: 3px;
  }

  .handle-arrow {
    font-size: 18px;
  }

  .resizer.collapsed {
    width: 6px;
  }

  .split-container.vertical .resizer.collapsed {
    height: 6px;
    width: 100%;
  }

  /* 모바일에서 접힌 핸들 터치 영역 확대 */
  .handle.handle-collapsed {
    width: 28px;
    height: 48px;
  }

  .split-container.vertical .handle.handle-collapsed {
    width: 48px;
    height: 28px;
  }
}
</style>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'teacher' // 'teacher' | 'student'
  },
  contentScrollPosition: {
    type: Number,
    default: 0
  },
  // 콘텐츠 패널 너비 (좌표 정규화 기준)
  contentPaneWidth: {
    type: Number,
    default: 0
  },
  // 학생 모드에서 외부에서 전달받는 경로 (읽기 전용)
  syncedPaths: {
    type: Array,
    default: () => []
  },
  // 학생 모드에서 실시간 그리기 경로
  syncedCurrentPath: {
    type: Object,
    default: null
  },
  readonly: {
    type: Boolean,
    default: false
  },
  // 그리기 도구 활성화 여부 (false면 읽기 전용으로 판서 내역만 표시)
  drawingEnabled: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['pathAdded', 'pathRemoved', 'drawingUpdate', 'clear'])

const canvasRef = ref(null)
const ctx = ref(null)
const isDrawing = ref(false)
const currentTool = ref('cursor') // 'cursor', 'pen', 'eraser', 'highlighter'
const currentColor = ref('#FF0000')
const currentSize = ref(2)
const showColorPicker = ref(false)

// 로컬 경로 데이터 (교사 모드에서만 사용)
const paths = ref([])
const currentPath = ref([])

// === 좌표 정규화 유틸리티 (콘텐츠 패널 기준) ===
// 절대 좌표 -> 정규화 좌표
// x: 콘텐츠 패널 너비 기준 비율 (0~1)
// y: 콘텐츠 내 절대 위치 (scrollTop + 화면 y)
const toNormalizedPoint = (x, y) => {
  // 콘텐츠 패널 너비 (없으면 캔버스 너비 사용)
  const contentWidth = props.contentPaneWidth || canvasRef.value?.width || 1

  return {
    nx: x / contentWidth,                           // 콘텐츠 패널 너비 기준 비율
    absoluteY: y + props.contentScrollPosition,     // 콘텐츠 내 절대 y 위치
    scrollOffset: props.contentScrollPosition       // 레거시 호환용
  }
}

// 정규화 좌표 -> 화면 절대 좌표
const toAbsolutePoint = (point) => {
  if (!point) return { x: 0, y: 0 }

  const contentWidth = props.contentPaneWidth || canvasRef.value?.width || 1

  // 새 형식 (absoluteY) 사용
  if (point.absoluteY !== undefined) {
    return {
      x: point.nx * contentWidth,
      y: point.absoluteY - props.contentScrollPosition
    }
  }

  // 레거시 형식 (ny + scrollOffset) 호환
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  const scrollDiff = (point.scrollOffset || 0) - props.contentScrollPosition
  return {
    x: point.nx * canvas.width,
    y: point.ny * canvas.height + scrollDiff
  }
}

watch(currentTool, (newVal) => {
  console.log('currentTool changed to:', newVal)
})

onMounted(() => {
  const canvas = canvasRef.value
  ctx.value = canvas.getContext('2d')
  
  // Set canvas size
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  
  // Start render loop
  requestAnimationFrame(render)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
})

const resizeCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  canvas.width = parent.clientWidth
  canvas.height = parent.clientHeight
  render() // Re-render after resize
}

const getCoordinates = (e) => {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

const startDrawing = (e) => {
  // 읽기 전용이면 무시
  if (props.readonly || props.mode === 'student') return

  // 커서 모드에서는 그리기 비활성화
  if (currentTool.value === 'cursor') return

  isDrawing.value = true
  const { x, y } = getCoordinates(e)

  if (currentTool.value === 'eraser') {
    erasePaths(x, y)
  } else {
    // 정규화된 좌표로 저장
    currentPath.value = [toNormalizedPoint(x, y)]

    // 실시간 동기화를 위해 emit
    emit('drawingUpdate', {
      points: currentPath.value,
      color: currentColor.value,
      size: currentTool.value === 'highlighter' ? 20 : currentSize.value,
      tool: currentTool.value
    })
  }
}

const draw = (e) => {
  if (!isDrawing.value || props.readonly || props.mode === 'student') return
  const { x, y } = getCoordinates(e)

  if (currentTool.value === 'eraser') {
    erasePaths(x, y)
  } else {
    // 정규화된 좌표로 저장
    currentPath.value.push(toNormalizedPoint(x, y))

    // 실시간 동기화
    emit('drawingUpdate', {
      points: currentPath.value,
      color: currentColor.value,
      size: currentTool.value === 'highlighter' ? 20 : currentSize.value,
      tool: currentTool.value
    })

    render()
  }
}

const stopDrawing = () => {
  if (!isDrawing.value || props.readonly || props.mode === 'student') return
  isDrawing.value = false

  if (currentTool.value !== 'eraser' && currentPath.value.length > 0) {
    const newPath = {
      points: [...currentPath.value],
      color: currentColor.value,
      size: currentTool.value === 'highlighter' ? 20 : currentSize.value,
      tool: currentTool.value,
      author: props.mode,
      canvasContext: {
        width: canvasRef.value?.width || 0,
        height: canvasRef.value?.height || 0
      }
    }

    paths.value.push(newPath)
    emit('pathAdded', newPath) // sync store에 저장 요청

    currentPath.value = []
    emit('drawingUpdate', null) // 실시간 그리기 종료
  }
  render()
}

const erasePaths = (x, y) => {
  const eraserRadius = 10
  const removedPaths = []

  paths.value = paths.value.filter(path => {
    // 정규화 좌표를 절대 좌표로 변환하여 비교
    const hit = path.points.some(p => {
      const absolutePoint = toAbsolutePoint(p)
      const dx = absolutePoint.x - x
      const dy = absolutePoint.y - y
      return (dx * dx + dy * dy) < (eraserRadius * eraserRadius)
    })
    if (hit && path.id) {
      removedPaths.push(path.id)
    }
    return !hit // Keep path if NOT hit
  })

  // 삭제된 경로 emit
  removedPaths.forEach(pathId => {
    emit('pathRemoved', pathId)
  })

  render()
}

const render = () => {
  if (!ctx.value || !canvasRef.value) return
  const context = ctx.value
  const canvas = canvasRef.value

  // Clear
  context.clearRect(0, 0, canvas.width, canvas.height)

  // 학생 모드일 경우 외부에서 전달받은 경로 사용
  const pathsToRender = props.mode === 'student'
    ? props.syncedPaths
    : paths.value

  const allPaths = [...pathsToRender]

  // 현재 그리는 중인 경로 추가
  const drawingPath = props.mode === 'student'
    ? props.syncedCurrentPath
    : (currentPath.value.length > 0 && currentTool.value !== 'eraser' ? {
        points: currentPath.value,
        color: currentColor.value,
        size: currentTool.value === 'highlighter' ? 20 : currentSize.value,
        tool: currentTool.value
      } : null)

  if (drawingPath && drawingPath.points && drawingPath.points.length > 0) {
    allPaths.push(drawingPath)
  }

  // 각 경로 렌더링
  allPaths.forEach(path => {
    if (!path.points || path.points.length < 2) return

    // 정규화된 좌표를 현재 화면 좌표로 변환
    const absolutePoints = path.points.map(p => {
      // 이미 절대 좌표인 경우 (레거시 지원)
      if (p.x !== undefined && p.nx === undefined) {
        return { x: p.x, y: p.y }
      }
      // 정규화 좌표인 경우
      return toAbsolutePoint(p)
    })

    // 화면에 보이는 점이 있는 경로만 렌더링 (최적화)
    const hasVisiblePoints = absolutePoints.some(
      p => p.y >= -50 && p.y <= canvas.height + 50
    )
    if (!hasVisiblePoints) return

    context.beginPath()
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = path.color
    context.lineWidth = path.size

    // Handle highlighter with transparency
    if (path.tool === 'highlighter') {
      context.globalCompositeOperation = 'source-over'
    } else {
      context.globalCompositeOperation = 'source-over'
    }

    context.moveTo(absolutePoints[0].x, absolutePoints[0].y)
    for (let i = 1; i < absolutePoints.length; i++) {
      context.lineTo(absolutePoints[i].x, absolutePoints[i].y)
    }
    context.stroke()
  })
}

const penColors = ref(['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#000000', '#FFFFFF'])
const highlighterColors = ref([
  'rgba(255, 255, 0, 0.3)',   // Yellow
  'rgba(255, 128, 0, 0.3)',   // Orange
  'rgba(0, 255, 0, 0.3)',     // Green
  'rgba(0, 255, 255, 0.3)',   // Cyan
  'rgba(255, 0, 255, 0.3)',   // Magenta
  'rgba(255, 192, 203, 0.3)'  // Pink
])
const showHighlighterColorPicker = ref(false)

const selectPen = () => {
  console.log('selectPen called')
  if (currentTool.value === 'pen') {
    showColorPicker.value = !showColorPicker.value
    showHighlighterColorPicker.value = false
  } else {
    currentTool.value = 'pen'
    currentSize.value = 2
    if (currentColor.value === '#1e1e1e' || currentColor.value.startsWith('rgba')) {
       currentColor.value = '#FF0000'
    }
    showColorPicker.value = true
    showHighlighterColorPicker.value = false
  }
}

const selectHighlighter = () => {
  console.log('selectHighlighter called')
  if (currentTool.value === 'highlighter') {
    showHighlighterColorPicker.value = !showHighlighterColorPicker.value
    showColorPicker.value = false
  } else {
    currentTool.value = 'highlighter'
    if (!currentColor.value.startsWith('rgba')) {
      currentColor.value = 'rgba(255, 255, 0, 0.3)'
    }
    currentSize.value = 20
    showHighlighterColorPicker.value = true
    showColorPicker.value = false
  }
}

const selectEraser = () => {
  console.log('selectEraser called')
  showColorPicker.value = false
  showHighlighterColorPicker.value = false
  currentTool.value = 'eraser'
}

const selectCursor = () => {
  console.log('selectCursor called')
  showColorPicker.value = false
  showHighlighterColorPicker.value = false
  currentTool.value = 'cursor'
}

const setColor = (color) => {
  currentColor.value = color
  showColorPicker.value = false
}

const clearBoard = () => {
  paths.value = []
  emit('clear') // sync store에서도 삭제
  render()
}

// === Watch for reactive updates ===
// 스크롤 위치가 변경되면 판서 재렌더링
watch(() => props.contentScrollPosition, () => {
  render()
})

// 외부 경로 변경 감지 (학생 모드: 렌더링, 교사 모드: 로컬 paths 동기화)
watch(() => props.syncedPaths, (newPaths) => {
  if (props.mode === 'student') {
    render()
  } else {
    // 교사 모드: 페이지 변경 시 스토어 데이터로 로컬 paths 동기화
    // syncedPaths는 현재 단계의 경로만 포함하므로, 로컬 paths를 동기화
    paths.value = [...(newPaths || [])]
    render()
  }
}, { deep: true, immediate: true })

watch(() => props.syncedCurrentPath, () => {
  if (props.mode === 'student') {
    render()
  }
}, { deep: true })

// Toolbar drag functionality
const toolbarPosition = ref({ x: null, y: null })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const startDrag = (e) => {
  e.preventDefault()
  e.stopPropagation()
  
  const toolbar = e.currentTarget.closest('.toolbar')
  if (!toolbar) return
  
  const rect = toolbar.getBoundingClientRect()
  
  isDragging.value = true
  dragOffset.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
  
  // Initialize position if not set
  if (toolbarPosition.value.x === null) {
    toolbarPosition.value = {
      x: rect.left,
      y: rect.top
    }
  }
}

const onDrag = (e) => {
  if (!isDragging.value) return
  
  e.preventDefault()
  
  // Calculate new position
  let newX = e.clientX - dragOffset.value.x
  let newY = e.clientY - dragOffset.value.y
  
  // Get toolbar dimensions
  const toolbar = document.querySelector('.toolbar')
  if (toolbar) {
    const rect = toolbar.getBoundingClientRect()
    const toolbarWidth = rect.width
    const toolbarHeight = rect.height
    
    // Constrain to screen boundaries
    newX = Math.max(0, Math.min(newX, window.innerWidth - toolbarWidth))
    newY = Math.max(0, Math.min(newY, window.innerHeight - toolbarHeight))
  }
  
  toolbarPosition.value = {
    x: newX,
    y: newY
  }
}

const stopDrag = () => {
  isDragging.value = false
}

// Add event listeners on mount
onMounted(() => {
  const canvas = canvasRef.value
  ctx.value = canvas.getContext('2d')
  
  // Set canvas size
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  
  // Add drag listeners
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  
  // Start render loop
  requestAnimationFrame(render)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

defineExpose({ clearBoard })
</script>

<template>
  <div class="whiteboard-container" :class="{ 'student-mode': mode === 'student' }">
    <canvas
      ref="canvasRef"
      :style="{
        cursor: (!drawingEnabled || currentTool === 'cursor') ? 'default' : 'crosshair',
        pointerEvents: (!drawingEnabled || currentTool === 'cursor') ? 'none' : 'auto'
      }"
      @mousedown="startDrawing"
      @mousemove="draw"
      @mouseup="stopDrawing"
      @mouseleave="stopDrawing"
    ></canvas>

    <div
      class="toolbar glass-panel"
      v-if="mode === 'teacher' && drawingEnabled"
      :style="toolbarPosition.x !== null ? { 
        position: 'fixed',
        left: toolbarPosition.x + 'px', 
        top: toolbarPosition.y + 'px',
        transform: 'none'
      } : {}"
    >
      <!-- Drag Handle -->
      <div class="drag-handle" @mousedown="startDrag" title="드래그하여 이동">
        <div class="drag-dots">⋮⋮</div>
      </div>

      <!-- Cursor (Select) Tool -->
      <button
        class="tool-btn"
        :class="{ active: currentTool === 'cursor' }"
        @click.stop="selectCursor"
        title="선택 (판서 모드 해제)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
          <path d="M13 13l6 6"></path>
        </svg>
      </button>

      <div class="tool-wrapper">
        <button
          class="tool-btn"
          :class="{ active: currentTool === 'pen' }"
          @click.stop="selectPen"
          title="펜 (클릭하여 색상 변경)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
          <div class="color-indicator" :style="{ background: currentColor }" v-if="currentTool === 'pen'"></div>
        </button>
        
        <!-- Color Picker Popover -->
        <div class="color-picker glass-panel" v-if="showColorPicker && currentTool === 'pen'" style="position: absolute; top: 0; right: 100%; margin-right: 0.5rem;">
          <button 
            v-for="color in penColors" 
            :key="color"
            class="color-btn"
            :style="{ background: color }"
            :class="{ active: currentColor === color }"
            @click.stop="setColor(color)"
          ></button>
        </div>
      </div>

      <button
        class="tool-btn"
        :class="{ active: currentTool === 'highlighter' }"
        @click.stop="selectHighlighter"
        title="형광펜 (클릭하여 색상 변경)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 11l-6 6v3h9l3-3"></path>
          <path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path>
        </svg>
        <div class="color-indicator" :style="{ background: currentColor }" v-if="currentTool === 'highlighter'"></div>
      </button>
      
      <!-- Highlighter Color Picker Popover -->
      <div class="color-picker glass-panel" v-if="showHighlighterColorPicker && currentTool === 'highlighter'" style="position: absolute; top: 0; right: 100%; margin-right: 0.5rem;">
        <button 
          v-for="color in highlighterColors" 
          :key="color"
          class="color-btn"
          :style="{ background: color }"
          :class="{ active: currentColor === color }"
          @click.stop="currentColor = color; showHighlighterColorPicker = false"
        ></button>
      </div>
      
      <button
        class="tool-btn"
        :class="{ active: currentTool === 'eraser' }"
        @click.stop="selectEraser"
        title="지우개 (획 단위 삭제)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 20H7L3 16l9.9-9.9c.8-.8 2.1-.8 2.8 0l4.3 4.3c.8.8.8 2.1 0 2.8L13 20"></path>
          <path d="M7 20H3"></path>
        </svg>
      </button>
      <div class="divider"></div>
      <button class="tool-btn delete" @click.stop="clearBoard" title="전체 지우기">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.whiteboard-container {
  width: 100%;
  height: 100%;
  position: relative;
  /* background: #1e1e1e; Removed to allow transparency by default */
  overflow: hidden;
  pointer-events: none; /* Let clicks pass through container */
}

.whiteboard-container.transparent {
  background: transparent !important;
}

canvas {
  display: block;
  cursor: crosshair;
  background: transparent;
  pointer-events: auto; /* Capture clicks on canvas */
}

/* 학생 모드에서는 판서 불가이므로 포인터 이벤트 비활성화 */
.whiteboard-container.student-mode canvas {
  pointer-events: none;
  cursor: default;
}

.toolbar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  z-index: 100;
  pointer-events: auto; /* Capture clicks on toolbar */
  width: fit-content;
  min-width: 56px; /* Ensure consistent width */
}

.tool-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: 1.2rem;
  background: var(--disabled-bg);
  color: var(--text-primary);
  transition: all 0.2s;
  cursor: pointer;
}

.tool-btn svg {
  pointer-events: none;
}

.tool-btn:hover {
  background: var(--hover-bg);
}

.tool-btn.active {
  background: var(--primary-color);
  transform: scale(1.05);
}

.tool-btn.delete {
  color: var(--error-color);
}

.divider {
  width: 1px;
  background: var(--glass-border);
  margin: 0 0.5rem;
}

.color-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  z-index: 200;
}

.color-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-btn:hover {
  transform: scale(1.1);
  border-color: var(--text-primary);
}

.color-btn.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--border-color);
}

.tool-wrapper {
  position: relative;
}

.color-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--text-primary);
}

.drag-handle {
  cursor: move;
  padding: 0.25rem;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 0.25rem;
  user-select: none;
}

.drag-dots {
  color: var(--text-secondary);
  font-size: 0.8rem;
  letter-spacing: -2px;
}

.drag-handle:hover .drag-dots {
  color: var(--text-primary);
}
</style>

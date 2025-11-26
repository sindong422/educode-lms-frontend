<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as monaco from 'monaco-editor'
import { useRoute } from 'vue-router'
import { useLessonStore } from '../../stores/lessonStore'
import { useUIStore } from '../../stores/uiStore'
import { useThemeStore } from '../../stores/themeStore'
import { useSyncStore } from '../../stores/sync'
import { injectCursorStyles } from '../../utils/cursorStyles'
import { getTaskDescription } from '../../data/taskContent'
import SplitPane from '../layout/SplitPane.vue'

const route = useRoute()
const lessonStore = useLessonStore()
const uiStore = useUIStore()
const themeStore = useThemeStore()
const syncStore = useSyncStore()
const editorContainer = ref(null)
const showTask = ref(false)
let editorInstance = null
let myCodeModel = null
let teacherCodeModel = null
let sharedStudentCodeModel = null
let studentCodePollingInterval = null

// 탭 관리
const activeTab = ref('my-code')

// 현재 단계의 실습 내용
const currentTaskDescription = computed(() => getTaskDescription(lessonStore.currentStep))

// 학생 목록
const studentList = computed(() => syncStore.students)

// 모니터링 드롭다운 상태
const isMonitoringDropdownOpen = ref(false)
const monitoringStudents = ref([]) // 모니터링 중인 학생 ID 배열
const monitoringModels = {} // 학생별 monaco 모델 객체 (일반 객체)

// 원격 커서 데코레이션 관리
let remoteCursorDecorations = [] // 현재 적용된 데코레이션 ID 배열
let cursorPollingInterval = null // 커서 위치 폴링 인터벌

// 원격 커서 색상
const TEACHER_CURSOR_COLOR = '#ef4444' // 빨간색 (교사)
const STUDENT_CURSOR_COLOR = '#a855f7' // 보라색 (학생)

// 교사 코드 탭 표시 여부 (학생 + 집중 모드 + 코드 공유 ON)
const showTeacherTab = computed(() => !syncStore.isTeacher && syncStore.focusMode && syncStore.shareCodeEditor)

// 공유된 학생 코드 탭 표시 여부 (학생 전용 + 공유된 학생이 자기 자신이 아닐 때)
const showSharedStudentTab = computed(() => {
  if (syncStore.isTeacher) return false
  if (!syncStore.sharedStudentId) return false
  const myStudentId = route.query.studentId
  // 공유된 학생이 자기 자신이면 탭을 표시하지 않음 (실습 탭에 아이콘으로 표시)
  return syncStore.sharedStudentId !== myStudentId
})

// 내 코드가 공유 중인지 여부 (학생 본인의 실습 탭에 아이콘 표시용)
const isMyCodeShared = computed(() => {
  if (syncStore.isTeacher) return false
  const myStudentId = route.query.studentId
  return myStudentId && syncStore.sharedStudentId === myStudentId
})

// 탭 전환
const switchTab = (tab) => {
  activeTab.value = tab
  if (editorInstance) {
    if (tab === 'my-code') {
      editorInstance.setModel(myCodeModel)
      editorInstance.updateOptions({ readOnly: false })
      // 원격 커서 제거
      remoteCursorDecorations = editorInstance.deltaDecorations(remoteCursorDecorations, [])
    } else if (tab === 'teacher-code') {
      editorInstance.setModel(teacherCodeModel)
      editorInstance.updateOptions({ readOnly: true })
      // 교사 커서 즉시 업데이트
      setTimeout(() => updateRemoteCursor(), 50)
    } else if (tab === 'shared-student-code') {
      // 학생용 공유된 학생 코드 탭
      if (!sharedStudentCodeModel) {
        sharedStudentCodeModel = monaco.editor.createModel('', 'java')
      }
      editorInstance.setModel(sharedStudentCodeModel)
      editorInstance.updateOptions({ readOnly: true })
      // 원격 커서 제거
      remoteCursorDecorations = editorInstance.deltaDecorations(remoteCursorDecorations, [])
    } else if (tab.startsWith('monitoring-')) {
      // 모니터링 학생 탭
      const studentId = tab.replace('monitoring-', '')
      if (monitoringModels[studentId]) {
        editorInstance.setModel(monitoringModels[studentId])
        editorInstance.updateOptions({ readOnly: true })
        // 학생 커서 즉시 업데이트
        setTimeout(() => updateRemoteCursor(), 50)
      }
    }
  }
}

// 모니터링 학생 추가
const addMonitoringStudent = (studentId) => {
  if (monitoringStudents.value.includes(studentId)) {
    console.log('[모니터링] 이미 모니터링 중:', studentId)
    return
  }

  // 드롭다운 먼저 닫기
  isMonitoringDropdownOpen.value = false

  monitoringStudents.value.push(studentId)

  // monaco 모델 생성
  if (!monitoringModels[studentId]) {
    monitoringModels[studentId] = monaco.editor.createModel('', 'java')
  }

  // 해당 학생의 코드 즉시 로드 (탭 전환 전에 미리 로드)
  loadMonitoringStudentCode(studentId)

  // 해당 학생 탭으로 전환
  switchTab(`monitoring-${studentId}`)

  console.log('[모니터링] 학생 추가:', studentId)
}

// 모니터링 학생 제거
const removeMonitoringStudent = (studentId) => {
  const index = monitoringStudents.value.indexOf(studentId)
  if (index > -1) {
    monitoringStudents.value.splice(index, 1)

    // 해당 학생이 공유 중이면 공유 중단
    if (syncStore.sharedStudentId === studentId) {
      syncStore.clearSharedStudentCode()
      console.log('[모니터링] 공유 중인 학생 탭 닫힘 - 공유 자동 중단:', studentId)
    }

    // 모델 제거
    if (monitoringModels[studentId]) {
      monitoringModels[studentId].dispose()
      delete monitoringModels[studentId]
    }

    // 현재 탭이 제거된 학생 탭이면 내 코드로 전환
    if (activeTab.value === `monitoring-${studentId}`) {
      switchTab('my-code')
    }

    console.log('[모니터링] 학생 제거:', studentId)
  }
}

// 모니터링 학생 코드 로드
const loadMonitoringStudentCode = (studentId) => {
  if (!monitoringModels[studentId]) {
    console.warn('[모니터링] 모델 없음:', studentId)
    return
  }

  const code = syncStore.getStudentCode(studentId)
  const currentCode = monitoringModels[studentId].getValue()

  if (currentCode !== code) {
    console.log('[모니터링] 학생 코드 업데이트:', studentId, '저장된 길이:', code.length, '현재 길이:', currentCode.length)
    monitoringModels[studentId].setValue(code)
  }
}

// 드롭다운 토글
const toggleMonitoringDropdown = () => {
  isMonitoringDropdownOpen.value = !isMonitoringDropdownOpen.value
}

// 드롭다운 외부 클릭 감지를 위한 함수
const closeMonitoringDropdown = () => {
  isMonitoringDropdownOpen.value = false
}

// 학생 코드 공유 토글 (교사 전용)
const toggleShareStudentCode = (studentId) => {
  if (syncStore.sharedStudentId === studentId) {
    // 이미 공유 중이면 공유 해제
    syncStore.clearSharedStudentCode()
    console.log('[교사] 학생 코드 공유 해제')
  } else {
    // 새로 공유 시작
    const student = studentList.value.find(s => s.id === studentId)
    const studentName = student?.name || studentId
    syncStore.shareStudentCode(studentId, studentName)
    console.log('[교사] 학생 코드 공유 시작:', studentName)
  }
}

// 원격 커서 데코레이션 업데이트 (교사 코드 탭에서 교사 커서 표시)
const updateTeacherCursorDecoration = () => {
  if (!editorInstance || activeTab.value !== 'teacher-code') return

  const cursorPos = syncStore.getTeacherCursorPosition()
  if (!cursorPos) {
    // 커서 정보 없으면 데코레이션 제거
    remoteCursorDecorations = editorInstance.deltaDecorations(remoteCursorDecorations, [])
    return
  }

  // 커서 스타일 주입
  injectCursorStyles([{
    id: 'teacher',
    name: syncStore.teacherName || '교사',
    color: TEACHER_CURSOR_COLOR
  }])

  // 데코레이션 생성
  const newDecorations = [{
    range: new monaco.Range(cursorPos.lineNumber, cursorPos.column, cursorPos.lineNumber, cursorPos.column),
    options: {
      className: 'remote-cursor-teacher',
      afterContentClassName: 'remote-cursor-flag-teacher',
      stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
    }
  }]

  remoteCursorDecorations = editorInstance.deltaDecorations(remoteCursorDecorations, newDecorations)
}

// 원격 커서 데코레이션 업데이트 (모니터링 탭에서 학생 커서 표시)
const updateStudentCursorDecoration = (studentId) => {
  if (!editorInstance || activeTab.value !== `monitoring-${studentId}`) return

  const cursorPos = syncStore.getStudentCursor(studentId)
  if (!cursorPos) {
    remoteCursorDecorations = editorInstance.deltaDecorations(remoteCursorDecorations, [])
    return
  }

  // 학생 이름 찾기
  const student = studentList.value.find(s => s.id === studentId)
  const studentName = student?.name || studentId

  // 커서 스타일 주입
  injectCursorStyles([{
    id: studentId,
    name: studentName,
    color: STUDENT_CURSOR_COLOR
  }])

  // 데코레이션 생성
  const newDecorations = [{
    range: new monaco.Range(cursorPos.lineNumber, cursorPos.column, cursorPos.lineNumber, cursorPos.column),
    options: {
      className: `remote-cursor-${studentId}`,
      afterContentClassName: `remote-cursor-flag-${studentId}`,
      stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
    }
  }]

  remoteCursorDecorations = editorInstance.deltaDecorations(remoteCursorDecorations, newDecorations)
}

// 현재 탭에 맞는 원격 커서 업데이트
const updateRemoteCursor = () => {
  if (!editorInstance) return

  if (activeTab.value === 'teacher-code') {
    updateTeacherCursorDecoration()
  } else if (activeTab.value.startsWith('monitoring-')) {
    const studentId = activeTab.value.replace('monitoring-', '')
    updateStudentCursorDecoration(studentId)
  } else {
    // 다른 탭에서는 데코레이션 제거
    remoteCursorDecorations = editorInstance.deltaDecorations(remoteCursorDecorations, [])
  }
}

onMounted(() => {
  if (editorContainer.value) {
    // 내 코드 모델 생성
    myCodeModel = monaco.editor.createModel(lessonStore.codeContent, 'java')

    // 교사 코드 모델 생성 (읽기 전용)
    teacherCodeModel = monaco.editor.createModel(syncStore.sharedCodeContent || '', 'java')

    // 에디터 생성 (내 코드 모델로 시작)
    editorInstance = monaco.editor.create(editorContainer.value, {
      model: myCodeModel,
      theme: themeStore.theme === 'dark' ? 'vs-dark' : 'vs',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: 'Fira Code, monospace',
      padding: { top: 20 }
    })

    // 공유된 학생 코드 모델 생성 (학생용)
    if (!syncStore.isTeacher) {
      sharedStudentCodeModel = monaco.editor.createModel(syncStore.sharedStudentCode || '', 'java')
    }

    // 내 코드 모델 변경 감지
    myCodeModel.onDidChangeContent(() => {
      const currentCode = myCodeModel.getValue()
      lessonStore.codeContent = currentCode

      // 교사 모드일 때는 sync store에도 저장
      if (syncStore.isTeacher) {
        syncStore.setSharedCodeContent(currentCode)
      }

      // 학생 모드일 때는 자신의 코드를 학생 코드로 저장
      if (!syncStore.isTeacher) {
        const studentId = route.query.studentId
        if (studentId) {
          console.log('[학생] 코드 저장:', studentId, '길이:', currentCode.length)
          syncStore.saveStudentCode(studentId, currentCode)
        }
      }
    })

    // 커서 위치 변경 감지 및 저장
    editorInstance.onDidChangeCursorPosition((e) => {
      const position = {
        lineNumber: e.position.lineNumber,
        column: e.position.column
      }

      // 내 코드 탭에서만 커서 위치 저장
      if (activeTab.value === 'my-code') {
        if (syncStore.isTeacher) {
          // 교사 커서 위치 저장
          syncStore.setTeacherCursorPosition(position)
        } else {
          // 학생 커서 위치 저장
          const studentId = route.query.studentId
          if (studentId) {
            syncStore.saveStudentCursor(studentId, position)
          }
        }
      }
    })

    // 에디터 포커스 감지 - 포커스 잃으면 커서 숨김
    editorInstance.onDidBlurEditorWidget(() => {
      if (activeTab.value === 'my-code') {
        if (syncStore.isTeacher) {
          // 교사 커서 위치를 null로 설정 (커서 숨김)
          syncStore.setTeacherCursorPosition(null)
        } else {
          // 학생 커서 위치를 null로 설정 (커서 숨김)
          const studentId = route.query.studentId
          if (studentId) {
            syncStore.saveStudentCursor(studentId, null)
          }
        }
      }
    })

    // 에디터 포커스 감지 - 포커스 받으면 커서 다시 표시
    editorInstance.onDidFocusEditorWidget(() => {
      if (activeTab.value === 'my-code' && editorInstance) {
        const position = editorInstance.getPosition()
        if (position) {
          const cursorPos = {
            lineNumber: position.lineNumber,
            column: position.column
          }
          if (syncStore.isTeacher) {
            syncStore.setTeacherCursorPosition(cursorPos)
          } else {
            const studentId = route.query.studentId
            if (studentId) {
              syncStore.saveStudentCursor(studentId, cursorPos)
            }
          }
        }
      }
    })

    // 교사 모드: 학생 코드 실시간 업데이트 polling
    if (syncStore.isTeacher) {
      console.log('[교사] 모니터링 코드 polling 시작')
      studentCodePollingInterval = setInterval(() => {
        // 모니터링 중인 학생 코드 업데이트
        monitoringStudents.value.forEach(studentId => {
          loadMonitoringStudentCode(studentId)
        })
        // 원격 커서 업데이트 (모니터링 탭)
        updateRemoteCursor()
      }, 300) // 300ms 주기로 폴링 (반응성 개선)
    }

    // 학생 모드: 교사 커서 위치 폴링
    if (!syncStore.isTeacher) {
      console.log('[학생] 교사 커서 위치 polling 시작')
      cursorPollingInterval = setInterval(() => {
        // 교사 코드 탭에서만 커서 업데이트
        if (activeTab.value === 'teacher-code') {
          updateRemoteCursor()
        }
      }, 300)
    }

    // 학생 모드: studentId 등록 (초기값)
    if (!syncStore.isTeacher) {
      const studentId = route.query.studentId
      if (studentId) {
        const studentName = route.query.studentName || studentId
        console.log('[학생] 등록:', studentId, studentName)
        syncStore.registerStudent(studentId, studentName)
      }
    }
  }
})

// 학생 모드: studentId 변경 감지 (비동기 URL 업데이트 대응)
watch(() => route.query.studentId, (newStudentId) => {
  if (!syncStore.isTeacher && newStudentId) {
    const studentName = route.query.studentName || newStudentId
    console.log('[학생] studentId 감지되어 등록:', newStudentId, studentName)
    syncStore.registerStudent(newStudentId, studentName)
  }
})

// Watch for theme changes
watch(() => themeStore.theme, (newTheme) => {
  if (editorInstance) {
    monaco.editor.setTheme(newTheme === 'dark' ? 'vs-dark' : 'vs')
  }
})

// Watch for shared code content changes (교사 코드 모델 업데이트)
watch(() => syncStore.sharedCodeContent, (newValue) => {
  if (teacherCodeModel && teacherCodeModel.getValue() !== newValue) {
    teacherCodeModel.setValue(newValue || '')
  }
})

// 교사 코드 공유 상태 감시 (학생용 - 실시간 자동 전환)
watch(() => syncStore.shareCodeEditor, (isSharing, wasSharing) => {
  // 학생 모드일 때만 자동 전환
  if (syncStore.isTeacher) return

  // 집중 모드일 때만 작동
  if (!syncStore.focusMode) return

  if (isSharing && !wasSharing) {
    // 교사가 코드 공유를 시작하면 자동으로 교사 코드 탭으로 전환
    console.log('[학생] 교사 코드 공유 시작 - 교사 코드 탭으로 자동 전환')
    switchTab('teacher-code')
  } else if (!isSharing && activeTab.value === 'teacher-code') {
    // 교사가 코드 공유를 중지하면 내 코드 탭으로 전환
    console.log('[학생] 교사 코드 공유 중지 - 내 코드 탭으로 전환')
    switchTab('my-code')
  }
})

// Watch for shared student code changes (공유된 학생 코드 모델 업데이트)
watch(() => syncStore.sharedStudentCode, (newValue) => {
  if (sharedStudentCodeModel && sharedStudentCodeModel.getValue() !== newValue) {
    sharedStudentCodeModel.setValue(newValue || '')
  }
})

// 공유된 학생 코드 ID 변경 감시 (학생용 - 실시간 자동 전환)
watch(() => syncStore.sharedStudentId, (newId, oldId) => {
  // 학생 모드일 때만 자동 전환
  if (syncStore.isTeacher) return

  if (newId && newId !== oldId) {
    // 새로운 학생 코드가 공유되면 자동으로 해당 탭으로 전환
    console.log('[학생] 공유된 학생 코드 탭으로 자동 전환:', syncStore.sharedStudentName)
    switchTab('shared-student-code')
  } else if (!newId && activeTab.value === 'shared-student-code') {
    // 공유가 해제되면 내 코드 탭으로 전환
    console.log('[학생] 공유 해제되어 내 코드 탭으로 전환')
    switchTab('my-code')
  }
})

onUnmounted(() => {
  if (editorInstance) {
    editorInstance.dispose()
  }
  if (myCodeModel) {
    myCodeModel.dispose()
  }
  if (teacherCodeModel) {
    teacherCodeModel.dispose()
  }
  if (sharedStudentCodeModel) {
    sharedStudentCodeModel.dispose()
  }
  // 모니터링 모델들 정리
  Object.values(monitoringModels).forEach(model => {
    if (model) {
      model.dispose()
    }
  })
  if (studentCodePollingInterval) {
    clearInterval(studentCodePollingInterval)
  }
  if (cursorPollingInterval) {
    clearInterval(cursorPollingInterval)
  }
})

// Watch for external content changes (e.g. changing steps)
watch(() => lessonStore.codeContent, (newValue) => {
  if (myCodeModel && myCodeModel.getValue() !== newValue) {
    myCodeModel.setValue(newValue)
  }
})
</script>

<template>
  <div class="coding-pane">
    <div class="editor-toolbar">
      <div class="file-tabs">
        <div
          class="file-tab practice-tab"
          :class="{ active: activeTab === 'my-code', 'my-code-shared': isMyCodeShared, 'teacher-sharing': syncStore.isTeacher && syncStore.shareCodeEditor }"
          @click="switchTab('my-code')"
        >
          <span>실습</span>

          <!-- 교사 전용: 내 코드 공유 버튼 -->
          <button
            v-if="syncStore.isTeacher && activeTab === 'my-code'"
            @click.stop="syncStore.toggleShareCode"
            class="share-my-code-btn"
            :class="{ active: syncStore.shareCodeEditor }"
            :title="syncStore.shareCodeEditor ? '코드 공유 중' : '내 코드를 학생들과 공유'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            {{ syncStore.shareCodeEditor ? '공유 중' : '공유' }}
          </button>

          <svg v-if="syncStore.isTeacher && syncStore.shareCodeEditor && activeTab !== 'my-code'" class="share-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>

          <!-- 학생 전용: 내 코드가 공유 중일 때 (아이콘만 표시) -->
          <svg v-if="isMyCodeShared" class="share-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="내 코드가 다른 학생들에게 공유되고 있습니다">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </div>
        <div
          v-if="showTeacherTab"
          class="file-tab"
          :class="{ active: activeTab === 'teacher-code' }"
          @click="switchTab('teacher-code')"
        >
          교사 공유
        </div>
        <div
          v-if="showSharedStudentTab"
          class="file-tab shared-student-tab"
          :class="{ active: activeTab === 'shared-student-code' }"
          @click="switchTab('shared-student-code')"
        >
          <span>{{ syncStore.sharedStudentName }}</span>
          <svg class="share-icon-purple" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </div>

        <!-- 모니터링 중인 학생 탭들 (교사 전용) -->
        <div
          v-for="studentId in monitoringStudents"
          v-show="syncStore.isTeacher"
          :key="`monitoring-${studentId}`"
          class="file-tab monitoring-tab"
          :class="{ active: activeTab === `monitoring-${studentId}`, sharing: syncStore.sharedStudentId === studentId }"
          @click="switchTab(`monitoring-${studentId}`)"
        >
          <span>{{ studentList.find(s => s.id === studentId)?.name || studentId }}</span>
          <!-- 학생 코드 공유 버튼 -->
          <button
            v-if="activeTab === `monitoring-${studentId}`"
            @click.stop="toggleShareStudentCode(studentId)"
            class="share-student-btn"
            :class="{ active: syncStore.sharedStudentId === studentId }"
            :title="syncStore.sharedStudentId === studentId ? '공유 중지' : '학생들에게 공유'"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            {{ syncStore.sharedStudentId === studentId ? '공유 중' : '공유' }}
          </button>
          <!-- 공유 중 아이콘 (다른 탭 선택 시) -->
          <svg v-if="syncStore.sharedStudentId === studentId && activeTab !== `monitoring-${studentId}`" class="share-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
          <button
            @click.stop="removeMonitoringStudent(studentId)"
            class="close-tab-btn"
            title="모니터링 중지"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="actions">
        <!-- 모바일에서만 과제 토글 버튼 표시 -->
        <button
          v-if="uiStore.isMobile"
          class="task-btn"
          :class="{ active: showTask }"
          @click="showTask = !showTask"
        >
          과제
        </button>

        <!-- 모니터링 드롭다운 (교사 전용) -->
        <div v-if="syncStore.isTeacher" class="monitoring-dropdown" @click.stop>
          <button
            class="monitoring-btn"
            @click="toggleMonitoringDropdown"
            :title="'학생 모니터링'"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span v-if="!uiStore.isMobile">모니터링</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div v-if="isMonitoringDropdownOpen" class="monitoring-dropdown-menu" @click.stop>
            <div class="monitoring-dropdown-header">학생 목록</div>
            <div
              v-for="student in studentList"
              :key="student.id"
              class="monitoring-dropdown-item"
              :class="{ disabled: monitoringStudents.includes(student.id) }"
              @click.stop="monitoringStudents.includes(student.id) ? null : addMonitoringStudent(student.id)"
            >
              {{ student.name }}
              <span v-if="monitoringStudents.includes(student.id)" class="monitoring-badge">모니터링 중</span>
            </div>
            <div v-if="studentList.length === 0" class="monitoring-dropdown-empty">
              등록된 학생이 없습니다
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- 데스크톱: 과제 상시 표시 패널 (툴바 아래) -->
    <div v-if="!uiStore.isMobile" class="task-panel">
      <div class="task-panel-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span>실습 내용</span>
      </div>
      <div class="task-panel-content">
        {{ currentTaskDescription }}
      </div>
    </div>

    <div class="editor-area">
      <SplitPane direction="vertical" :initialSplit="70" :minSize="10">
        <template #first>
          <div class="monaco-wrapper" ref="editorContainer">
            <!-- Task Overlay -->
            <div v-if="showTask && uiStore.isMobile" class="task-overlay glass-panel">
              <div class="task-header">
                <span>실습 내용</span>
                <button class="close-btn" @click="showTask = false">×</button>
              </div>
              <div class="task-content">
                {{ currentTaskDescription }}
              </div>
            </div>
          </div>
        </template>

        <template #second>
          <div class="console-output">
            <div class="console-header">
              <span>콘솔</span>
              <button class="run-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                실행
              </button>
            </div>
            <div class="console-body">
              > 실행 준비 완료...
            </div>
          </div>
        </template>
      </SplitPane>
    </div>
  </div>
</template>

<style scoped>
.coding-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  position: relative;
}

.editor-toolbar {
  height: 40px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0; /* Prevent toolbar shrinking */
}

.editor-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.file-tabs {
  display: flex;
  height: 100%;
  gap: 2px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  min-width: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.file-tabs::-webkit-scrollbar {
  height: 4px;
}

.file-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.file-tabs::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.file-tabs::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.file-tab {
  padding: 0 0.75rem;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border-top: 2px solid transparent;
  flex-shrink: 0;
  white-space: nowrap;
  opacity: 0.8;
}

.file-tab:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
  opacity: 1;
}

.file-tab.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-top: 2px solid var(--text-accent);
  opacity: 1;
}

/* 학생 코드가 공유 중일 때 실습 탭 스타일 */
.file-tab.my-code-shared {
  border-top: 2px solid var(--info-color);
  animation: tab-share-pulse-blue 2s ease-in-out infinite;
}

.file-tab.my-code-shared.active {
  border-top: 2px solid var(--info-color);
  animation: tab-share-pulse-blue 2s ease-in-out infinite;
}

/* 교사 코드 공유 중일 때 실습 탭 스타일 */
.file-tab.teacher-sharing {
  border-top: 2px solid var(--info-color);
  animation: tab-share-pulse-blue 2s ease-in-out infinite;
}

.file-tab.teacher-sharing.active {
  border-top: 2px solid var(--info-color);
  animation: tab-share-pulse-blue 2s ease-in-out infinite;
}

/* 모니터링 탭 공유 중 스타일 (보라색 유지) */
.monitoring-tab.sharing {
  animation: tab-share-pulse-purple 2s ease-in-out infinite;
}

@keyframes tab-share-pulse-blue {
  0%, 100% {
    background: rgba(96, 165, 250, 0.08);
  }
  50% {
    background: rgba(96, 165, 250, 0.2);
  }
}

@keyframes tab-share-pulse-purple {
  0%, 100% {
    background: rgba(168, 85, 247, 0.1);
  }
  50% {
    background: rgba(168, 85, 247, 0.25);
  }
}

/* 실습 탭 최소 너비 */
.practice-tab {
  min-width: 4.5rem;
  justify-content: center;
}

.shared-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.4rem;
  margin-left: 0.5rem;
  background: rgba(59, 130, 246, 0.2);
  color: var(--info-color);
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 500;
  animation: share-pulse 2s ease-in-out infinite;
}

.share-icon {
  color: var(--info-color);
  flex-shrink: 0;
  animation: share-pulse 2s ease-in-out infinite;
}

@keyframes share-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.15);
  }
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.task-btn {
  background: var(--hover-bg);
  color: var(--text-secondary);
  padding: 0.375rem 0.75rem;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.task-btn.active {
  background: var(--text-accent);
  color: var(--bg-primary);
}

.monaco-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.task-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  left: 10px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--text-accent);
  border-radius: var(--radius-md);
  padding: 1rem;
  z-index: 20;
  box-shadow: var(--shadow-lg);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: var(--text-accent);
}

.close-btn {
  font-size: 1.2rem;
  line-height: 1;
  color: var(--text-secondary);
}

.task-content {
  font-size: 0.9rem;
  line-height: 1.5;
}

.console-output {
  height: 100%;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem var(--spacing-md);
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.console-header .run-btn {
  background: var(--success-color);
  color: white;
  padding: 0.25rem 0.6rem;
  height: 26px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  text-transform: none;
}

.console-header .run-btn:hover {
  filter: brightness(1.1);
}

.console-body {
  padding: var(--spacing-md);
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  color: var(--text-secondary);
  overflow-y: auto;
  flex: 1;
}

/* 데스크톱 과제 패널 */
.task-panel {
  background: rgba(59, 130, 246, 0.08);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  flex-shrink: 0;
}

.task-panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem var(--spacing-md);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-accent);
  text-transform: uppercase;
  background: rgba(59, 130, 246, 0.05);
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
}

.task-panel-header svg {
  color: var(--text-accent);
}

.task-panel-content {
  padding: 0.75rem var(--spacing-md);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-primary);
}

.share-my-code-btn {
  background: rgba(59, 130, 246, 0.2);
  color: var(--info-color);
  padding: 0.2rem 0.5rem;
  margin-left: 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s;
  border: 1px solid rgba(59, 130, 246, 0.3);
  white-space: nowrap;
}

.share-my-code-btn:hover {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.5);
}

.share-my-code-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.share-student-btn {
  background: rgba(168, 85, 247, 0.2);
  color: var(--purple-color);
  padding: 0.2rem 0.5rem;
  margin-left: 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s;
  border: 1px solid rgba(168, 85, 247, 0.3);
  white-space: nowrap;
}

.share-student-btn:hover {
  background: rgba(168, 85, 247, 0.3);
  border-color: rgba(168, 85, 247, 0.5);
}

.share-student-btn.active {
  background: var(--purple-color);
  color: white;
  border-color: var(--purple-color);
}

.monitoring-tab {
  border-top-color: rgba(168, 85, 247, 0.5);
}

.monitoring-tab:hover {
  background: rgba(168, 85, 247, 0.15);
}

.monitoring-tab.active {
  background: var(--bg-primary);
  border-top-color: var(--purple-color);
}

/* 공유된 학생 코드 탭 (학생 화면에서 다른 학생 코드 볼 때) */
.shared-student-tab {
  border-top-color: rgba(168, 85, 247, 0.5);
  animation: tab-share-pulse-purple 2s ease-in-out infinite;
}

.shared-student-tab:hover {
  background: rgba(168, 85, 247, 0.15);
}

.shared-student-tab.active {
  background: var(--bg-primary);
  border-top-color: var(--purple-color);
  animation: none;
}

.share-icon-purple {
  color: var(--purple-color);
  flex-shrink: 0;
  animation: share-pulse-purple 2s ease-in-out infinite;
}

@keyframes share-pulse-purple {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.15);
  }
}

.close-tab-btn {
  background: transparent;
  color: var(--text-secondary);
  padding: 0.15rem;
  margin-left: 0.5rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  opacity: 0.6;
}

.close-tab-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--danger-color);
  opacity: 1;
}

.monitoring-dropdown {
  position: relative;
}

.monitoring-btn {
  background: rgba(168, 85, 247, 0.15);
  color: var(--purple-color);
  padding: 0.375rem 0.75rem;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgba(168, 85, 247, 0.3);
  transition: all 0.2s;
}

.monitoring-btn:hover {
  background: rgba(168, 85, 247, 0.25);
  border-color: rgba(168, 85, 247, 0.5);
}

.monitoring-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
}

.monitoring-dropdown-header {
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.monitoring-dropdown-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
}

.monitoring-dropdown-item:hover:not(.disabled) {
  background: rgba(168, 85, 247, 0.1);
}

.monitoring-dropdown-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(128, 128, 128, 0.05);
}

.monitoring-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  background: rgba(168, 85, 247, 0.2);
  color: var(--purple-color);
}

.monitoring-dropdown-empty {
  padding: 1rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
}
</style>

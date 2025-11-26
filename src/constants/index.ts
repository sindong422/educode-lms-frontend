// localStorage 키 접두사
export const STORAGE_PREFIX = 'educode:sync:'

// 스토리지 키 상수
export const STORAGE_KEYS = {
  // Auth
  IS_TEACHER: 'isTeacher',

  // Focus Mode
  FOCUS_MODE: 'focusMode',
  SPLIT_PERCENT: 'splitPercent',
  CONTENT_SCROLL_POSITION: 'contentScrollPosition',
  CONTENT_PANE_WIDTH: 'contentPaneWidth',

  // Lesson
  CURRENT_LESSON_STEP: 'currentLessonStep',

  // Code Share
  SHARE_CODE_EDITOR: 'shareCodeEditor',
  CODE_CONTENT: 'codeContent',
  SHARED_STUDENT_ID: 'sharedStudentId',
  SHARED_STUDENT_NAME: 'sharedStudentName',
  SHARED_STUDENT_CODE: 'sharedStudentCode',
  TEACHER_CURSOR: 'teacherCursor',
  TEACHER_NAME: 'teacherName',

  // Students
  STUDENTS: 'students',

  // Whiteboard
  WHITEBOARD_PATHS: 'whiteboardPaths',
  WHITEBOARD_ACTIVE: 'whiteboardActive',
  CURRENT_DRAWING_PATH: 'currentDrawingPath',

  // Chat
  CHAT_MESSAGES: 'chatMessages'
} as const

// 폴링 간격 (ms)
export const POLLING_INTERVAL = 300

// 기본 분할 비율
export const DEFAULT_SPLIT_PERCENT = 40

// 기본 교사 이름
export const DEFAULT_TEACHER_NAME = '교사'

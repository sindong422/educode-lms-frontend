// 학생 정보 타입
export interface Student {
  id: string
  name: string
}

// 커서 위치 타입
export interface CursorPosition {
  lineNumber: number
  column: number
}

// 판서 경로 포인트 타입
export interface PathPoint {
  x: number
  y: number
}

// 판서 경로 타입
export interface WhiteboardPath {
  id: string
  points: PathPoint[]
  color: string
  width: number
  scrollY: number
  timestamp: number
}

// 현재 그리기 중인 경로 타입
export interface CurrentDrawingPath {
  points: PathPoint[]
  color: string
  width: number
  scrollY: number
}

// 단계별 판서 경로 타입
export type WhiteboardPathsByStep = Record<number, WhiteboardPath[]>

// 채팅 메시지 타입
export interface ChatMessage {
  id: string
  sender: string
  senderId: string
  message: string
  timestamp: number
  isTeacher: boolean
}

// 학습 콘텐츠 단계 타입
export interface LessonStep {
  title: string
  content: string
}

// 과제 콘텐츠 타입
export interface TaskContent {
  step: number
  description: string
  initialCode: string
  isFreeStyle?: boolean  // 자유 실습 여부
}

// 역할 타입
export type UserRole = 'teacher' | 'student'

// 스토리지 키 타입 (자동완성을 위해)
export type StorageKey =
  | 'isTeacher'
  | 'focusMode'
  | 'splitPercent'
  | 'currentLessonStep'
  | 'shareCodeEditor'
  | 'codeContent'
  | 'contentScrollPosition'
  | 'students'
  | 'sharedStudentId'
  | 'sharedStudentName'
  | 'sharedStudentCode'
  | 'teacherCursor'
  | 'teacherName'
  | 'whiteboardPaths'
  | 'whiteboardActive'
  | 'currentDrawingPath'
  | 'chatMessages'

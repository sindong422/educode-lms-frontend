/**
 * 랜덤 학생 ID 생성
 * @returns student_xxxxxx 형식의 학생 ID
 */
export function generateStudentId(): string {
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `student_${randomStr}`
}

/**
 * 판서 경로 ID 생성
 * @returns path_timestamp_randomstring 형식의 경로 ID
 */
export function generatePathId(): string {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 11)
  return `path_${timestamp}_${randomStr}`
}

/**
 * 채팅 메시지 ID 생성
 * @returns msg_timestamp_randomstring 형식의 메시지 ID
 */
export function generateMessageId(): string {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `msg_${timestamp}_${randomStr}`
}

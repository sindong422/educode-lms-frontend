import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { generateStudentId } from '@/utils/generators'
import { getRandomKoreanName } from '@/data/koreanNames'

/**
 * 학생 세션을 관리하는 composable
 * URL 파라미터에서 학생 정보를 읽거나 자동 생성합니다.
 */
export function useStudentSession() {
  const route = useRoute()
  const router = useRouter()

  const studentId = ref<string>('')
  const studentName = ref<string>('')
  const isInitialized = ref(false)

  // URL에서 학생 ID 가져오기
  const getStudentIdFromUrl = (): string | null => {
    return route.query.studentId as string | null
  }

  // URL에서 학생 이름 가져오기
  const getStudentNameFromUrl = (): string | null => {
    return route.query.studentName as string | null
  }

  // 학생 정보 초기화
  const initializeStudent = async (): Promise<void> => {
    const urlStudentId = getStudentIdFromUrl()
    const urlStudentName = getStudentNameFromUrl()

    if (urlStudentId) {
      // URL에 학생 ID가 있으면 사용
      studentId.value = urlStudentId
      studentName.value = urlStudentName || '사용자'
      isInitialized.value = true
    } else {
      // 자동 생성
      const autoId = generateStudentId()
      const autoName = getRandomKoreanName()

      studentId.value = autoId
      studentName.value = autoName

      console.log('[학생 세션] 자동 생성된 ID:', autoId, '이름:', autoName)

      // URL에 파라미터 추가 (페이지 새로고침 없이)
      await router.replace({
        query: {
          ...route.query,
          studentId: autoId,
          studentName: autoName
        }
      })

      isInitialized.value = true
    }
  }

  // 학생 정보가 유효한지 확인
  const isValid = computed(() => {
    return isInitialized.value && studentId.value.length > 0
  })

  // 마운트 시 초기화
  onMounted(() => {
    initializeStudent()
  })

  return {
    studentId,
    studentName,
    isInitialized,
    isValid,
    initializeStudent
  }
}

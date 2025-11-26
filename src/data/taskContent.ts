import type { TaskContent } from '@/types'

// 단계별 과제 내용
export const taskContent: TaskContent[] = [
  {
    step: 0,
    description: '자유롭게 코드를 작성해보세요. 자바의 기본 구조를 익혀봅시다.',
    initialCode: `public class Main {
    public static void main(String[] args) {
        // 자유롭게 코드를 작성해보세요

    }
}`,
    isFreeStyle: true
  },
  {
    step: 1,
    description: 'System.out.println을 사용하여 콘솔에 "Hello World"를 출력하세요.',
    initialCode: `public class Main {
    public static void main(String[] args) {
        // System.out.println()을 사용하여 "Hello World"를 출력하세요

    }
}`
  },
  {
    step: 2,
    description: '정수, 실수, 문자열 타입의 변수를 각각 선언하고 출력하세요.',
    initialCode: `public class Main {
    public static void main(String[] args) {
        // 정수형 변수 age 선언 (값: 25)

        // 실수형 변수 price 선언 (값: 19.99)

        // 문자열 변수 name 선언 (값: "홍길동")

        // 각 변수를 출력하세요

    }
}`
  },
  {
    step: 3,
    description: '점수(score = 85)를 기준으로 학점을 출력하는 if-else 문을 작성하세요.',
    initialCode: `public class Main {
    public static void main(String[] args) {
        int score = 85;

        // 90점 이상: "A 학점"
        // 80점 이상: "B 학점"
        // 70점 이상: "C 학점"
        // 그 외: "재시험"

    }
}`
  },
  {
    step: 4,
    description: 'for 반복문을 사용하여 1부터 10까지의 숫자를 출력하세요.',
    initialCode: `public class Main {
    public static void main(String[] args) {
        // for 반복문을 사용하여 1부터 10까지 출력하세요

    }
}`
  }
]

/**
 * 현재 단계의 과제 설명 가져오기
 */
export function getTaskDescription(step: number): string {
  const task = taskContent.find(t => t.step === step)
  return task?.description || '과제 내용을 준비 중입니다.'
}

/**
 * 현재 단계의 초기 코드 가져오기
 */
export function getInitialCode(step: number): string {
  const task = taskContent.find(t => t.step === step)
  return task?.initialCode || ''
}

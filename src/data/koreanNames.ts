// 한국 이름 목록 (자동 학생 이름 생성용)
export const koreanNames: string[] = [
  '홍길동', '김철수', '이영희', '박민수', '최지은',
  '정수진', '강민호', '윤서연', '임재현', '한지우',
  '오성민', '신예은', '조현우', '배수지', '남궁민',
  '서준호', '권나영', '양지훈', '송하늘', '안유진'
]

/**
 * 랜덤 한국 이름 선택
 */
export function getRandomKoreanName(): string {
  const randomIndex = Math.floor(Math.random() * koreanNames.length)
  return koreanNames[randomIndex]
}

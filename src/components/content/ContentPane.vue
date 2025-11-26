<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useLessonStore } from '../../stores/lessonStore'
import { useSyncStore } from '../../stores/sync'

const lessonStore = useLessonStore()
const syncStore = useSyncStore()

// 콘텐츠 컨테이너 ref
const contentPaneRef = ref(null)
let isScrolling = false
let scrollTimeout = null

// 학생 집중 모드 여부
const isSyncMode = computed(() => !syncStore.isTeacher && syncStore.focusMode)

// 목차 드롭다운 상태
const isTocOpen = ref(false)
const isFullTocOpen = ref(false)

// 목차 토글
const toggleToc = () => {
  isTocOpen.value = !isTocOpen.value
}

// 전체 목차 열기
const openFullToc = () => {
  isFullTocOpen.value = true
  isTocOpen.value = false
}

// 전체 목차 닫기
const closeFullToc = () => {
  isFullTocOpen.value = false
}

// 전체 커리큘럼 데이터 (단원 > 차시 > 수업)
const fullCurriculum = [
  {
    unit: 1,
    title: '자바 프로그래밍 입문',
    chapters: [
      {
        chapter: 1,
        title: '자바 기초 문법',
        current: true,
        lessons: [
          { id: 0, title: '자바 프로그래밍 시작하기' },
          { id: 1, title: 'Hello World 출력하기' },
          { id: 2, title: '변수와 데이터 타입' },
          { id: 3, title: '조건문 (if-else)' },
          { id: 4, title: '반복문 (for 루프)' }
        ]
      },
      {
        chapter: 2,
        title: '배열과 문자열',
        lessons: [
          { id: 5, title: '배열 선언과 활용', upcoming: true },
          { id: 6, title: '문자열 처리', upcoming: true },
          { id: 7, title: '다차원 배열', upcoming: true }
        ]
      }
    ]
  },
  {
    unit: 2,
    title: '객체지향 프로그래밍',
    chapters: [
      {
        chapter: 3,
        title: '클래스와 객체',
        lessons: [
          { id: 8, title: '클래스 정의하기', upcoming: true },
          { id: 9, title: '객체 생성과 사용', upcoming: true },
          { id: 10, title: '생성자와 메서드', upcoming: true }
        ]
      },
      {
        chapter: 4,
        title: '상속과 다형성',
        lessons: [
          { id: 11, title: '상속 이해하기', upcoming: true },
          { id: 12, title: '메서드 오버라이딩', upcoming: true },
          { id: 13, title: '다형성 활용', upcoming: true }
        ]
      }
    ]
  },
  {
    unit: 3,
    title: '고급 자바',
    chapters: [
      {
        chapter: 5,
        title: '예외 처리',
        lessons: [
          { id: 14, title: 'try-catch 구문', upcoming: true },
          { id: 15, title: '사용자 정의 예외', upcoming: true }
        ]
      },
      {
        chapter: 6,
        title: '컬렉션 프레임워크',
        lessons: [
          { id: 16, title: 'List와 ArrayList', upcoming: true },
          { id: 17, title: 'Map과 HashMap', upcoming: true }
        ]
      }
    ]
  }
]

// 전체 목차에서 특정 수업으로 이동
const goToLesson = (lessonId) => {
  if (lessonId <= 4 && !isSyncMode.value) {  // 현재 구현된 수업만 이동 가능
    lessonStore.goToStep(lessonId)
    scrollToTop()
    isFullTocOpen.value = false
  }
}

// 목차에서 특정 단계로 이동
const goToStep = (stepIndex) => {
  if (!isSyncMode.value) {
    lessonStore.goToStep(stepIndex)
    scrollToTop()
    isTocOpen.value = false
  }
}

// 외부 클릭 시 목차 닫기
const handleClickOutside = (event) => {
  const tocWrapper = document.querySelector('.toc-wrapper')
  if (tocWrapper && !tocWrapper.contains(event.target)) {
    isTocOpen.value = false
  }
}

// 단계별 콘텐츠 데이터
const lessonContent = [
  {
    title: '자바 프로그래밍 시작하기',
    description: '자바는 세계에서 가장 인기 있는 프로그래밍 언어 중 하나입니다. 이 강좌에서는 자바의 기초부터 차근차근 배워보겠습니다.',
    videoUrl: 'https://www.youtube.com/embed/eIrMbAQSU34',
    goal: '자바가 무엇인지 이해하고, 개발 환경을 익힙니다.',
    content: `
      <h3>자바란?</h3>
      <p>자바는 1995년 썬 마이크로시스템즈에서 개발한 객체지향 프로그래밍 언어입니다.</p>
      <ul>
        <li><strong>플랫폼 독립적</strong>: "Write Once, Run Anywhere"</li>
        <li><strong>객체지향</strong>: 모든 것이 객체로 표현됩니다</li>
        <li><strong>안정성</strong>: 메모리 관리와 예외 처리가 강력합니다</li>
      </ul>
    `
  },
  {
    title: 'Hello World 출력하기',
    description: '프로그래밍의 첫 걸음! 콘솔에 "Hello World"를 출력해봅시다.',
    goal: '<code>System.out.println()</code>을 사용하여 콘솔에 텍스트를 출력합니다.',
    content: `
      <h3>System.out.println() 이해하기</h3>
      <p>자바에서 가장 기본적인 출력 메서드입니다.</p>
      <div class="code-example">
        <pre><code>public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}</code></pre>
      </div>
      <h4>코드 설명</h4>
      <ul>
        <li><code>public class Main</code>: Main이라는 이름의 공개 클래스를 정의합니다</li>
        <li><code>public static void main</code>: 프로그램의 시작점입니다</li>
        <li><code>System.out.println</code>: 콘솔에 출력하고 줄바꿈합니다</li>
      </ul>
    `
  },
  {
    title: '변수와 데이터 타입',
    description: '데이터를 저장하고 활용하는 방법을 배웁니다.',
    videoUrl: 'https://www.youtube.com/embed/so1iUWaLmKA',
    goal: '다양한 데이터 타입의 변수를 선언하고 사용합니다.',
    content: `
      <h3>기본 데이터 타입</h3>
      <p>자바에는 8가지 기본(primitive) 데이터 타입이 있습니다.</p>
      <div class="code-example">
        <pre><code>int age = 25;           // 정수
double price = 19.99;   // 실수
boolean isStudent = true;  // 참/거짓
char grade = 'A';       // 문자
String name = "홍길동"; // 문자열</code></pre>
      </div>
      <h4>주요 타입</h4>
      <ul>
        <li><strong>int</strong>: 정수 (-2,147,483,648 ~ 2,147,483,647)</li>
        <li><strong>double</strong>: 실수 (소수점 포함)</li>
        <li><strong>boolean</strong>: true 또는 false</li>
        <li><strong>String</strong>: 문자열 (참조 타입)</li>
      </ul>
    `
  },
  {
    title: '조건문 (if-else)',
    description: '조건에 따라 다른 코드를 실행하는 방법을 배웁니다.',
    goal: 'if-else 문을 사용하여 조건부 로직을 구현합니다.',
    content: `
      <h3>if-else 문</h3>
      <p>조건이 참(true)일 때와 거짓(false)일 때 다른 코드를 실행합니다.</p>
      <div class="code-example">
        <pre><code>int score = 85;

if (score >= 90) {
    System.out.println("A 학점");
} else if (score >= 80) {
    System.out.println("B 학점");
} else if (score >= 70) {
    System.out.println("C 학점");
} else {
    System.out.println("재시험");
}</code></pre>
      </div>
      <h4>비교 연산자</h4>
      <ul>
        <li><code>==</code>: 같다</li>
        <li><code>!=</code>: 같지 않다</li>
        <li><code>&gt;</code>: 크다</li>
        <li><code>&lt;</code>: 작다</li>
        <li><code>&gt;=</code>: 크거나 같다</li>
        <li><code>&lt;=</code>: 작거나 같다</li>
      </ul>
    `
  },
  {
    title: '반복문 (for 루프)',
    description: '같은 코드를 여러 번 실행하는 방법을 배웁니다.',
    videoUrl: 'https://www.youtube.com/embed/wxds6MAtUQ0',
    goal: 'for 반복문을 사용하여 반복 작업을 수행합니다.',
    content: `
      <h3>for 반복문</h3>
      <p>지정한 횟수만큼 코드를 반복 실행합니다.</p>
      <div class="code-example">
        <pre><code>// 1부터 10까지 출력
for (int i = 1; i <= 10; i++) {
    System.out.println("숫자: " + i);
}

// 배열 순회
String[] fruits = {"사과", "바나나", "오렌지"};
for (String fruit : fruits) {
    System.out.println(fruit);
}</code></pre>
      </div>
      <h4>for 문 구조</h4>
      <ul>
        <li><strong>초기화</strong>: <code>int i = 1</code> - 시작 값 설정</li>
        <li><strong>조건</strong>: <code>i &lt;= 10</code> - 반복 계속 조건</li>
        <li><strong>증감</strong>: <code>i++</code> - 매 반복마다 실행</li>
      </ul>
    `
  }
]

// 현재 단계의 콘텐츠
const currentContent = computed(() => lessonContent[lessonStore.currentStep] || lessonContent[0])

// 교사 모드일 때: lessonStore의 단계 변경을 sync store에 동기화
watch(() => lessonStore.currentStep, (newStep) => {
  if (syncStore.isTeacher) {
    syncStore.setCurrentLessonStep(newStep)
  }
})

// 학생 집중 모드일 때: sync store의 단계 변경을 lessonStore에 동기화
watch(() => syncStore.currentLessonStep, (newStep) => {
  if (isSyncMode.value && lessonStore.currentStep !== newStep) {
    lessonStore.currentStep = newStep
  }
})

// 스크롤 최상단으로 이동
const scrollToTop = () => {
  if (contentPaneRef.value) {
    contentPaneRef.value.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
    // 교사 모드일 때 스크롤 위치 동기화
    if (syncStore.isTeacher) {
      syncStore.setContentScrollPosition(0)
    }
  }
}

// 이전/다음 단계 핸들러
const handlePrevStep = () => {
  if (!isSyncMode.value) {
    lessonStore.prevStep()
    scrollToTop()
  }
}

const handleNextStep = () => {
  if (!isSyncMode.value) {
    lessonStore.nextStep()
    scrollToTop()
  }
}

// 버튼 비활성화 여부
const isPrevDisabled = computed(() => {
  return isSyncMode.value || lessonStore.currentStep === 0
})

const isNextDisabled = computed(() => {
  return isSyncMode.value
})

// 스크롤 이벤트 핸들러 (교사 모드)
const handleScroll = () => {
  console.log('[교사] handleScroll 호출됨, isTeacher:', syncStore.isTeacher, 'hasRef:', !!contentPaneRef.value)
  if (!syncStore.isTeacher || !contentPaneRef.value) return

  // 디바운스 처리
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }

  scrollTimeout = setTimeout(() => {
    const scrollTop = contentPaneRef.value.scrollTop
    console.log('[교사] 스크롤 위치 저장:', scrollTop)
    syncStore.setContentScrollPosition(scrollTop)
  }, 100) // 100ms 디바운스
}

// sync store의 스크롤 위치 변경 감지 (학생 집중 모드)
watch(() => syncStore.contentScrollPosition, (newPosition, oldPosition) => {
  console.log('[학생] 스크롤 위치 변경 감지:', {
    newPosition,
    oldPosition,
    isSyncMode: isSyncMode.value,
    isTeacher: syncStore.isTeacher,
    focusMode: syncStore.focusMode,
    hasRef: !!contentPaneRef.value,
    isScrolling
  })
  if (isSyncMode.value && contentPaneRef.value && !isScrolling) {
    isScrolling = true
    console.log('[학생] 스크롤 적용 중:', newPosition)
    contentPaneRef.value.scrollTo({
      top: newPosition,
      behavior: 'smooth'
    })

    setTimeout(() => {
      isScrolling = false
      console.log('[학생] 스크롤 적용 완료')
    }, 300)
  }
})

// 컴포넌트 마운트 시 스크롤 이벤트 리스너 추가
onMounted(async () => {
  await nextTick()
  console.log('===== ContentPane onMounted =====')
  console.log('isTeacher:', syncStore.isTeacher)
  console.log('focusMode:', syncStore.focusMode)
  console.log('isSyncMode:', isSyncMode.value)
  console.log('contentPaneRef:', contentPaneRef.value)
  console.log('contentScrollPosition:', syncStore.contentScrollPosition)
  console.log('================================')

  if (contentPaneRef.value && syncStore.isTeacher) {
    console.log('[교사] 스크롤 이벤트 리스너 추가됨')
    contentPaneRef.value.addEventListener('scroll', handleScroll)
  } else if (contentPaneRef.value && !syncStore.isTeacher) {
    console.log('[학생] 모드로 실행됨, 스크롤 동기화 대기 중')
    // 학생 집중 모드일 때 마운트 시 스크롤 위치 복원
    if (isSyncMode.value && syncStore.contentScrollPosition > 0) {
      console.log('[학생] 마운트 시 스크롤 위치 복원:', syncStore.contentScrollPosition)
      contentPaneRef.value.scrollTop = syncStore.contentScrollPosition
    }
  }

  // 외부 클릭 감지
  document.addEventListener('click', handleClickOutside)
})

// 컴포넌트 언마운트 시 이벤트 리스너 제거
onUnmounted(() => {
  if (contentPaneRef.value && syncStore.isTeacher) {
    contentPaneRef.value.removeEventListener('scroll', handleScroll)
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="content-pane" ref="contentPaneRef">
    <div class="content-header">
      <div class="toc-wrapper">
        <button class="toc-btn" @click="toggleToc" :disabled="isSyncMode" title="목차">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        <button class="nav-arrow-btn" @click="handlePrevStep" :disabled="isPrevDisabled" title="이전">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2>목차 {{ lessonStore.currentStep + 1 }} / {{ lessonStore.totalSteps }}</h2>
        <button class="nav-arrow-btn" @click="handleNextStep" :disabled="isNextDisabled" title="다음">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>

        <!-- 목차 드롭다운 -->
        <div v-if="isTocOpen" class="toc-dropdown">
          <div class="toc-dropdown-header">
            <span>현재 차시 목차</span>
            <button class="full-toc-btn" @click="openFullToc" title="전체 목차">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              전체 목차
            </button>
          </div>
          <div
            v-for="(lesson, index) in lessonContent"
            :key="index"
            class="toc-item"
            :class="{ active: lessonStore.currentStep === index }"
            @click="goToStep(index)"
          >
            <span class="toc-number">{{ index + 1 }}</span>
            <span class="toc-title">{{ lesson.title }}</span>
          </div>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${((lessonStore.currentStep + 1) / lessonStore.totalSteps) * 100}%` }"></div>
      </div>
    </div>

    <div class="content-body">
      <h1>{{ currentContent.title }}</h1>
      <p class="description">{{ currentContent.description }}</p>

      <!-- 동영상 콘텐츠 -->
      <div v-if="currentContent.videoUrl" class="video-container">
        <iframe
          :src="currentContent.videoUrl"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>

      <!-- HTML 콘텐츠 -->
      <div class="lesson-content" v-html="currentContent.content"></div>

      <div class="instruction-box glass-panel">
        <h3>🎯 학습 목표</h3>
        <p v-html="currentContent.goal"></p>
      </div>

      <div class="nav-buttons">
        <button class="btn secondary" @click="handlePrevStep" :disabled="isPrevDisabled">
          ← 이전
        </button>
        <button class="btn primary" @click="handleNextStep" :disabled="isNextDisabled">
          다음 단계 →
        </button>
      </div>
    </div>

    <!-- 전체 목차 모달 -->
    <Teleport to="body">
      <div v-if="isFullTocOpen" class="full-toc-overlay" @click.self="closeFullToc">
        <div class="full-toc-modal">
          <div class="full-toc-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              Java 기초 - 전체 커리큘럼
            </h2>
            <button class="close-btn" @click="closeFullToc">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="full-toc-content">
            <div v-for="unitData in fullCurriculum" :key="unitData.unit" class="unit-section">
              <div class="unit-header">
                <span class="unit-badge">단원 {{ unitData.unit }}</span>
                <h3>{{ unitData.title }}</h3>
              </div>

              <div v-for="chapter in unitData.chapters" :key="chapter.chapter" class="chapter-section" :class="{ 'current-chapter': chapter.current }">
                <div class="chapter-header">
                  <span class="chapter-number">{{ chapter.chapter }}차시</span>
                  <span class="chapter-title">{{ chapter.title }}</span>
                  <span v-if="chapter.current" class="current-badge">현재 학습중</span>
                </div>

                <div class="lesson-list">
                  <div
                    v-for="lesson in chapter.lessons"
                    :key="lesson.id"
                    class="lesson-item"
                    :class="{
                      active: lessonStore.currentStep === lesson.id,
                      upcoming: lesson.upcoming,
                      clickable: !lesson.upcoming && !isSyncMode
                    }"
                    @click="goToLesson(lesson.id)"
                  >
                    <span class="lesson-icon">
                      <svg v-if="lessonStore.currentStep === lesson.id" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="6"></circle>
                      </svg>
                      <svg v-else-if="lesson.upcoming" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </span>
                    <span class="lesson-title">{{ lesson.title }}</span>
                    <span v-if="lesson.upcoming" class="upcoming-badge">예정</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.content-pane {
  padding: var(--spacing-xl);
  height: 100%;
  overflow-y: auto;
  background: var(--bg-primary);
}

.content-header {
  margin-bottom: var(--spacing-xl);
}

.toc-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}

.toc-wrapper h2 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-secondary);
}

.toc-btn {
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

.toc-btn:hover:not(:disabled) {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.toc-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-arrow-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.nav-arrow-btn:hover:not(:disabled) {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.nav-arrow-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.toc-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  min-width: 280px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
}

.toc-dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.full-toc-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: var(--radius-sm);
  color: var(--primary-color);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: none;
  cursor: pointer;
  transition: all 0.2s;
}

.full-toc-btn:hover {
  background: rgba(59, 130, 246, 0.25);
  border-color: var(--primary-color);
}

.toc-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toc-item:hover {
  background: rgba(59, 130, 246, 0.1);
}

.toc-item.active {
  background: rgba(59, 130, 246, 0.15);
  border-left: 3px solid var(--primary-color);
}

.toc-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.toc-item.active .toc-number {
  background: var(--primary-color);
  color: white;
}

.toc-title {
  font-size: 0.875rem;
  color: var(--text-primary);
}

.progress-bar {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  margin-top: var(--spacing-sm);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--text-accent);
  transition: width 0.3s ease;
}

.content-body h1 {
  font-size: 2rem;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.description {
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xl);
  font-size: 1.05rem;
}

/* 동영상 컨테이너 */
.video-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 비율 */
  margin: var(--spacing-xl) 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-tertiary);
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 레슨 콘텐츠 */
.lesson-content {
  margin: var(--spacing-xl) 0;
}

.lesson-content :deep(h3) {
  font-size: 1.3rem;
  margin-top: var(--spacing-xl);
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.lesson-content :deep(h4) {
  font-size: 1.1rem;
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
  color: var(--text-accent);
}

.lesson-content :deep(p) {
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.lesson-content :deep(ul) {
  margin: var(--spacing-md) 0;
  padding-left: var(--spacing-xl);
}

.lesson-content :deep(li) {
  line-height: 1.8;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.lesson-content :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}

.lesson-content :deep(code) {
  background: var(--hover-bg);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
  color: var(--text-accent);
}

/* 코드 예제 */
.lesson-content :deep(.code-example) {
  margin: var(--spacing-lg) 0;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.lesson-content :deep(.code-example pre) {
  margin: 0;
  padding: var(--spacing-lg);
  overflow-x: auto;
}

.lesson-content :deep(.code-example code) {
  background: transparent;
  padding: 0;
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.6;
}

.instruction-box {
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  margin: var(--spacing-xl) 0;
  border-left: 4px solid var(--text-accent);
  background: rgba(59, 130, 246, 0.1);
}

.instruction-box h3 {
  color: var(--text-accent);
  margin-bottom: var(--spacing-sm);
  font-size: 1.1rem;
}

.instruction-box p {
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}

.instruction-box :deep(code) {
  background: var(--hover-bg);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
  color: var(--text-accent);
}

.nav-buttons {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.btn.primary {
  background: var(--primary-color);
  color: white;
  flex: 1;
}
.btn.primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.btn.secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.btn.secondary:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 전체 목차 모달 */
.full-toc-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.full-toc-modal {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-2xl);
}

.full-toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.full-toc-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.full-toc-header h2 svg {
  color: var(--primary-color);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.full-toc-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem 1.5rem;
}

.unit-section {
  margin-bottom: 1.5rem;
}

.unit-section:last-child {
  margin-bottom: 0;
}

.unit-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.unit-badge {
  padding: 0.25rem 0.6rem;
  background: var(--primary-color);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 4px;
  text-transform: uppercase;
}

.unit-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.chapter-section {
  margin-left: 0.5rem;
  padding-left: 1rem;
  border-left: 2px solid var(--border-color);
  margin-bottom: 0.75rem;
}

.chapter-section.current-chapter {
  border-left-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.05);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: 0.5rem 0.5rem 0.5rem 1rem;
  margin-left: 0;
}

.chapter-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.chapter-number {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-accent);
  background: rgba(59, 130, 246, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.chapter-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.current-badge {
  margin-left: auto;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  background: var(--primary-color);
  color: white;
  border-radius: 4px;
}

.lesson-list {
  margin-left: 0.5rem;
}

.lesson-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.lesson-item.clickable {
  cursor: pointer;
}

.lesson-item.clickable:hover {
  background: rgba(59, 130, 246, 0.1);
}

.lesson-item.active {
  background: rgba(59, 130, 246, 0.15);
  border-left: 3px solid var(--primary-color);
  margin-left: -3px;
}

.lesson-item.upcoming {
  opacity: 0.6;
  cursor: not-allowed;
}

.lesson-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.lesson-item.active .lesson-icon {
  color: var(--primary-color);
}

.lesson-item:not(.active):not(.upcoming) .lesson-icon {
  color: var(--success-color);
}

.lesson-item.upcoming .lesson-icon {
  color: var(--text-secondary);
}

.lesson-title {
  font-size: 0.875rem;
  color: var(--text-primary);
  flex: 1;
}

.upcoming-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.15rem 0.4rem;
  background: rgba(148, 163, 184, 0.2);
  color: var(--text-secondary);
  border-radius: 4px;
}

/* 모바일 대응 */
@media (max-width: 768px) {
  .full-toc-modal {
    max-height: 90vh;
  }

  .full-toc-header {
    padding: 1rem;
  }

  .full-toc-header h2 {
    font-size: 1rem;
  }

  .full-toc-content {
    padding: 0.75rem 1rem 1rem;
  }

  .unit-header h3 {
    font-size: 1rem;
  }
}
</style>

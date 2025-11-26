import type { LessonStep } from '@/types'

export const lessonContent: LessonStep[] = [
  {
    title: '자바 프로그래밍 시작하기',
    content: `
      <p class="description">자바는 세계에서 가장 인기 있는 프로그래밍 언어 중 하나입니다. 이 강좌에서는 자바의 기초부터 차근차근 배워보겠습니다.</p>
      <div class="video-container">
        <iframe
          src="https://www.youtube.com/embed/eIrMbAQSU34"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
      <div class="instruction-box glass-panel">
        <h3>🎯 학습 목표</h3>
        <p>자바가 무엇인지 이해하고, 개발 환경을 익힙니다.</p>
      </div>
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
    content: `
      <p class="description">프로그래밍의 첫 걸음! 콘솔에 "Hello World"를 출력해봅시다.</p>
      <div class="instruction-box glass-panel">
        <h3>🎯 학습 목표</h3>
        <p><code>System.out.println()</code>을 사용하여 콘솔에 텍스트를 출력합니다.</p>
      </div>
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
    content: `
      <p class="description">데이터를 저장하고 활용하는 방법을 배웁니다.</p>
      <div class="video-container">
        <iframe
          src="https://www.youtube.com/embed/so1iUWaLmKA"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
      <div class="instruction-box glass-panel">
        <h3>🎯 학습 목표</h3>
        <p>다양한 데이터 타입의 변수를 선언하고 사용합니다.</p>
      </div>
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
    content: `
      <p class="description">조건에 따라 다른 코드를 실행하는 방법을 배웁니다.</p>
      <div class="instruction-box glass-panel">
        <h3>🎯 학습 목표</h3>
        <p>if-else 문을 사용하여 조건부 로직을 구현합니다.</p>
      </div>
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
    content: `
      <p class="description">같은 코드를 여러 번 실행하는 방법을 배웁니다.</p>
      <div class="video-container">
        <iframe
          src="https://www.youtube.com/embed/wxds6MAtUQ0"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
      <div class="instruction-box glass-panel">
        <h3>🎯 학습 목표</h3>
        <p>for 반복문을 사용하여 반복 작업을 수행합니다.</p>
      </div>
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

// 단계별 총 수
export const TOTAL_STEPS = lessonContent.length

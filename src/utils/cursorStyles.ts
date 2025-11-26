interface CursorUser {
  id: string
  name: string
  color: string
}

/**
 * 원격 커서 스타일을 DOM에 주입합니다.
 * Monaco Editor에서 다른 사용자의 커서를 표시하기 위해 사용됩니다.
 */
export function injectCursorStyles(users: CursorUser[]): void {
  const styleId = 'remote-cursor-styles'
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null

  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = styleId
    document.head.appendChild(styleEl)
  }

  let css = ''
  users.forEach(user => {
    css += `
      /* 커서 라인 (세로선) */
      .remote-cursor-${user.id} {
        border-left: 2px solid ${user.color} !important;
        margin-left: -1px;
      }
      /* 말풍선 컨테이너 */
      .remote-cursor-flag-${user.id} {
        position: relative;
        display: inline-block;
        width: 0;
        height: 0;
      }
      /* 말풍선 본체 */
      .remote-cursor-flag-${user.id}::before {
        content: "${user.name}";
        position: absolute;
        top: 18px;
        left: -2px;
        background: ${user.color};
        color: white;
        padding: 3px 8px;
        border-radius: 0 6px 6px 6px;
        font-size: 11px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        white-space: nowrap;
        font-weight: 600;
        z-index: 100;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        pointer-events: none;
        animation: cursor-fade-in 0.2s ease-out;
      }
      /* 말풍선 화살표 (위쪽) */
      .remote-cursor-flag-${user.id}::after {
        content: "";
        position: absolute;
        top: 14px;
        left: -2px;
        border-left: 0 solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 5px solid ${user.color};
        z-index: 100;
        pointer-events: none;
      }
    `
  })

  // 공통 애니메이션 추가
  css += `
    @keyframes cursor-fade-in {
      from {
        opacity: 0;
        transform: translateY(-5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `

  styleEl.textContent = css
}

// 커서 색상 상수
export const CURSOR_COLORS = {
  TEACHER: '#ef4444', // 빨간색
  STUDENT: '#a855f7'  // 보라색
} as const

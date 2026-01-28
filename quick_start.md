# Quick Start

로컬에서 UI를 실행하고 주요 경로에 접근하는 방법입니다.

## 사전 준비
- Node.js 20+ (권장)
- npm

## 로컬 실행
```bash
npm install
npm run dev
```

## WebSocket 서버 실행 (로컬)
```bash
npm run ws
```

WS 서버는 `process.env.PORT`로 listen 하며, 기본값은 8080입니다.

브라우저에서 `http://localhost:3000` 접속

## UI 진입 경로
- `/` : 랜딩 페이지
- `/demo` : 데모 안내
- `/login` : 로그인
- `/signup` : 회원가입
- `/verify` : 계정 인증
- `/forgot` : 비밀번호 재설정
- `/onboarding` : 온보딩 (로그인 필요)
- `/app` : 대시보드 (로그인 필요)
- `/app/calls` : 통화/세션 목록
- `/app/calls/{sessionId}` : 통화/세션 상세
- `/app/review` : 후속 지원 요청
- `/app/agents` : 에이전트
- `/app/eval` : 평가/관리
- `/app/kb` : 지식 베이스
- `/app/rules` : 규칙
- `/app/settings` : 설정 (탭: `team`, `audit`)
- `/app/team` : 설정 탭(팀/권한)으로 이동
- `/app/audit` : 설정 탭(감사로그)으로 이동
- `/app/billing` : 결제/플랜
- `/call/{token}` : 통화 중 웹 입력 실시간 대화 (예: `/call/demo-token`)

## 실시간 채팅 연결
통화 중 웹 입력은 WebSocket으로 LLM과 실시간 연결됩니다.

환경 변수:
- `NEXT_PUBLIC_CALL_WS_URL`

예시:
```
NEXT_PUBLIC_CALL_WS_URL=ws://localhost:8080
```

## 참고
- 보호된 경로는 로그인 후 접근 가능합니다.

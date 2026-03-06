# 20260305-2026(base-policy-dual-ui)

## 변경 요약
- 구성 탭 삭제, 구성 입력을 기본 탭의 에이전트 하위로 이동
- 기본 탭에 대화 정책 UI를 포함해 기본/대화 정책 탭 모두 동일 항목 입력 가능
- 기본 입력값과 정책값을 상호 동기화하여 두 탭 모두 동일 chat_policy를 편집

## 변경 내용
- src/app/app/conversation/page.tsx
  - 탭 구성: setup 제거
  - 기본 탭에 구성 입력 블록 삽입
  - 기본 탭에 ChatSettingsPanel 추가
  - 기본 입력값 <-> policyValue 동기화 추가

## 추가 수정
- src/app/app/conversation/page.tsx
  - agent_id null 처리 -> undefined로 수정 (타입 에러 해결)

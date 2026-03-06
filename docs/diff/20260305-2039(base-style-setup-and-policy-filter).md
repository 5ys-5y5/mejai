# 20260305-2039(base-style-setup-and-policy-filter)

## 변경 요약
- 기본 탭은 기본 스타일 입력만 유지 (대화 정책 패널 제거)
- 구성 입력은 에이전트 하위에 MultiSelectPopover(검색/일괄 선택) 방식 적용
- 대화 정책 탭은 기본 탭과 중복되는 항목을 숨김

## 변경 내용
- src/components/conversation/ChatSettingsPanel.tsx
  - hiddenLabels prop 추가
  - widget 기본/대화 기본값/allowed 도메인/경로 행 숨김 지원
- src/app/app/conversation/page.tsx
  - 구성 입력: 관리자 KB, MCP provider/tool을 MultiSelectPopover로 변경
  - 기본 탭에서 정책 패널 제거
  - 정책 탭에서 hiddenLabels 적용


## 추가 수정
- 기본 탭에 대화 정책 전체 입력 패널 재추가 (정책 입력 항목 전부 노출)

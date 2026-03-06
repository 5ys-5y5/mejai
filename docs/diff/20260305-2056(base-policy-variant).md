# 20260305-2056(base-policy-variant)

## 변경 요약
- 대화 정책 패널에 base/policy 변형 추가
- 기본 탭은 base 변형으로 모든 정책 항목 노출
- 대화 정책 탭은 전체 항목을 정책 스타일로 노출

## 변경 내용
- src/components/conversation/ChatSettingsPanel.tsx
  - variant prop 추가 (base/policy)
  - base 변형: 중립 스타일/항상 펼침/구분선 최소화
- src/app/app/conversation/page.tsx
  - 기본 탭: ChatSettingsPanel variant="base" 사용
  - 대화 정책 탭: hiddenLabels 제거

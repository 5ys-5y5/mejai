# 20260305-2013(policy-save-merge-base)

## 변경 요약
- 정책 저장 시 기본 탭 입력값(테마/셋업/도메인/경로)을 병합해 저장
- chat-policy API 저장 시 기존 access 값 보존

## 변경 전 문제
- "대화 정책" 저장 시 widget.access(allowed_domains/paths)가 provider에 없으면 누락될 수 있음
- 기본 탭에서 변경한 값이 정책 저장 흐름에 반영되지 않아 두 탭 병행 사용이 어려움

## 변경 내용
- src/app/app/conversation/page.tsx
  - handlePolicySave: draft + setupConfig + domain/path를 provider에 병합해서 저장
- src/app/api/widget-templates/[id]/chat-policy/route.ts
  - widget.access 누락 시 기존 access를 유지하도록 병합

## 변경 후 기대
- 기본/정책 탭 어느 쪽에서 저장해도 필수 항목 누락 없이 기록

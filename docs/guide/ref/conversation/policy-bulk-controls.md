# 대화 정책 일괄 on/off & 가시성 설정

## 목적
- `/app/conversation` 페이지에서 대화 정책 전체 항목을 빠르게 일괄 조정한다.
- 개별 항목 편집 전/후에 전체 on/off 또는 public/user/admin 가시성 일괄 적용을 제공한다.

## UI 위치
- 위젯 관리 (Conversation) > 대화 정책 섹션 상단 카드
- 표시 문구: "대화 정책 일괄 설정"

## 컨트롤
- `전체 ON` / `전체 OFF` 버튼
  - 모든 boolean 기능을 활성화/비활성화하도록 **선택값**을 지정한다.
- `public` / `user` / `admin` 버튼
  - 모든 visibility 값을 선택한 모드로 **선택값**을 지정한다.
- `적용` 버튼
  - 선택한 항목만 일괄 적용한다.
  - 적용 전 확인 모달을 통해 최종 확인한다.
- 상태 요약
  - on/off 비율과 가시성 분포를 표시한다.

## 동작 규칙
- 대상 스코프는 `ConversationPageKey` 기준 `WIDGET_PAGE_KEY`(현재 위젯 정책)이다.
- 일괄 on/off는 `ConversationPageFeatures` 내 **boolean 값만** 일괄 변경한다.
  - 문자열/배열/IdGate(allowlist/denylist)/설정값은 유지한다.
- 일괄 가시성은 `features.visibility` 내 모든 `FeatureVisibilityMode` 값을 선택 모드로 통일한다.
- 적용을 누르면 로컬 상태에 반영되며, 저장 버튼을 눌러야 서버에 반영된다.

## 계약(Contract) 레벨 처리
- 일괄 변경 로직은 공통 정책 모델에 구현한다.
- 사용 함수:
  - `applyConversationFeatureBulkToggle(provider, page, enabled)`
  - `applyConversationFeatureVisibilityMode(provider, page, mode)`
- 적용 위치:
  - `src/lib/conversation/pageFeaturePolicy.ts`
  - `src/app/app/conversation/page.tsx`

## 가시성 모드 의미
- `public`: 비로그인 포함 전체 노출
- `user`: 로그인 사용자 + 관리자
- `admin`: 관리자 전용

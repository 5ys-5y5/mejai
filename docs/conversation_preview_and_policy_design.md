# Conversation Preview + Policy UI Design

작성일: 2026-03-04

## 배경
`/app/conversation`의 미리보기 탭에서 위젯이 초기화 실패하고 클릭이 작동하지 않는 문제가 있었다. MCP 기준으로 `/api/widget/init` 요청이 `DOMAIN_NOT_ALLOWED`(403)로 실패하며, iframe 내부가 초기화 실패 상태가 되었다.

또한 미리보기는 다음을 동시에 보여야 한다.
- 런처 위치
- 런처 클릭 시 팝업되는 위젯 UI 3종 (대화, 리스트, 정책)을 동시에 노출

정책 관리(“대화 정책” 탭)는 위젯 UI 관리에 필요한 항목을 명확히 정리하고, 입력 UI 방식을 일관되게 제공해야 한다.

참고: `https://github.com/5ys-5y5/mejai/tree/advanced`의 `51069d9bf66bb36d8dc430d70f332354b9877b8c` 커밋을 기준으로 동작/레이아웃을 동일하게 재현해야 한다. 본 문서는 해당 커밋 UI와 동일한 의도·구조를 목표로 한다.

## 목표
- 미리보기 탭에서 클릭이 정상 작동하고 위젯 초기화가 성공해야 한다.
- 미리보기 탭에 런처 위치 영역과 3개의 위젯 UI가 동시에 표시되어야 한다.
- “대화 정책” 탭에서 위젯 UI 관리에 필요한 항목과 입력 방식이 명확히 정의되어야 한다.
- 위젯 `chat_policy`는 위젯 행 기준이므로 페이지 키를 저장하지 않고 단일 구조로 저장한다.

## 비목표
- 위젯 런타임 전체 UI 리디자인
- 정책 엔진의 기능 추가

## 현상 요약
- 미리보기 iframe에서 `/api/widget/init` 호출 시 `origin`이 비어 `DOMAIN_NOT_ALLOWED`가 발생한다.
- iframe 내부 UI가 `초기화 실패` 상태가 되며 입력/클릭이 사실상 작동하지 않는다.

## 원인
- 미리보기 iframe이 로드된 직후 `callInit`이 실행되는데, `postMessage`로 받은 preview meta가 아직 반영되지 않았다.
- 결과적으로 `origin`/`page_url`/`referrer`가 빈 값 또는 localhost로 들어가 허용 도메인 정책에 의해 차단된다.

## 해결 방향
### 1) 미리보기 meta 전달
- iframe URL에 `origin`, `page_url`, `referrer`를 쿼리로 전달한다.
- embed 페이지는 쿼리에서 meta를 읽어 `pendingMeta`를 초기값으로 사용한다.
- `callInit`은 `origin`이 없을 경우 `page_url`/`referrer`에서 origin을 유추한다.

### 2) 미리보기 UI 2단 구성
미리보기 탭을 2개의 섹션으로 분리한다.

A. 런처 위치 프리뷰
- 실제 런처가 위치하는 모듈
- 런처 클릭 시 별도의 “위젯 UI 3분할” 섹션에 반응(시각적 강조/연결 표시)

B. 위젯 UI 3분할 프리뷰
- 대화(Conversation)
- 리스트(List)
- 정책(Policy)

각 섹션은 동시에 노출되어야 하며, 런처와 동일한 `public_key`/`previewMeta`로 초기화된다.

## 미리보기 UI 상세 설계
### 레이아웃
- 상단: 런처 위치 프리뷰(좌측 또는 우측 하단 고정 레이어)
- 하단: 3분할 위젯 UI 패널

레이아웃 예시 구조
- PreviewContainer
- LauncherPreviewArea
- WidgetsPreviewArea

WidgetsPreviewArea
- WidgetPanel(Chat)
- WidgetPanel(List)
- WidgetPanel(Policy)

### 런처 프리뷰
- 기존 `WidgetLauncherRuntime`를 유지하되, 클릭 이벤트는 UI 내부 open 상태와 분리한다.
- 런처 클릭은 3분할 패널을 활성화하도록 연결.

### 3분할 위젯 프리뷰
- 3개의 독립 iframe 또는 단일 iframe 3뷰 모드 지원 중 하나를 선택한다.
- 구현 선호: 단일 embed 페이지에 `tab=chat|list|policy`를 강제할 수 있도록 지원하고, 3개의 iframe을 병렬로 사용한다.

장점
- 기존 embed 렌더러 재사용
- 탭별 UI가 독립적으로 로드됨

요구 사항
- 각 iframe은 동일한 `public_key`, `previewMeta`, `visitor_id=preview`를 사용
- `api/widget/init`가 성공해야 함
- 탭 강제 파라미터가 없으면 기존 동작 유지

### 클릭 불가 이슈 방지 체크리스트
- LauncherPreviewArea의 overlay가 pointer-events를 막지 않는지 확인
- 3분할 iframe 영역이 상위 컨테이너 z-index에 가려지지 않는지 확인
- 미리보기 영역 내부에 절대 위치 레이어가 상위 영역을 덮지 않는지 확인

## 정책(대화 정책) UI 정리
### 저장 구조 (위젯 전용)
- 위젯 행(`B_chat_widgets`) 자체가 타겟이므로 페이지 키를 저장하지 않는다.
- 저장 구조는 다음과 같다.

예시
```
{
  "page": { ... ConversationPageFeaturesOverride ... },
  "settings_ui": {
    "setup_fields": { ... setup UI label/order ... }
  }
}
```

### 필요 항목 카테고리
1. Admin Panel
- 활성화, 로그 OFF, 대화 복사
- 입력: 토글(ON/OFF), 가시성(USER/ADMIN)

2. Interaction
- Quick Replies, Product Cards, Prefill, Input Placeholder
- 3-Phase Prompt 및 세부 Show/Hide
- 입력: 토글, 텍스트, 다중 텍스트

3. Setup
- 모델/LLM/KB/Route/Inline KB 등 위젯 설정 UI 제어
- 기본 모드/기본 LLM
- 입력: 토글, 셀렉트(기본 모드, 기본 LLM)

4. Allow/Deny
- MCP Providers/Tools, LLM IDs, KB IDs, Admin KB IDs, Runtime Routes
- 입력: 텍스트 영역(줄바꿈 리스트)
- allowlist가 비어있으면 전체 허용이 기본 정책

### 입력 UI 방식
- 모든 토글은 `ON/OFF`와 `USER/ADMIN` 2축을 명확히 분리
- 텍스트 입력 항목은 빈 값 허용
- 필수 확인 항목은 강조 표시

## 구현 계획
1. 미리보기 iframe에 preview meta 전달
- `WidgetLauncherRuntime`에서 iframe URL 쿼리로 전달
- embed에서 쿼리 기반 `pendingMeta` 초기화

2. 미리보기 UI 2단 구성
- `/app/conversation` 미리보기 탭 UI 확장
- 런처 위치 영역 + 3분할 위젯 UI 영역 추가

3. embed 탭 강제 파라미터 도입
- `tab=chat|list|policy`를 쿼리로 받을 수 있도록 embed 수정
- 해당 탭만 활성화하도록 내부 상태 지정

4. 정책 탭 UI 정리
- 기존 항목을 위젯 UI 기준으로 재구성
- 설정 의미/입력 타입을 통합 문서화

## 검증
- `/app/conversation` 미리보기 탭에서 `api/widget/init` 200 응답 확인
- 런처 클릭 시 위젯 UI 3분할 패널이 즉시 반응
- 대화/리스트/정책 3개 패널이 동시에 표시
- 정책 저장 시 DB `chat_policy` 구조가 위젯 전용 구조로 유지

## 변경 대상 파일
- `src/app/app/conversation/page.tsx`
- `src/components/design-system/widget/WidgetUI.parts.tsx`
- `src/app/embed/[key]/page.tsx`
- `src/components/settings/ChatSettingsPanel.tsx`
- `docs/chat_policy.json` (스키마 참고용)

## 리스크
- embed의 탭 강제 모드 추가 시 기존 위젯 동작에 영향 가능
- 미리보기 UI가 런처 위치와 충돌할 경우 클릭 레이어 문제 재발 가능

## 결정 사항
- debug_copy는 항상 기본값을 사용하므로 위젯 `chat_policy`에 저장하지 않는다.
- `page_registry`는 저장하지 않는다.
- 위젯 전용 저장 형태는 페이지 키 없이 저장한다.

# 관리자 설정 재설계 (위젯 기준, 전역 + 오버라이드)

## 목표
- `/app/admin`에서 **모든 위젯 UI 동작**을 관리한다. (on/off + user/admin 가시화)
- 페이지별 하드코딩을 **금지**하고, 모든 페이지가 **동일한 정책**을 참조한다.
- 위젯 상단 닫기 버튼 같은 항목도 **관리자 설정에서 on/off**로 결정한다.

## 핵심 원칙
- **위젯 기준**: 대화 UI의 단일 기준은 위젯 레이아웃이다.
- **정책 중앙화**: 설정은 한 곳에서 관리하고 전체 페이지에 동일 적용한다.
- **2축 제어**: 모든 항목은 `Enabled (On/Off)` + `Visibility (User/Admin)`를 가진다.
- **상하관계 적용**: 상위가 Off면 하위는 숨김/비활성 처리된다.
- **전역 기본값 + 페이지 오버라이드**:
  - 기본값은 모든 페이지에 적용
  - 페이지 단위로 필요한 항목만 덮어쓰기
  - 페이지 코드 내 예외 처리 금지

## 적용 대상 페이지
- `/`
- `/app/laboratory`
- `/app/admin`
- `/embed`
- `/call`
- `/demo`
- 신규 페이지도 동일 정책 시스템을 사용해야 함

## 관리자 UI 구조

### 1) 전역 기본값 (Global Defaults)
모든 페이지에 공통 적용되는 기본 설정.

### 2) 페이지 오버라이드 (Page Overrides)
페이지별로 **변경이 필요한 항목만** 덮어쓰기.
대상 예시:
- `/`
- `/app/laboratory`
- `/embed`
- `/demo`
- `/call`

## 기능 그룹 (위젯 기준)

### A. 위젯 설정 (상위 단위)
위젯 레이아웃의 핵심 구성 요소를 **단위별 토글**로 관리.
- WidgetHeaderLego (상위)
  - Logo
  - 상담원 연결
  - 새 대화
  - 닫기(X) 버튼
- ConversationModelChatColumnLego (상위)
  - 확장 시: 대화 관련 설정 묶음(아래 B, D로 연결)
- ConversationModelSetupColumnLego (상위)
  - 확장 시: 설정 관련 항목 묶음(아래 C로 연결)
- WidgetHistoryPanelLego (상위)
  - 확장 시: 히스토리/세션 표시 상세 항목
- WidgetTabBarLego (상위)
  - Tab: 대화
  - Tab: 리스트
  - Tab: 정책

### B. 대화 설정(ConversationModelChatColumnLego 확장)
LLM 설정(대화 영역)
- 대화 UI와 직접 연관된 항목만 이 영역에서 관리한다.
- 항목 정의: `path`, `vpath`(기본 `visibility.${path}`), `kind`, `scope(page|global)`, `dependsOn`.
- 업데이트 함수: `updateField(path, scope, value)`, `updateVisibility(path, scope, mode)`.
- 상위 Off 시 하위 항목 숨김/비활성 처리.
- Debug는 별도 섹션 + 가시화 조건 포함.
- 대상 파일: `ChatSettingsPanel.tsx`, `ChatSettingsPanelChat.tsx`, `ChatSettingsPanelEnv.tsx`, `ChatSettingsPanelMapping.tsx`
- 상호 import 금지. 각 파일이 자체 정의/헬퍼로 구동 (공통화 필요 시 `ChatSettingsPanelCore.tsx`로 이동).

하위 항목(예시)
- AdminPanel: enabled, selectionToggle, logsToggle, messageMeta, copyConversation
- Debug Transcript(=copyConversation 하위): outputMode, sections.header/turn/logs, logs.mcp/event/debug, debugTree(response_schema_detail/render_plan_detail/prefix_json)
- Interaction: quickReplies, productCards, threePhasePrompt(+showConfirmed/showConfirming/showNext/hideLabels, labels), prefill(+prefillMessages), inputSubmit, inputPlaceholder
### C. 설정(ConversationModelSetupColumnLego 확장)
좌측 설정 영역 및 정책 탭.
- Model Selector (상위)
- Mode Existing
- Mode New
- Agent Selector
- Session ID Search
- LLM Selector + Default LLM
- KB Selector + KB ID Gate
- Admin KB Selector + Admin KB ID Gate
- Route Selector + Routes Gate
- Inline User KB Input

### D. MCP
- Provider Selector
- Action Selector
- Providers Gate (Allow/Deny)
- Tools Gate (Allow/Deny)

### E. 런타임/자동 업데이트 (필요 시)
- Enabled
- Visibility (User/Admin)

## 상하관계 규칙
- Model Selector = Off → Mode Existing/New 및 관련 항목 숨김
- MCP Provider/Action Selector = Off → MCP Gates 숨김
- Admin Panel Enabled = Off → 하위 항목 숨김
- Widget Header = Off → Header 하위 항목 숨김
- Widget TabBar = Off → Tab 하위 항목 숨김
- Copy Conversation = Off → Debug Transcript 하위 항목 숨김

## 정책 적용 요구
- 모든 항목은 `/app/admin`에서 **on/off + user/admin 가시 조건**을 설정 가능해야 한다.
- Prefill 같은 출력 조건도 관리 페이지에서 설정 가능해야 한다.
- 위젯/비위젯 페이지 모두 동일 정책을 사용하며, 페이지별 하드코딩은 금지한다.

## 관리자 화면 표시 규칙
- 각 그룹 카드 상단에:
  - `Group Enabled`
  - `Group Visibility (User/Admin)`
- 각 항목은:
  - `Enabled`
  - `Visibility`
- Page Overrides 영역은:
  - Global Defaults 대비 변경된 항목만 표시
  - 변경된 항목에는 차이 표시

## 런타임 적용 규칙
- 모든 페이지는 동일한 정책을 참조한다.
- 페이지 이름 기준의 하드코딩 로직을 사용하지 않는다.
- 위젯 헤더 기능 (닫기/새 대화/에이전트 액션)은 정책에 의해 on/off 결정된다.
- user/admin 가시화는 위젯/비위젯 환경 모두 동일하게 적용된다.

## 비목표
- 페이지별 예외 하드코딩
- 위젯과 비위젯 UI가 서로 다른 기준을 가지는 설계

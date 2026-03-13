# `/app/create` 기반 템플릿 정책/프리뷰 이관 및 `/app/conversation` 삭제 설계서

작성일: 2026-03-13  
대상 워크스페이스: `http://localhost:3000/app/create`  
삭제 대상 경로: `http://localhost:3000/app/conversation`

## 1. 문서 목적

이 문서는 `http://localhost:3000/app/conversation` 페이지가 최종적으로 삭제되는 것을 전제로, 해당 페이지가 현재 담당하는 `대화 정책`과 `프리뷰` 기능을 `http://localhost:3000/app/create` 워크스페이스로 안전하게 이관하기 위한 실행 설계 문서다.

최종 목표는 아래와 같다.

1. `conversation` 페이지의 `대화 정책` 편집 기능을 `create?tab=template`에서 완전하게 제공한다.
2. `conversation` 페이지의 `프리뷰` 기능은 특정 탭 전용이 아니라 `create` 워크스페이스의 전역 기능으로 승격한다.
3. 프리뷰는 `템플릿`, `대화창`, `비서`, `지식`, `api`, `도구` 탭과 무관하게 항상 같은 위치에 노출된다.
4. `create` 워크스페이스만으로 모든 기능이 독립적으로 동작하는 것이 검증된 뒤에만 `/app/conversation` 경로를 삭제한다.

이 문서는 구현까지 가능한 수준으로 다음을 고정한다.

1. 현재 코드 기준의 실제 차이
2. 공통 계약 기준의 수정 방향
3. 전역 프리뷰의 실제 배치 위치
4. 삭제 전환 순서
5. 수정 허용 화이트리스트
6. MCP 테스트 기준과 기록

## 2. 현재 요청에 대한 이해

후속 구현 전에 아래 이해 항목을 사용자에게 그대로 제시하고, 명시적으로 확정받은 뒤에만 수정에 착수한다.

1. 최종 상태에서는 `/app/conversation` 페이지를 삭제한다.
2. `conversation` 페이지가 담당하던 `대화 정책`은 `create?tab=template`로 이관한다.
3. `conversation` 페이지가 담당하던 `프리뷰`는 `template` 탭 내부가 아니라 `create` 워크스페이스 전역 UI로 이관한다.
4. 프리뷰는 모든 탭에서 보여야 하며, 현재 DOM 기준 `/html/body/main/div/div/main/div/div/div[2]`가 가리키는 탭 내비게이션 블록 위에 배치해야 한다.
5. 구현은 `chat_policy` 공통 계약을 재사용하는 방식으로 진행해야 하며, `conversation` 전용 UI를 복제해서 붙이는 방식으로 진행하면 안 된다.
6. `settings_ui` 저장 누락 문제와 Runtime 글로벌 스코프 문제는 `template` 탭만의 예외가 아니라 공통 계약 레벨에서 함께 수정해야 한다.
7. `/app/conversation` 삭제는 맨 마지막 단계이며, 그 전에는 `create` 워크스페이스만으로 기능이 독립 동작함을 확인해야 한다.
8. 화이트리스트 외 파일 수정이 필요하면 즉시 중단하고 사용자 승인을 다시 받아야 한다.

사용자 확정 예시:

```text
위 8개 이해 항목이 맞습니다. 이 범위로 진행하세요.
```

확정 전에는 코드 수정에 착수하지 않는다.

## 3. 수정 전 이해확정 절차

실행 절차는 아래를 반드시 따른다.

1. 현재 이해 내용을 목록으로 제시한다.
2. 사용자가 각 항목을 확인한다.
3. 사용자가 “이 범위로 진행”을 명시한다.
4. 그 뒤에만 백업과 수정에 들어간다.

이 절차를 생략하면 안 되는 이유는 이번 작업이 단순 UI 추가가 아니라 아래 세 축을 동시에 건드리기 때문이다.

- `create` 워크스페이스 구조
- 템플릿 정책 공통 계약
- `/app/conversation` 제거 순서

## 4. 현재 상태 확인 결과

### 4.1 `conversation` 페이지가 현재 담당하는 기능

현재 `src/app/app/conversation/page.tsx`는 아래를 실제로 수행한다.

1. 템플릿 목록 로딩: `/api/widget-templates`
2. 템플릿 정책 로딩/저장: `/api/widget-templates/[id]/chat-policy`
3. 템플릿 메타 저장: `/api/widget-templates/[id]`
4. `ChatSettingsPanel` 기반 전체 대화 정책 편집
5. 정책 일괄 on/off
6. 정책 일괄 visibility
7. 설치 코드 생성
8. preview meta 입력
9. 런처 위치 프리뷰
10. chat/list/policy/login 프리뷰

즉, 현재 `conversation` 페이지는 “템플릿 메타 + 대화 정책 + 프리뷰”를 동시에 담당하는 운영 화면이다.

### 4.2 현재 `template` 탭이 담당하는 기능

현재 `src/components/create/CreateWidgetTab.tsx`는 아래만 다룬다.

1. 템플릿 이름
2. 연결 비서
3. `theme.greeting`
4. `theme.input_placeholder`
5. `theme.launcher_icon_url`
6. 활성 여부
7. 템플릿 키/인스턴스 키 표시
8. 인스턴스 설치 코드
9. 인스턴스 키 회전

즉, 현재 `template` 탭은 `conversation` 페이지의 대체물이 아니며, 템플릿 전체 정책 편집기와도 거리가 있다.

### 4.3 현재 `create` 페이지 DOM 구조

현재 `src/components/create/CreateWorkspacePage.tsx`의 실제 DOM 구조를 `chrome-devtools`로 확인한 결과, 아래 XPath:

```text
/html/body/main/div/div/main/div/div/div[2]
```

는 현재 탭 내비게이션 블록:

```html
<div class="border-b border-slate-200 pb-2">...</div>
```

를 가리킨다.

따라서 사용자 요구사항을 만족하려면, 전역 프리뷰 블록은 현재 탭 내비게이션 블록 바로 앞 형제 노드로 삽입되어야 한다.

즉, `CreateWorkspacePage` 내부 배치 순서는 아래가 되어야 한다.

1. 페이지 헤더
2. 권한/프로필 오류 배너
3. 전역 프리뷰 블록
4. 탭 내비게이션
5. 탭별 본문

### 4.4 `/app/conversation` 삭제와 직접 연결된 코드 참조

현재 코드 기준으로 `/app/conversation`을 직접 참조하는 실제 코드 파일은 아래를 확인했다.

1. `src/app/app/settings/page.tsx`
   - `rawTab === "chat"`일 때 `/app/conversation`으로 리다이렉트
2. `src/components/settings/WidgetInstallPanel.tsx`
   - 안내 문구에 `/app/conversation`을 직접 명시
3. `src/app/app/conversation/page.tsx`
   - 실제 삭제 대상 라우트

따라서 `/app/conversation` 삭제는 단순 파일 삭제가 아니라, 소비처 정리까지 포함한 단계적 전환이어야 한다.

## 5. 현재 구조의 핵심 문제

### 문제 1. `template` 탭이 `conversation`의 계약을 쓰지 않는다

- `conversation` 페이지는 `/api/widget-templates`와 `chat_policy` 계약을 사용한다.
- `template` 탭은 `/api/widgets`를 사용한다.

즉, 동일한 템플릿 관리 기능이 서로 다른 API/상태 모델 위에 나뉘어 있다.

### 문제 2. 프리뷰가 페이지 종속적이다

현재 프리뷰는 `conversation` 페이지 detail 영역 안에 묶여 있다.

사용자 요구는 정반대다.

- 프리뷰는 특정 페이지에 종속되면 안 된다.
- `create` 워크스페이스의 전역 기능이어야 한다.
- 탭과 무관하게 항상 보여야 한다.

### 문제 3. 템플릿 정책과 인스턴스 설치가 섞여 있다

현재 `template` 탭은 인스턴스 키와 설치 코드를 주 기능처럼 다룬다.

하지만 이번 이관의 핵심은 아래다.

- 템플릿 정책 편집은 `template` 탭 책임
- 프리뷰는 워크스페이스 전역 책임
- 인스턴스 설치 중심 흐름은 `chat` 탭 또는 인스턴스 전용 흐름 책임

### 문제 4. `settings_ui` 저장이 현재도 누락될 수 있다

`ChatSettingsPanel`은 `setupUi` 상태를 별도로 관리하지만, provider payload로 다시 직렬화하지 않는다.

또한 저장 직전과 API 저장 단계에서 `settings_ui`를 제거하고 있다.

이 상태로는 아래 설정이 저장되지 않을 가능성이 높다.

1. setup field order
2. setup field label
3. existing field order
4. feature label

이 문제는 `template` 탭 이관과 동시에 공통 계약 수준에서 수정해야 한다.

### 문제 5. Runtime 설정은 템플릿 로컬 설정이 아니다

`runtime.selfUpdate.enabled`는 `/api/runtime/governance/config`를 통해 저장된다.

즉, 이 값은 개별 템플릿 `chat_policy`가 아니라 조직 공통 설정이다.

따라서 이관 시에도 아래 원칙을 유지해야 한다.

1. UI에서는 보여줄 수 있다.
2. 그러나 템플릿 저장과 같은 저장 버튼/트랜잭션에 묶으면 안 된다.

## 6. 최종 UX 목표

### 6.1 `template` 탭의 책임

`template` 탭은 아래를 담당한다.

1. 템플릿 선택/생성/삭제
2. 템플릿 메타 수정
3. `대화 정책` 전체 편집
4. 정책 일괄 적용
5. 템플릿 저장

즉, `conversation` 페이지의 “대화 정책” 기능은 최종적으로 `template` 탭 안으로 완전히 들어와야 한다.

### 6.2 전역 프리뷰의 책임

전역 프리뷰 블록은 아래를 담당한다.

1. 현재 선택된 템플릿 기준 프리뷰 대상 표시
2. Overrides JSON
3. preview meta 입력
4. 설치 코드
5. preview URL
6. 런처 위치 프리뷰
7. chat/list/policy/login 프리뷰

중요:

- 이 프리뷰 블록은 `template` 탭 전용이 아니다.
- 모든 탭에서 항상 보여야 한다.
- 탭을 이동해도 상태가 유지되어야 한다.

### 6.3 탭과 무관한 프리뷰 상태

전역 프리뷰가 의미 있게 작동하려면 `create` 워크스페이스 상위 레벨에서 아래 상태를 유지해야 한다.

1. 선택된 템플릿 ID
2. 현재 템플릿 메타/정책
3. preview meta
4. install overrides
5. preview refresh nonce

즉, 이 상태는 `CreateWidgetTab` 내부 local state에 있으면 안 되고, `CreateWorkspacePage` 또는 상위 공통 controller에 있어야 한다.

### 6.4 비템플릿 탭에서의 동작

`agents`, `kb`, `api`, `mcp`, `chat` 탭에서는 프리뷰가 아래처럼 동작해야 한다.

1. 현재 선택된 템플릿이 있으면 같은 프리뷰를 유지한다.
2. 선택된 템플릿이 없으면 “프리뷰 대상 템플릿을 선택하세요” empty state를 보여준다.
3. 필요 시 전역 프리뷰 헤더에 템플릿 quick selector를 둔다.

즉, 비템플릿 탭에서도 프리뷰는 숨기지 않는다.

## 7. 구현 원칙

후속 구현은 아래 원칙을 100% 지켜야 한다.

1. `conversation` 기능 이관은 공통 계약 수정으로 해결한다.
2. `ChatSettingsPanel`을 복제하지 않는다.
3. `template` 탭에 필드를 하나씩 덧붙이는 핫픽스를 금지한다.
4. 전역 프리뷰는 `CreateWorkspacePage` 상위 레벨에 배치한다.
5. `template` 탭은 정책 편집만 책임지고, 전역 프리뷰는 탭 공통 영역이 책임진다.
6. `/api/widgets`를 템플릿 정책 편집 기준 API로 확장하지 않는다.
7. `settings_ui`는 템플릿 정책의 canonical field로 저장한다.
8. `/app/conversation` 삭제는 가장 마지막 단계에서만 수행한다.

## 8. 타겟 구조

### 8.1 `CreateWorkspacePage`가 전역 프리뷰를 소유한다

수정 대상:

- `src/components/create/CreateWorkspacePage.tsx`

이 컴포넌트는 아래 역할을 새로 가진다.

1. `activeTab` 관리
2. `templateId` 전역 선택 관리
3. 전역 preview/install state 관리
4. 전역 프리뷰 블록 렌더링
5. 탭별 컴포넌트에 공통 template context 전달

권장 query string:

```text
/app/create?tab=agents&templateId=<uuid>
```

이렇게 해야 아래가 가능하다.

1. 탭 이동 후에도 프리뷰 대상 유지
2. 새로고침 후에도 같은 템플릿 유지
3. 비템플릿 탭에서도 프리뷰 독립 동작

### 8.2 전역 프리뷰 컴포넌트를 신설한다

신규 파일 제안:

- `src/components/create/CreateWorkspacePreviewRail.tsx`

이 컴포넌트는 `CreateWorkspacePage`에서 렌더링하며, 현재 탭과 무관하게 항상 보인다.

배치 위치는 아래로 고정한다.

1. 현재 `CreateWorkspacePage`의 프로필 오류 배너 아래
2. 현재 탭 내비게이션 `<div class="border-b border-slate-200 pb-2">` 바로 위

즉, 사용자 요구사항인 “`/html/body/main/div/div/main/div/div/div[2]` 항목 위”는 현재 DOM 기준으로 정확히 위 위치를 의미한다.

### 8.3 템플릿 공통 controller를 신설한다

신규 파일 제안:

- `src/lib/conversation/client/useWidgetTemplateSettingsController.ts`

이 controller는 아래 상태를 담당한다.

1. 템플릿 목록
2. 선택된 템플릿 ID
3. 템플릿 draft
4. `policyValue`
5. policy/template fingerprint
6. dirty state
7. bulk state
8. preview meta
9. install overrides
10. governance config
11. dependency 옵션 목록

이 controller는 `CreateWorkspacePreviewRail`과 `CreateWidgetTab`이 함께 사용한다.

### 8.4 템플릿 정책 편집 UI를 공통 컴포넌트로 만든다

신규 파일 제안:

- `src/components/widget-template/WidgetTemplateSettingsEditor.tsx`

이 컴포넌트는 아래를 렌더링한다.

1. 정책 일괄 제어
2. `ChatSettingsPanel`
3. 저장 footer

주의:

- 설치 코드와 프리뷰는 여기 넣지 않는다.
- 설치/프리뷰는 전역 프리뷰 레일 책임이다.

### 8.5 `CreateWidgetTab`은 정책 편집 탭으로 재정의한다

수정 대상:

- `src/components/create/CreateWidgetTab.tsx`

변경 방향:

1. `/api/widgets` 사용 중단
2. 로컬 단순 폼 상태 제거
3. 템플릿 목록/선택/생성/삭제 + 정책 편집 탭으로 전환
4. `WidgetTemplateSettingsEditor` 사용

즉, 최종적으로 `CreateWidgetTab`은 “대화 정책 편집 탭”이 된다.

### 8.6 `ChatSettingsPanel` 공통 계약을 수정한다

수정 대상:

- `src/components/conversation/ChatSettingsPanel.tsx`

필수 수정:

1. `draft.setupUi`를 `settings_ui`로 직렬화해서 `onChange` payload에 포함
2. `settings_ui` 제거 로직 제거
3. Runtime 섹션을 외부 adapter 사용 가능 구조로 변경
4. 기존 `conversation` 페이지가 당장 깨지지 않도록 하위 호환 유지

### 8.7 `conversation` 페이지는 임시 브리지 후 최종 삭제한다

`src/app/app/conversation/page.tsx`는 아래 두 단계 중 하나로 다룬다.

1. 이관 구현 중에는 공통 controller/editor를 먼저 재사용하는 임시 브리지로 축소
2. 독립 동작 검증이 끝나면 최종 삭제

중요:

- 최종 상태에서는 이 파일이 남아 있으면 안 된다.
- 삭제 전에 `create` 워크스페이스만으로 동일 기능이 동작해야 한다.

## 9. 저장 계약 설계

### 9.1 템플릿 조회/선택

공통 controller는 아래를 사용한다.

1. `GET /api/widget-templates`
2. `GET /api/widget-templates/[id]/chat-policy`

### 9.2 템플릿 생성

생성은 아래 계약으로 통일한다.

1. `POST /api/widget-templates`
2. 응답 템플릿 ID를 전역 `templateId`로 선택
3. 즉시 `GET /api/widget-templates/[id]/chat-policy`

금지:

- 새 템플릿 생성을 `/api/widgets`로 우회하는 것

### 9.3 템플릿 저장

저장 순서는 아래로 고정한다.

1. 템플릿 메타 변경 시 `PATCH /api/widget-templates/[id]`
2. 정책 변경 시 `POST /api/widget-templates/[id]/chat-policy`
3. 저장 후 정책 재조회

템플릿 메타 저장 대상:

- `name`
- `is_active`

정책 저장 canonical shape:

- `widget`
- `features`
- `settings_ui`

정책 저장 시 제거해야 하는 파생 값:

- `pages`
- `page_registry`
- `debug_copy`
- legacy `setup_ui`

정책 저장 시 제거하면 안 되는 값:

- `settings_ui`

### 9.4 Runtime 저장

Runtime는 아래 규칙으로 저장한다.

1. `/api/runtime/governance/config`로 별도 저장
2. 템플릿 저장 버튼과 분리
3. UI에서는 “조직 공통 설정”임을 명시

### 9.5 프리뷰와 저장의 관계

프리뷰는 저장과 분리한다.

1. 저장하지 않아도 draft policy로 프리뷰 가능
2. 탭 이동 시에도 프리뷰 상태 유지
3. 저장 여부와 무관하게 프리뷰 레일은 항상 표시

## 10. `/app/conversation` 삭제 전환 순서

이 순서는 반드시 지킨다.

### 10.1 1단계: 기능 이관

먼저 아래를 구현한다.

1. `template` 탭에서 `대화 정책` 전체 편집 가능
2. `create` 워크스페이스 전역 프리뷰 레일 구현
3. 모든 탭에서 프리뷰 레일 노출
4. `create` 워크스페이스만으로 템플릿 선택, 정책 편집, 프리뷰 가능

이 단계에서는 `/app/conversation` 파일을 아직 삭제하지 않는다.

### 10.2 2단계: 독립 동작 검증

다음 조건을 모두 만족해야 한다.

1. `/app/create?tab=template`에서 `conversation` 수준의 정책 편집 가능
2. `/app/create?tab=agents|kb|api|mcp|chat`에서도 프리뷰 레일이 보임
3. `templateId` 유지 상태로 탭 이동해도 프리뷰가 깨지지 않음
4. `/app/conversation`에 들어가지 않고도 운영자가 필요한 작업을 수행 가능
5. 관련 저장/조회 API가 `create` 기준으로 모두 작동

### 10.3 3단계: 참조 정리

독립 동작이 확인되면 아래를 정리한다.

1. `src/app/app/settings/page.tsx`
   - 기존 `/app/conversation` redirect 제거
   - 새 목적지로 `/app/create?tab=template` 또는 확정된 대체 경로 사용
2. `src/components/settings/WidgetInstallPanel.tsx`
   - `/app/conversation` 안내 문구를 `/app/create?tab=template` 기준으로 수정
3. 그 외 남은 `/app/conversation` 직접 참조 정리

### 10.4 4단계: 최종 삭제

마지막 단계에서만 아래를 수행한다.

1. `src/app/app/conversation/page.tsx` 삭제
2. 삭제 후 build/test 재실행
3. 삭제 후에도 `create` 워크스페이스만으로 동일 기능 수행 가능함 확인

## 11. 수정 허용 화이트리스트

후속 구현 시 수정 가능한 파일은 아래로 제한한다.

1. `C:\dev\1227\mejai3\mejai\docs\temSettings.md`
   - 본 설계 문서 유지/보완
2. `C:\dev\1227\mejai3\mejai\src\components\create\CreateWorkspacePage.tsx`
   - 전역 template context, preview rail 배치, query sync
3. `C:\dev\1227\mejai3\mejai\src\components\create\CreateWidgetTab.tsx`
   - 템플릿 정책 편집 탭으로 전환
4. `C:\dev\1227\mejai3\mejai\src\components\create\CreateWorkspacePreviewRail.tsx`
   - 신규 전역 프리뷰 레일
5. `C:\dev\1227\mejai3\mejai\src\components\widget-template\WidgetTemplateSettingsEditor.tsx`
   - 신규 공통 템플릿 정책 편집기
6. `C:\dev\1227\mejai3\mejai\src\components\conversation\ChatSettingsPanel.tsx`
   - `settings_ui` 저장 계약, governance adapter, 공통 prop 보강
7. `C:\dev\1227\mejai3\mejai\src\lib\conversation\client\useWidgetTemplateSettingsController.ts`
   - 신규 공통 controller
8. `C:\dev\1227\mejai3\mejai\src\lib\conversation\pageFeaturePolicy.ts`
   - 필요 시 직렬화/타입 보강
9. `C:\dev\1227\mejai3\mejai\src\lib\widgetPolicyUtils.ts`
   - 템플릿 메타/정책 helper 보강
10. `C:\dev\1227\mejai3\mejai\src\app\api\widget-templates\route.ts`
   - 생성 시 canonical policy 보존
11. `C:\dev\1227\mejai3\mejai\src\app\api\widget-templates\[id]\route.ts`
   - PATCH 시 `settings_ui` 보존
12. `C:\dev\1227\mejai3\mejai\src\app\api\widget-templates\[id]\chat-policy\route.ts`
   - 정책 저장 시 `settings_ui` 보존
13. `C:\dev\1227\mejai3\mejai\src\app\app\conversation\page.tsx`
   - 임시 브리지 정리 또는 최종 삭제
14. `C:\dev\1227\mejai3\mejai\src\app\app\settings\page.tsx`
   - `/app/conversation` redirect 제거/대체
15. `C:\dev\1227\mejai3\mejai\src\components\settings\WidgetInstallPanel.tsx`
   - `/app/conversation` 안내 문구와 override 설명 갱신

## 12. 수정 비허용 항목

아래는 이번 작업에서 금지한다.

1. `ChatSettingsPanel` 복제본 생성
2. `template` 탭 local state에 정책 필드를 계속 늘리는 방식의 핫픽스
3. `/api/widgets`를 템플릿 정책 편집의 기준 API로 만드는 것
4. 프리뷰를 다시 `template` 탭 안에 묶는 것
5. `settings_ui`를 저장하지 못하니 별도 임시 필드에 우회 저장하는 것
6. `/app/conversation` 삭제 전에 참조 정리를 생략하는 것
7. 독립 동작 검증 없이 `/app/conversation`을 먼저 삭제하는 것

## 13. 변경 기록 및 롤백 보장

후속 코드 수정 시 반드시 아래 절차를 따른다.

1. 수정 직전 원본을 `C:\dev\1227\mejai3\mejai\docs\diff`에 백업한다.
2. 파일명 규칙은 아래를 사용한다.

```text
C:\dev\1227\mejai3\mejai\docs\diff\YYYYMMDD-HHMMSS__상대경로를_언더스코어로변환.before
```

예시:

```text
C:\dev\1227\mejai3\mejai\docs\diff\20260313-171438__docs_temSettings.md.before
```

3. 신규 파일은 최초 생성 이후 재수정 시 동일 규칙으로 백업한다.
4. 언제든 수정 직전 상태로 롤백 가능한 형태여야 한다.
5. 백업 누락은 허용하지 않는다.

이번 실행에서는 설계 문서 수정 전 아래 백업을 생성했다.

```text
C:\dev\1227\mejai3\mejai\docs\diff\20260313-171438__docs_temSettings.md.before
```

## 14. 실행 정책

### 14.1 범위 외 수정 금지

- 화이트리스트 밖 파일 수정 금지
- 목적 외 UI 리디자인 금지
- `conversation` 삭제와 직접 무관한 경로 정리 금지

### 14.2 빌드 의무

후속 구현 시 아래를 반드시 수행한다.

1. 공통 계약 수정 후 `npm run build`
2. `CreateWorkspacePage` 전역 프리뷰 배치 후 `npm run build`
3. `template` 탭 이관 후 `npm run build`
4. `/app/conversation` 삭제 직후 `npm run build`

### 14.3 DB 변경 정책

현재 설계 기준으로는 DB 스키마 변경이 필요 없다.

만약 구현 중 DB 변경이 필요하면 아래를 따른다.

1. 즉시 중단
2. 필요 이유 설명
3. SQL만 제공
4. 실제 DB 수정은 사용자가 직접 수행

## 15. 구현 순서

1. 사용자 이해확정 받기
2. 수정 대상 기존 파일 백업
3. `ChatSettingsPanel`의 `settings_ui` 저장 계약 수정
4. `widget-templates` API 저장 시 `settings_ui` 보존하도록 수정
5. `useWidgetTemplateSettingsController` 작성
6. `CreateWorkspacePreviewRail` 작성
7. `CreateWorkspacePage`에 전역 프리뷰 레일 삽입
8. `CreateWidgetTab`을 정책 편집 탭으로 전환
9. `create` 워크스페이스만으로 기능 독립 동작 검증
10. `/app/conversation` 참조 파일 정리
11. `/app/conversation/page.tsx` 삭제
12. 최종 build + MCP 테스트

## 16. 완료 기준

아래를 모두 만족해야 완료다.

1. `create?tab=template`에서 `conversation`의 대화 정책 전체를 편집할 수 있다.
2. 프리뷰는 `create`의 모든 탭에서 항상 보인다.
3. 프리뷰는 현재 DOM 기준 탭 내비게이션 블록 위에 배치된다.
4. 탭 이동 시 동일한 템플릿 프리뷰 상태가 유지된다.
5. `settings_ui`의 라벨/순서 변경이 저장 후에도 유지된다.
6. Runtime self-update는 글로벌 설정으로 분리되어 동작한다.
7. `/app/conversation`에 의존하지 않고도 운영 기능이 모두 수행된다.
8. 참조 정리 후 `/app/conversation` 파일이 삭제된다.
9. 삭제 후에도 build와 기능 검증이 통과한다.

## 17. 테스트 체크리스트

### 17.1 `chrome-devtools`

- [x] 현재 `/html/body/main/div/div/main/div/div/div[2]`가 탭 내비게이션 블록임을 확인
- [ ] 전역 프리뷰 블록이 해당 탭 내비게이션 블록 바로 위에 배치되었는지 확인
- [ ] `template` 탭에서 `대화 정책` 전체 섹션이 보이는지 확인
- [ ] `chat`, `agents`, `kb`, `api`, `mcp` 탭에서도 프리뷰가 계속 보이는지 확인
- [ ] 탭 이동 전후에 프리뷰 대상 템플릿이 유지되는지 확인
- [ ] `conversation`에 들어가지 않고도 프리뷰/정책/저장이 가능한지 확인
- [ ] `/app/conversation` 삭제 후 404 또는 미참조 상태를 확인하고, 대체 워크플로가 `create`로 완전히 이동했는지 확인

### 17.2 `supabase`

DB 수정이 아니라 저장 검증용 읽기 SQL만 사용한다.

템플릿 정책 확인:

```sql
select
  id,
  name,
  is_active,
  public_key,
  chat_policy
from public."B_chat_widgets"
order by updated_at desc
limit 20;
```

공유 인스턴스 확인:

```sql
select
  id,
  template_id,
  public_key,
  is_active,
  chat_policy
from public."B_chat_widget_instances"
order by updated_at desc
limit 20;
```

검증 포인트:

- `B_chat_widgets.chat_policy`에 `settings_ui`가 실제 저장되는지
- 저장한 `widget`, `features`, `settings_ui`가 재조회 시 유지되는지
- 템플릿 public key 기반 프리뷰가 유지되는지

## 18. 이번 실행의 MCP 테스트 기록

### 18.1 `chrome-devtools`

실행일: 2026-03-13

확인 결과:

1. `http://localhost:3000/app/conversation`
   - 템플릿 목록, 대화 정책, 설치 코드, preview meta, 런처 프리뷰, tab 프리뷰가 존재함을 확인
2. `http://localhost:3000/app/create?tab=template`
   - 현재는 단순 템플릿 폼만 존재하며, `conversation` 수준의 대화 정책과 프리뷰 기능이 없음
3. 현재 XPath `/html/body/main/div/div/main/div/div/div[2]`는 탭 내비게이션 블록 `<div class="border-b border-slate-200 pb-2">`를 가리킴을 확인

### 18.2 `supabase`

실행일: 2026-03-13

확인 결과:

1. `public.B_chat_widgets`
   - `chat_policy`, `public_key` 컬럼 존재
2. `public.B_chat_widget_instances`
   - `template_id`, `public_key`, `chat_policy` 컬럼 존재
3. 현재 요구사항은 신규 스키마 추가 없이 해결 가능

## 19. 이번 실행의 코드 분석 결론

1. `CreateWidgetTab`은 `conversation` 대체 화면이 아니며, `/api/widgets`를 사용한다.
2. 전역 프리뷰를 구현하려면 `CreateWorkspacePage`가 template context와 preview state를 상위에서 소유해야 한다.
3. `ChatSettingsPanel`은 현재 `settings_ui`를 저장 payload에 보존하지 않는다.
4. `/app/conversation` 삭제 시 `src/app/app/settings/page.tsx`와 `src/components/settings/WidgetInstallPanel.tsx`도 함께 정리해야 한다.
5. 따라서 이번 작업은 단일 탭 수정이 아니라 `create` 워크스페이스 구조 개편 + 공통 정책 계약 수정 + 삭제 전환 순서 설계가 함께 필요하다.

## 20. 최종 결론

이 작업의 핵심은 `conversation` 페이지의 기능을 `template` 탭에 조금 붙이는 것이 아니다.

정답은 아래 세 가지를 동시에 만족하는 구조다.

1. `대화 정책`은 `template` 탭으로 완전히 이관한다.
2. `프리뷰`는 `create` 워크스페이스 전역 기능으로 승격하고, 탭 내비게이션 위에 항상 노출한다.
3. `create` 워크스페이스만으로 기능이 독립 동작함을 검증한 뒤에만 `/app/conversation`을 삭제한다.

이 기준으로 구현하면 기능 이관과 삭제가 안전하게 분리되고, 이후 운영 흐름도 `create` 워크스페이스 하나로 정리된다.

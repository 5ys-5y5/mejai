# `/app/install` 제거 및 `/app/create` 통합 설계서

작성일: 2026-03-14  
대상 범위: `/app/install`, `/app/create`, widget dedicated/template_shared instance 노출 및 운영 흐름

## 1. 문서 목적

이 문서는 아래 두 질문에 답하고, 이후 실제 구현을 바로 진행할 수 있도록 설계 기준을 고정하기 위한 문서다.

- `instance_kind: "template_shared"` 가 실제 기능에서 어떤 역할을 하는가
- `/app/install` 을 삭제해도 `/app/create` 가 기능을 완전히 대체할 수 있는가

이 문서는 단순 의견서가 아니라, 후속 구현에서 그대로 따라야 하는 설계 문서다.  
따라서 아래 항목을 모두 포함한다.

- 현재 코드 기준 사실 관계
- 비개발자도 이해할 수 있는 설명
- 삭제 가능/불가 판단
- 안전한 통합 설계
- 수정 전 이해확정 절차
- 실행 정책
- 수정 허용 화이트리스트
- 구현 순서
- 테스트 체크리스트
- MCP 테스트 기록 작성 규칙

## 2. 현재 결론

2026-03-14 현재 코드 기준 결론은 아래와 같다.

1. `instance_kind: "template_shared"` 는 단순 표기용 문자열이 아니다.
2. 이 값은 실제로 아래 기능에서 직접 사용된다.
   - shared 인스턴스 생성 분기
   - shared 인스턴스 중복 방지
   - template public key 경로에서 shared 인스턴스 조회
   - shared 인스턴스의 일반 목록 노출 방지
3. 따라서 이 값이 빠지면 “표시만 달라지는 수준”이 아니라, template 기반 위젯이 shared 인스턴스를 찾지 못해 실패할 수 있다.
4. `/app/create` 는 현재 `/app/install` 의 일부 기능만 대체하고 있다.
5. 따라서 지금 상태에서 `/app/install` 을 바로 삭제하면 안 된다.

## 3. 현재 코드 기준 사실 관계

### 3.1 dedicated 인스턴스 생성 경로

일반 대화창용 `dedicated` 인스턴스는 `/app/create?tab=chat` 에서 생성한다.

근거 코드:

- `src/components/create/CreateWorkspacePage.tsx:25-31`
  - `chat` 탭이 존재한다.
- `src/components/create/CreateWorkspacePage.tsx:126-128`
  - `activeTab === "chat"` 일 때 `CreateChatTab` 을 렌더링한다.
- `src/components/create/CreateChatTab.tsx:279-284`
  - 새 대화창 생성 시 `POST /api/widget-instances` 를 호출한다.
- `src/app/api/widget-instances/route.ts:244-247`
  - `instance_kind` 가 없으면 기본적으로 `dedicated` 로 해석한다.
- `src/app/api/widget-instances/route.ts:299-319`
  - `dedicated` 분기에서 실제 DB row 를 insert 한다.

비개발자 설명:

- 이 경로는 “개별 홈페이지용 대화창”을 만드는 화면이다.
- 여기서 만든 인스턴스는 각각의 개별 키와 설정을 가진다.
- 한 템플릿에서 여러 개를 만들 수 있다.

### 3.2 template_shared 인스턴스 생성 경로

공용 shared 용 `template_shared` 인스턴스는 `/app/install?tab=widget` 에서 명시적으로 생성한다.

근거 코드:

- `src/components/settings/WidgetInstallPanel.tsx:135-147`
  - 버튼 클릭 시 `POST /api/widget-instances` 에 `instance_kind: "template_shared"` 를 넣어 보낸다.
- `src/app/api/widget-instances/route.ts:271-296`
  - 서버는 이 요청을 dedicated 가 아니라 shared 생성 command 로 처리한다.

비개발자 설명:

- 이 경로는 “템플릿 public key 로 접속하는 공용 위젯”을 위한 대표 인스턴스를 만든다.
- 템플릿 하나당 보통 1개만 있어야 하는 시스템용 인스턴스다.

### 3.3 `instance_kind: "template_shared"` 가 실제로 하는 일

이 값은 실제로 아래 기능에서 사용된다.

#### 역할 1. 요청을 shared 생성 분기로 보낸다

근거 코드:

- `src/app/api/widget-instances/route.ts:244-247`
- `src/app/api/widget-instances/route.ts:271-296`

설명:

- 서버는 이 값을 보고 “일반 인스턴스 생성”이 아니라 “shared 인스턴스 생성”으로 분기한다.
- 이 값이 없으면 같은 API라도 dedicated 생성으로 처리된다.

#### 역할 2. shared 인스턴스를 찾는 기준이 된다

근거 코드:

- `src/lib/widgetSharedInstance.ts:39-47`
  - `readInstanceKind()` 와 `isTemplateSharedInstance()` 가 shared 여부를 읽는다.
- `src/lib/widgetSharedInstance.ts:62-87`
  - shared row 조회 시 `chat_policy.widget.instance_kind = "template_shared"` 조건으로 찾는다.

설명:

- 시스템은 “이 row 가 shared 인스턴스인지”를 이 값으로 판별한다.
- 즉, shared 인스턴스를 찾는 공식 기준이다.

#### 역할 3. shared 인스턴스를 중복 생성하지 않게 막는다

근거 코드:

- `src/lib/widgetSharedInstance.ts:90-98`
  - 먼저 기존 shared 를 찾고
- `src/lib/widgetSharedInstance.ts:102-117`
  - 없을 때만 insert 한다.

설명:

- 템플릿마다 shared 인스턴스가 1개만 있도록 유지하는 장치다.
- 이 표식이 없으면 기존 shared 를 재사용하지 못해 중복 생성 위험이 커진다.

#### 역할 4. template 기반 위젯 실행 시 shared 인스턴스를 연결한다

근거 코드:

- `src/app/api/widget/config/route.ts:92-130`
- `src/app/api/widget/init/route.ts:126-149`

설명:

- 템플릿 public key 로 접속한 위젯은 dedicated 인스턴스를 직접 가리키지 않는다.
- 대신 서버가 “이 템플릿의 shared 인스턴스가 누구인지” 찾아서 연결한다.
- 이때 shared 여부 판단에 `template_shared` 표식이 필요하다.

#### 역할 5. shared 인스턴스를 일반 목록에서 숨긴다

근거 코드:

- `src/app/api/widget-instances/route.ts:210-214`

설명:

- 사용자가 보는 일반 대화창 목록에서는 shared 인스턴스를 숨긴다.
- 이유는 shared 인스턴스가 일반 대화창처럼 보이면 잘못 수정하거나 삭제할 위험이 크기 때문이다.

### 3.4 이 값이 빠지면 실제로 어떤 문제가 생기는가

아래 순서로 문제가 생긴다.

1. `POST /api/widget-instances` 에서 shared 분기가 아니라 dedicated 분기로 들어갈 수 있다.
2. DB row 에 shared 표식이 남지 않는다.
3. `/api/widget/config`, `/api/widget/init` 가 template public key 경로에서 shared row 를 찾지 못한다.
4. 결과적으로 template 기반 설치 코드가 `409 SHARED_INSTANCE_MISSING` 으로 실패할 수 있다.

즉, 이 값은 “보여주기용 메모”가 아니라 “공유 위젯이 작동하기 위한 기준값”이다.

## 4. `/app/create` 가 현재 대체하는 범위

### 4.1 이미 대체하고 있는 것

#### dedicated 인스턴스 생성/수정/삭제/키 재발급

근거 코드:

- `src/components/create/CreateChatTab.tsx:256-303`
- `src/components/create/CreateChatTab.tsx:305-317`

설명:

- `/app/create?tab=chat` 에서 개별 대화창 생성, 수정, 삭제, 키 재발급이 가능하다.

#### dedicated 설치 코드 / preview URL 확인

근거 코드:

- `src/components/create/CreateChatTab.tsx:188-212`
- `src/components/create/CreateChatTab.tsx:510-540`

설명:

- 개별 인스턴스 기반 설치 코드와 preview URL 은 이미 `/app/create?tab=chat` 에 있다.

#### 템플릿 기반 설치 코드 / 프리뷰 메타 / 위젯 UI 프리뷰

근거 코드:

- `src/lib/conversation/client/useWidgetTemplateSettingsController.ts:604-633`
- `src/components/widget-template/WidgetTemplateSettingsEditor.tsx:277-370`
- `src/components/create/CreateWorkspacePreviewRail.tsx:83-223`

설명:

- `/app/create?tab=template` 에는 템플릿 public key 기반 설치 코드, overrides, preview meta, 실제 UI 프리뷰가 이미 있다.

#### 템플릿 저장 시 shared 인스턴스 provision/sync

근거 코드:

- `src/lib/conversation/client/useWidgetTemplateSettingsController.ts:543-579`
- `src/app/api/widget-templates/[id]/route.ts:163-166`
- `src/app/api/widget-templates/[id]/chat-policy/route.ts:167-173`

설명:

- 템플릿을 저장하면 서버가 shared 인스턴스를 만들거나 보정한다.
- 따라서 “템플릿을 저장하는 행위” 자체는 일부 shared 유지 기능을 이미 대신하고 있다.

### 4.2 아직 대체하지 못하는 것

#### shared 상태를 바로 보여주는 전용 화면

근거 코드:

- `src/components/settings/WidgetInstallPanel.tsx:94-111`
- `src/components/settings/WidgetInstallPanel.tsx:156-189`

설명:

- `/app/install?tab=widget` 는 템플릿별 shared 상태를 `ready / missing` 으로 바로 보여준다.
- `/app/create?tab=template` 에는 현재 이 상태 표시가 없다.

#### 변경 없이 shared 를 복구하는 explicit 버튼

근거 코드:

- `src/components/settings/WidgetInstallPanel.tsx:135-147`
- `src/components/widget-template/WidgetTemplateSettingsEditor.tsx:270-274`

설명:

- `/app/install` 에는 shared 가 없을 때 “공유 인스턴스 생성” 버튼이 있다.
- `/app/create?tab=template` 에는 저장 버튼만 있는데, 이 버튼은 변경 사항이 없으면 비활성화된다.
- 따라서 shared 가 유실되어도 “아무 내용도 바꾸지 않고 복구하는 전용 버튼”은 현재 없다.

#### quickstart 안내 전용 화면

근거 코드:

- `src/components/settings/WidgetQuickstartPanel.tsx:103-168`
- `src/components/create/CreateWorkspacePage.tsx:25-31`

설명:

- `/app/install?tab=quickstart` 는 읽기 전용 안내 화면이다.
- `/app/create` 에는 같은 목적의 quickstart 전용 탭이 없다.

#### `/app/install` 의 역할을 가리키는 라우팅

근거 코드:

- `src/components/create/CreateWorkspacePage.tsx:34-41`

설명:

- 현재 `/app/create?tab=install` 또는 `/app/create?tab=quickstart` 로 들어와도 `chat` 탭으로 보내고 있다.
- 즉 현재 create 페이지는 install 페이지를 의도적으로 흡수하지 않았다.

#### non-admin 사용자에게 동일한 install 진입점 제공

근거 코드:

- `src/components/create/CreateWorkspacePage.tsx:25-31`
- `src/components/create/CreateWorkspacePage.tsx:105-107`

설명:

- `template` 탭은 관리자 전용이다.
- 따라서 `/app/install` 을 지우고 템플릿 탭만 남기면, 관리자 권한이 없는 사용자는 shared 상태 확인/설치 안내를 볼 수 없게 된다.

## 5. 최종 판단

현재 상태에서는 `/app/install` 삭제가 안전하지 않다.

삭제가 불가능한 이유는 아래 네 가지다.

1. shared 상태 표시가 `/app/create` 에 없다.
2. 변경 없이 shared 를 복구하는 explicit command UI 가 `/app/create` 에 없다.
3. quickstart 안내가 `/app/create` 에 없다.
4. `template` 탭이 관리자 전용이므로 권한 측면의 공백이 생긴다.

따라서 삭제를 하려면, 먼저 `/app/create` 안에 install 역할을 그대로 받아줄 통합 진입점을 만들어야 한다.

## 6. 권장 통합 설계

### 6.1 목표 상태

목표는 `/app/install` 기능을 없애는 것이 아니라, **페이지를 없애고 기능은 `/app/create` 안으로 이동**하는 것이다.

최종 목표는 아래와 같다.

1. `/app/create` 안에 `install` 탭을 추가한다.
2. 이 탭은 현재 `/app/install` 의 `widget`, `quickstart`, `env` 역할을 그대로 받는다.
3. 기존 `WidgetInstallPanel`, `WidgetQuickstartPanel`, `EnvSettingsPanel` 을 최대한 재사용한다.
4. `/app/install` 은 삭제 대신 `/app/create?tab=install` 로 리다이렉트하는 얇은 경로로 바꾼다.
5. 기능 동등성이 확인된 뒤에만 `/app/install` 라우트 본문을 더 줄인다.

### 6.2 왜 `install` 탭을 `/app/create` 안에 별도로 두는가

이 설계를 권장하는 이유는 아래와 같다.

1. 현재 install 기능은 dedicated 관리와 shared 관리가 섞여 있지 않다.
   - dedicated 는 `chat`
   - shared/quickstart/env 는 `install`
2. `template` 탭은 관리자 전용 편집 화면이라 install 안내 화면과 성격이 다르다.
3. 기존 컴포넌트를 재사용하면 위험이 적고, `/app/install` 삭제 전에 parity 확인이 쉽다.
4. 비개발자 입장에서도 “생성하기 안의 설치 탭”이 이해하기 쉽다.

### 6.3 권장 UX 구조

`/app/create` 의 목표 탭 구조는 아래와 같다.

- `template`
  - 관리자 전용 템플릿 편집
- `chat`
  - dedicated 인스턴스 생성/수정/설치 코드
- `install`
  - shared 상태 확인/복구
  - quickstart 안내
  - env 안내
- `agents`
- `kb`
- `api`
- `mcp`

`install` 탭 내부는 아래 3개 섹션으로 유지한다.

1. `widget`
   - shared 상태 표시
   - shared 생성/복구 버튼
   - template public key / shared install code 표시
2. `quickstart`
   - 읽기 전용 설치 절차 안내
3. `env`
   - 환경 변수/운영 값 안내

### 6.4 권장 라우팅

후속 구현에서는 아래 라우팅을 목표 상태로 삼는다.

- `/app/install` -> `/app/create?tab=install`
- `/app/install?tab=widget` -> `/app/create?tab=install&mode=widget`
- `/app/install?tab=quickstart` -> `/app/create?tab=install&mode=quickstart`
- `/app/install?tab=env` -> `/app/create?tab=install&mode=env`

중요:

- 기존 북마크/운영 문서가 깨지지 않도록 즉시 404 로 만들지 않는다.
- 먼저 redirect 로 옮기고, 운영 확인 후에만 더 축소한다.

## 7. 구현 범위 제안

### 7.1 1차 구현 목표

1차 구현의 목표는 “기능을 완전히 옮기고 `/app/install` 은 redirect 로만 남기는 것”이다.

포함:

- `/app/create` 에 `install` 탭 추가
- 기존 install UI 재사용
- install 하위 모드(`widget`, `quickstart`, `env`) 유지
- `/app/install` -> `/app/create?tab=install` redirect

제외:

- backend contract 변경
- 새로운 DB 컬럼 추가
- shared 생성 규칙 변경
- dedicated/shared 구조 재설계

### 7.2 2차 개선 목표 (1차 완료 후 별도 승인 필요)

아래는 1차 삭제 안전화 이후에만 검토한다.

- `template` 편집 탭 안에 shared 상태 배지/repair 버튼까지 흡수
- `install` 탭과 `template` 탭의 설치 카드 중복 제거
- quickstart 문구를 역할별 가이드로 재구성

## 8. 수정 전 이해확정 절차

후속 구현을 시작하기 전에 아래 이해 내용을 목록으로 다시 작성하고, 사용자에게 명시적으로 확인받아야 한다.

1. 현재 `/app/create` 는 `/app/install` 을 완전히 대체하지 못한다는 점
2. 삭제 전 먼저 `/app/create` 안에 `install` 탭을 추가해야 한다는 점
3. `template_shared` 는 기능적인 분기/조회 기준이며, 단순 표시용 값이 아니라는 점
4. 1차 구현은 backend 계약 변경 없이 UI/라우팅 통합으로 제한한다는 점
5. `/app/install` 은 바로 삭제하지 않고 먼저 `/app/create?tab=install` 로 redirect 한다는 점
6. 수정 가능 파일은 아래 화이트리스트로 제한된다는 점

사용자 확인 없이 코드 수정, 라우팅 변경, UI 이동, redirect 적용에 착수하지 않는다.

## 9. 실행 정책 (필수 준수)

아래 정책은 본 설계 또는 후속 수정에서 100% 준수한다. 간결하게 요약하지 않고, 실제 실행 단계에서 누락이 없도록 상세하게 기록한다.

1. 수정 전 이해확정 절차
- 수정 적용 전, 현재 요청에 대한 이해 내용을 목록으로 정리한다.
- 정리된 이해 내용에 대해 서로 실행하고자 하는 바가 일치하는지 사용자가 명시적으로 확정한 뒤에만 수정한다.
- 확정 없이 임의로 수정에 착수하지 않는다.

2. 변경 기록 및 롤백 보장
- 코드 수정이 있는 경우, 수정 직전의 코드를 반드시 `C:\dev\1227\mejai3\mejai\docs\diff` 폴더에 기록한다.
- 기록이 없으면 치명적 에러를 막을 수 없으므로, 기록 누락은 허용하지 않는다.
- 기록 대상은 변경된 파일 전체 또는 수정 구간을 포함하는 형태여야 하며, 언제든 수정 직전 상태로 롤백 가능해야 한다.

3. 확정 범위 외 수정 금지
- 사용자가 확정한 범위를 넘어서는 변경을 임의로 수행하지 않는다.
- 서비스 파괴(인코딩, UI)의 주된 원인이므로 절대 금지한다.

4. MCP 테스트 의무
- 매 실행마다 `supabase` MCP와 `chrome-devtools` MCP로 의도대로 동작하는지 확인한다.
- db조회로 올바로 등록되었는지 확인이 아닌 db에 대한 수정이 있는 경우 sql 쿼리를 제공하여 사용자가 직접 실행하도록 한다.
- 테스트 수행/결과는 문서 하단 체크리스트 및 테스트 기록에 남긴다.

5. 구현 단위 통제
- 1차 구현은 UI 통합/라우팅 통합에 한정한다.
- backend 로직을 바꾸고 싶어지면 즉시 중단하고 추가 승인부터 받는다.

6. 리다이렉트 우선
- 기존 `/app/install` 진입 링크를 바로 제거하지 않는다.
- 먼저 redirect 로 안전하게 흡수한 뒤, 운영 확인 후에만 더 줄인다.

## 10. 수정 허용 화이트리스트 (필수 준수)

아래 파일만 수정 가능하다. 목록 외 파일 수정이 필요할 경우 즉시 중단하고 사용자 승인을 받은 뒤에만 추가한다.  
최초 추가는 설계 내용에 맞게 수정이 예상되는 코드를 LLM이 정확한 파일 경로로 제안해야 한다. 폴더 단위 제안은 금지한다.  
각 항목은 목적 외 변경을 금지하며, 사유 범위 내에서만 수정한다.

| 파일 | 수정 허용 목적 |
|---|---|
| `docs/miginstall.md` | 본 설계 문서 유지 및 테스트 기록 업데이트 |
| `src/components/create/CreateWorkspacePage.tsx` | `/app/create` 에 `install` 탭 추가, 탭 alias/라우팅 정리 |
| `src/components/create/CreateInstallTab.tsx` | 신규 파일. install 통합 탭 컨테이너 구현 |
| `src/components/settings/WidgetInstallPanel.tsx` | create 내 재사용을 위한 임베드/문구 조정 |
| `src/components/settings/WidgetQuickstartPanel.tsx` | create 내 재사용을 위한 임베드/문구 조정 |
| `src/components/settings/EnvSettingsPanel.tsx` | create 내 재사용을 위한 임베드/문구 조정이 필요한 경우에만 수정 |
| `src/app/app/install/page.tsx` | `/app/create?tab=install` redirect 또는 얇은 전달 라우트로 축소 |

화이트리스트 외 파일이 필요해지는 경우, 아래 2가지를 먼저 사용자에게 제안하고 승인받는다.

1. 추가가 필요한 정확한 파일 경로
2. 그 파일이 꼭 필요한 이유

## 11. 상세 구현 설계

### 11.1 `CreateWorkspacePage` 에 install 탭 추가

필수 동작:

- `tabs` 목록에 `install` 탭을 추가한다.
- `install` 탭은 admin 전용이 아니다.
- 기존 `install`, `quickstart`, `widget` query alias 는 더 이상 `chat` 으로 보내지 않고 `install` 로 보낸다.
- 기존 `env` alias 는 `install` 의 하위 모드로 흡수한다.

핵심 이유:

- 현재 `/app/install` 의 기능 중심은 dedicated 관리가 아니라 shared/quickstart/env 이다.
- 따라서 `chat` 으로 alias 하는 현재 구조는 기능 대체가 아니다.

### 11.2 `CreateInstallTab` 신규 컴포넌트 도입

권장 구조:

- 상단: install 하위 모드 선택 (`widget`, `quickstart`, `env`)
- 본문:
  - `mode=widget` -> `WidgetInstallPanel`
  - `mode=quickstart` -> `WidgetQuickstartPanel`
  - `mode=env` -> `EnvSettingsPanel`

중요:

- 1차 구현에서는 기존 패널을 복제하지 않고 조합해서 쓴다.
- 공통 UI는 재사용하고, create 안에 다시 감싼다.

### 11.3 `/app/install` 라우트 축소

1차 구현에서는 삭제 대신 아래처럼 처리한다.

1. `/app/install` 진입
2. query 보존
3. `/app/create?tab=install...` 으로 redirect

금지:

- 바로 404 처리
- 기존 링크를 끊는 삭제

### 11.4 shared 상태/repair 책임 유지

`WidgetInstallPanel` 이 이미 담당하는 아래 책임은 migration 후에도 유지해야 한다.

- `/api/widgets` 로 shared 상태 read
- `shared_instance_status` 표시
- missing 시 explicit shared create 버튼 노출
- `POST /api/widget-instances { template_id, instance_kind: "template_shared" }`

이 책임을 1차 구현에서 다른 API로 재설계하지 않는다.

## 12. 구현 순서

후속 구현은 아래 순서를 따른다.

1. 수정 전 이해확정 절차 수행
2. 수정 대상 파일 원본을 `docs/diff` 에 백업
3. `CreateWorkspacePage` 에 `install` 탭/alias 설계 반영
4. `CreateInstallTab` 신규 생성
5. `WidgetInstallPanel`, `WidgetQuickstartPanel`, `EnvSettingsPanel` 을 create 내에서 자연스럽게 재사용하도록 조정
6. `/app/install` 를 redirect 라우트로 축소
7. `npm run build`
8. chrome-devtools MCP 로 `/app/create?tab=install` 동작 확인
9. supabase MCP 로 read-only 상태 확인
10. 테스트 기록을 본 문서 하단에 남김

## 13. 테스트 체크리스트

후속 구현 완료 후 아래 체크리스트를 모두 통과해야 한다.

- [ ] `/app/create?tab=install` 진입 시 install 화면이 열린다.
- [ ] `/app/create?tab=install&mode=widget` 에서 shared 상태가 보인다.
- [ ] `/app/create?tab=install&mode=quickstart` 에서 quickstart 안내가 보인다.
- [ ] `/app/create?tab=install&mode=env` 에서 env 안내가 보인다.
- [ ] `/app/install` 진입 시 `/app/create?tab=install` 로 redirect 된다.
- [ ] `/app/install?tab=widget` 진입 시 대응하는 install 모드로 redirect 된다.
- [ ] `/app/install?tab=quickstart` 진입 시 대응하는 install 모드로 redirect 된다.
- [ ] `/app/install?tab=env` 진입 시 대응하는 install 모드로 redirect 된다.
- [ ] `/app/create?tab=chat` 의 dedicated 생성/수정/설치 코드가 기존대로 동작한다.
- [ ] `template_shared` 상태 read/repair 동작이 install 탭에서 유지된다.
- [ ] `npm run build` 가 성공한다.
- [ ] chrome-devtools MCP 로 create/install UI 와 redirect 를 확인했다.
- [ ] supabase MCP 로 read-only 상태 확인을 남겼다.

## 14. 테스트 기록 작성 규칙

문서 하단 테스트 기록에는 반드시 아래를 남긴다.

1. 실행 날짜
2. 확인한 URL
3. chrome-devtools MCP 결과
4. supabase MCP 결과
5. build 결과
6. 남은 한계 또는 미검증 사항

DB write 가 필요한 검증은 아래 원칙을 따른다.

- LLM 이 직접 DB SQL write 를 실행하지 않는다.
- 필요한 SQL 이 있으면 문서에 제안하고 사용자가 직접 실행한다.
- 가능한 경우 read-only 검증을 우선한다.
- write-path UI 검증이 꼭 필요하면, 사용자 확인을 받은 disposable 테스트 데이터에서만 진행한다.

## 15. 현재 상태 기준 참고 근거

아래 파일/라인은 본 문서의 판단 근거다.

- `src/app/api/widget-instances/route.ts:244-319`
- `src/lib/widgetSharedInstance.ts:39-156`
- `src/app/api/widget/config/route.ts:92-130`
- `src/app/api/widget/init/route.ts:126-149`
- `src/components/settings/WidgetInstallPanel.tsx:94-223`
- `src/components/settings/WidgetQuickstartPanel.tsx:103-168`
- `src/components/create/CreateChatTab.tsx:188-212`
- `src/components/create/CreateChatTab.tsx:256-317`
- `src/components/create/CreateWorkspacePage.tsx:25-41`
- `src/lib/conversation/client/useWidgetTemplateSettingsController.ts:543-633`
- `src/components/widget-template/WidgetTemplateSettingsEditor.tsx:277-370`

## 16. 최종 결론

현재 서비스 코드 기준으로는 `/app/install` 페이지를 바로 삭제하면 안 된다.

안전한 방향은 아래 순서다.

1. `/app/create` 안에 `install` 탭을 추가한다.
2. 기존 install 기능을 그 탭으로 이동한다.
3. `/app/install` 은 redirect 로 축소한다.
4. 기능 동등성을 확인한 뒤에만 페이지 제거를 더 진행한다.

즉, 현재 판단은 “삭제 불가”, 목표 설계는 “create 내부 통합 후 redirect 전환”이다.

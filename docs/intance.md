# `B_chat_widget_instances` 생성 경로 정리 및 재발 방지 설계서

작성일: 2026-03-13  
대상 범위: `B_chat_widget_instances`, `/app/install`, widget shared instance 계약

## 1. 문서 목적

이 문서는 아래 두 문제를 하나의 계약 수준 문제로 묶어 해결하기 위한 설계 문서다.

- `/app/install` 화면 진입만으로 `B_chat_widget_instances` row 가 계속 생성되는 문제
- shared instance 가 재생성 루프에 빠지거나 일반 instance 처럼 노출되는 문제

이 문서는 단순 원인 요약이 아니라, 후속 구현에서 그대로 따라갈 수 있도록 아래 항목을 모두 포함한다.

- 현재 동작 확인
- 원인 분해
- 목표 계약
- API/화면별 수정 방향
- 수정 허용 화이트리스트
- 구현 순서
- 위험요소
- 진단 SQL
- 테스트 체크리스트 및 이번 턴의 실제 MCP 확인 기록

## 2. 현재 상태 확인

2026-03-13 기준으로 코드와 DB에서 확인한 현재 상태는 아래와 같다.

- `/app/install` 라우트는 `widget | quickstart | env` 탭 구조다.
- `/app/install?tab=widget` 와 `/app/install?tab=quickstart` 는 둘 다 `WidgetInstallPanel` 을 렌더링한다.
  - 확인 경로: `src/app/app/install/page.tsx`
- `WidgetInstallPanel` 은 마운트 후 템플릿을 읽고, 첫 템플릿을 자동 선택한다.
  - 확인 경로: `src/components/settings/WidgetInstallPanel.tsx`
- 같은 컴포넌트는 선택된 템플릿에 대해 `instanceByTemplate` 캐시가 없으면 자동으로 `POST /api/widget-instances` 를 호출한다.
  - 즉, 사용자가 생성 의도를 명시하지 않아도 화면 진입, 새로고침, 탭 재진입, 상태 초기화 상황에서 instance 가 생성될 수 있다.
- `/api/widgets` `GET` 은 템플릿 목록을 읽으면서 `ensureTemplateSharedInstance()` 를 호출한다.
  - 확인 경로: `src/app/api/widgets/route.ts`
- `/api/widget/config` `GET`, `/api/widget/init` `POST` 도 template-key 경로에서 `ensureTemplateSharedInstance()` 를 호출한다.
  - 확인 경로: `src/app/api/widget/config/route.ts`, `src/app/api/widget/init/route.ts`
- `ensureTemplateSharedInstance()` 는 `chat_policy.widget.instance_kind = "template_shared"` 인 row 를 찾지 못하면 새 row 를 insert 한다.
  - 확인 경로: `src/lib/widgetSharedInstance.ts`
- `syncTemplateInstances()` 는 템플릿 수정 시 해당 `template_id` 의 모든 instance row 에 템플릿 `chat_policy` 를 그대로 update 한다.
  - 확인 경로: `src/lib/widgetSharedInstance.ts`
- 위 동작은 shared instance marker 를 지울 수 있고, dedicated instance 의 override 계약도 깨뜨릴 수 있다.
- runtime 은 이미 `template.chat_policy + instance.chat_policy + request.overrides` 병합 구조를 갖고 있다.
  - 확인 경로: `src/lib/widgetRuntimeConfig.ts`
- 목록 API 는 `chat_policy.widget.instance_kind === "template_shared"` 인 row 를 숨기도록 구현되어 있다.
  - 확인 경로: `src/app/api/widget-instances/route.ts`
- Supabase MCP 기준 실존 테이블은 아래와 같다.
  - `public.B_chat_widgets`
  - `public.B_chat_widget_instances`
- Supabase MCP 조회 기준 현재 각 template 당 `shared_marked_instances = 1` 이다.
  - 이것은 현재 시점의 상태일 뿐이며, 현재 코드 계약이 안전하다는 뜻은 아니다.

## 3. 문제 정의

현재 문제는 개별 버그 2개가 아니라, 아래 계약 위반이 겹친 결과다.

### 3.1 non-provisioning 경로가 생성 의도를 대신하고 있다

- 화면 진입
- 템플릿 목록 조회
- widget runtime config 조회
- widget init

위 동작은 shared instance provisioning 관점에서는 모두 `non-command intent` 인데, 현재 구현은 이 경로들 안에서 instance 생성까지 수행한다.  
즉, `non-provisioning` 과 `provisioning command` 가 섞여 있다.

### 3.2 instance 종류 계약이 시스템적으로 보호되지 않는다

- shared instance 여부를 `chat_policy.widget.instance_kind = "template_shared"` 로 판별한다.
- 그런데 템플릿 sync 가 instance `chat_policy` 전체를 덮어쓰기 때문에 이 marker 가 사라질 수 있다.
- marker 가 사라지면 기존 shared row 는 일반 row 로 보이고, 이후 조회 경로가 또 새 shared row 를 만들 수 있다.

### 3.3 템플릿 정책과 instance override 경계가 무너져 있다

- runtime 에서는 template policy 와 instance policy 를 병합한다.
- 그런데 템플릿 저장 시 모든 instance row 의 `chat_policy` 를 템플릿 policy 로 덮어쓰고 있다.
- 이는 shared marker 손실뿐 아니라 dedicated instance override 자체를 삭제하는 설계다.

## 4. 수정 전 이해확정 절차

후속 구현에서는 아래 절차를 반드시 그대로 따른다.

1. 구현 시작 전에 이번 요청에 대한 이해 내용을 번호 목록으로 다시 작성한다.
2. 이해 목록에는 반드시 아래 항목을 포함한다.
   - `/app/install` 진입만으로 instance 가 생성되면 안 된다는 점
   - `GET /api/widgets`, `GET /api/widget/config`, `POST /api/widget/init` 는 shared provisioning 관점에서 non-command 경로로 유지되어야 한다는 점
   - shared instance 여부는 시스템 계약으로 보호되어야 하며 sync 로 지워지면 안 된다는 점
   - template 변경이 dedicated instance override 를 덮어쓰면 안 된다는 점
   - shared instance 생성은 명시적 command 에서만 일어나야 한다는 점
   - 수정 가능 파일은 아래 화이트리스트로 제한된다는 점
3. 위 이해 내용을 사용자에게 보여주고, 실행 의도가 일치하는지 명시적으로 확인받는다.
4. 사용자 확인 없이 코드 수정, API 계약 수정, DB 수정, UI 수정에 착수하지 않는다.
5. 범위가 늘어나면 즉시 중단하고, 확대된 이해 목록과 수정 대상 파일을 다시 확정받는다.

## 5. 실행 정책 (필수 준수)

후속 설계 구현은 아래 정책을 요약 없이 그대로 준수한다.

### 5.1 범위 통제

- 본 문서에서 정의한 문제 범위는 `B_chat_widget_instances` 생성 계약, shared instance 계약, `/app/install` 관련 UI/API 흐름에 한정한다.
- 이 범위를 벗어난 UI 리디자인, unrelated refactor, naming 정리, 기타 API cleanup 을 임의로 수행하지 않는다.
- shared instance 문제를 이유로 widget 전체 런타임 구조를 갈아엎지 않는다.
- 템플릿/인스턴스의 기존 공개키 체계(`public_key`)를 임의로 교체하지 않는다.

### 5.2 계약/의도 수준 수정 원칙

- `non-provisioning` 경로는 shared instance 를 생성하거나 보정하지 않는다.
- `provisioning command` 경로만 shared 생성/보정/동기화를 수행할 수 있다.
- shared instance 여부 판별, 보정, sync 규칙은 공통 helper 에 중앙화한다.
- 특정 화면 한 곳만 막는 임시 조건문으로 해결하지 않는다.
- dedicated instance 와 shared instance 를 동일 update 로 처리하지 않는다.

### 5.3 구현 안전 원칙

- 대형 파일을 수정할 때는 작은 패치로 나누고, 각 패치 후 해당 구간을 다시 열어 괄호/분기 균형을 확인한다.
- 각 API 계약 변경 후 관련 사용처를 전역 검색해 동일 패턴을 한 번에 정리한다.
- 새 필드나 새 request body 계약을 추가하면 그 필드를 소비하는 모든 route/component/helper 를 같은 작업 단위 안에서 함께 갱신한다.
- 구현 중 build error 가 발생하면 추가 수정 전에 먼저 그 에러를 해결한다.
- 후속 코드 수정이 시작되면 수정 직전 원본을 `C:\dev\1227\mejai3\mejai\docs\diff` 에 반드시 남긴다.
  - 파일 전체 백업 또는 수정 구간이 복원 가능한 수준의 백업이어야 한다.
  - 백업 없이 수정을 진행하지 않는다.

### 5.4 DB 변경 정책

- 이번 설계의 1차 목표는 앱 계약 수정이며, 테이블 스키마 변경을 전제하지 않는다.
- DB row 수선이 필요하더라도 앱 코드가 자동으로 임의 row 를 재분류하지 않는다.
- DB 수정이 필요한 경우 LLM 이 직접 write 하지 않고, 사용자가 직접 실행할 수 있는 SQL 을 문서에 제공한다.

### 5.5 테스트 의무

- 매 실행마다 `supabase` MCP 와 `chrome-devtools` MCP 로 의도 동작을 검증한다.
- DB 수정이 포함된 작업이라면 직접 SQL write 를 실행하지 않고, 검증/수선용 SQL 을 사용자에게 제공한다.
- 테스트 결과는 문서 하단 `체크리스트` 와 `테스트 기록` 에 남긴다.

## 6. 수정 허용 화이트리스트 (필수 준수)

후속 구현에서 수정 가능한 파일은 아래로 한정한다. 각 파일은 적힌 목적 범위 안에서만 수정한다.

| 파일 | 수정 허용 목적 |
|---|---|
| `src/lib/widgetSharedInstance.ts` | shared/dedicated instance 계약 중앙화, read/write helper 분리, shared marker 보존 로직, shared 전용 sync 로직 도입 |
| `src/app/api/widget-instances/route.ts` | explicit instance creation contract 정리, `instance_kind` 또는 동등 의미의 command intent 처리, shared provisioning idempotency 도입 |
| `src/app/api/widgets/route.ts` | `GET` 을 pure read 로 변경, shared status 반환, `POST` 의 command 성격 유지 |
| `src/app/api/widget/config/route.ts` | template-key read 경로에서 write side effect 제거, shared missing 시 결정된 에러 계약 반환 |
| `src/app/api/widget/init/route.ts` | template-key init 경로에서 write side effect 제거, shared missing 시 결정된 에러 계약 반환 |
| `src/app/api/widget-templates/[id]/route.ts` | 템플릿 저장 후 shared-only sync 로직 사용, dedicated override 보존 |
| `src/app/api/widget-templates/[id]/chat-policy/route.ts` | 템플릿 policy 저장 후 shared-only sync 로직 사용, dedicated override 보존 |
| `src/components/settings/WidgetInstallPanel.tsx` | mount 시 자동 생성 제거, explicit create/repair 버튼 및 shared status UI 반영 |
| `src/components/settings/WidgetQuickstartPanel.tsx` | pure read 기반 quickstart 화면 연결, shared status 및 설치 안내 정리 |
| `src/app/app/install/page.tsx` | `quickstart` 탭에 실제 `WidgetQuickstartPanel` 연결, 탭별 역할 분리 |
| `docs/intance.md` | 설계 문서 및 테스트 기록 유지 |

화이트리스트 외 파일 수정이 필요하면 즉시 중단하고, 아래 2가지를 사용자에게 먼저 제안한 뒤 승인받는다.

- 추가가 필요한 정확한 파일 경로
- 그 파일이 꼭 필요한 이유

폴더 단위 제안은 금지한다.

## 7. 목표 계약

### 7.1 핵심 목표

후속 구현의 목표는 아래 네 가지다.

1. 사용자가 명시적으로 생성하지 않으면 instance row 가 생기지 않는다.
2. `non-provisioning` 경로는 어떤 경우에도 shared provisioning write side effect 를 갖지 않는다.
3. shared instance marker 는 template sync 나 일반 instance 수정으로 지워지지 않는다.
4. template policy 변경이 dedicated instance override 를 덮어쓰지 않는다.

### 7.2 instance 종류 계약

instance 는 계약상 아래 두 종류만 취급한다.

- `dedicated`
  - 일반 사용자가 명시적으로 만드는 개별 instance
  - 각 row 의 `chat_policy` 는 template override 용도다.
- `template_shared`
  - template public key 경로에서 공용으로 참조하는 시스템 managed instance
  - template 당 최대 1개를 목표 상태로 본다.
  - 목록에서는 숨김 대상이다.

저장 위치는 현재와 같이 `chat_policy.widget.instance_kind` 를 사용하되, 이 필드는 시스템 reserved field 로 취급한다.

Reserved field 규칙:

- 일반 instance 생성/수정 요청은 `template_shared` 값을 직접 넣을 수 없다.
- shared sync 는 reserved field 를 보존하거나 강제로 복구해야 한다.
- dedicated sync 는 reserved field 를 건드리지 않는다.

### 7.3 query 와 command 계약 분리

아래 원칙을 공통 계약으로 채택한다.

- `non-provisioning`
  - 템플릿 목록 조회
  - widget runtime config 조회
  - widget init 시 기존 template/shared instance 해석
  - 기존 instance 읽기
  - 위 경로는 DB row 생성/수정 금지
- `provisioning command`
  - dedicated instance 생성
  - shared instance provision/repair
  - template 저장
  - shared instance 보정 sync
  - 위 경로만 DB row 생성/수정 허용

## 8. 상세 설계

### 8.1 공통 helper 계약 재구성

`src/lib/widgetSharedInstance.ts` 에 아래 역할을 모은다.

- `readInstanceKind(chatPolicy)`
- `buildSharedChatPolicy(basePolicy)`
- `findTemplateSharedInstance(templateId)` 또는 동등 함수
  - pure read
- `provisionTemplateSharedInstance(template)`
  - command
  - template 당 shared row 가 있으면 기존 row 반환
  - 없으면 생성
- `syncTemplateSharedInstance(template, nowIso)`
  - shared row 만 update
  - `chat_policy` 전체를 템플릿으로 갈아끼우지 않고, shared reserved field 를 유지한 상태로 템플릿 policy 를 반영
- dedicated instance bulk sync 제거

중요 규칙:

- 기존 `ensureTemplateSharedInstance()` 처럼 이름만 `ensure` 인 query/command 혼합 함수는 유지하지 않는다.
- helper 이름과 사용처만 보고도 `read` 인지 `write` 인지 알 수 있어야 한다.

### 8.2 `/api/widget-instances` 계약

`POST /api/widget-instances` 는 명시적 command endpoint 로 유지하되, request body 의 의도를 명확히 받도록 바꾼다.

제안 body 계약:

```json
{
  "template_id": "uuid",
  "instance_kind": "dedicated"
}
```

또는 shared provisioning 시:

```json
{
  "template_id": "uuid",
  "instance_kind": "template_shared"
}
```

규칙:

- `instance_kind` 기본값은 `dedicated`
- `dedicated`
  - 현재 일반 instance 생성 계약 유지
  - 사용자가 넣는 `chat_policy` 는 dedicated override 로 저장 가능
- `template_shared`
  - admin 또는 동등 권한만 허용
  - `chat_policy` 는 클라이언트 입력을 신뢰하지 않고 시스템 helper 가 생성
  - 동일 `template_id` 에 shared 가 이미 있으면 새로 만들지 않고 기존 row 반환
  - 즉, idempotent command 다

이 설계는 “shared instance 생성도 하나의 instance provisioning intent” 로 취급하므로, case-specific 별도 route 추가보다 계약 일관성이 높다.

### 8.3 `/api/widgets` 계약

`GET /api/widgets` 는 pure read 로 바꾼다.

반환에는 아래 상태를 포함한다.

- `instance_id`
- `instance_public_key`
- `shared_instance_status: "ready" | "missing"`

규칙:

- shared row 가 있으면 `ready`
- shared row 가 없으면 `missing`
- `GET` 안에서는 shared row 생성 금지

`POST /api/widgets` 는 template create/update command 성격을 유지한다.  
다만 template 저장 후에는 아래 두 단계만 허용한다.

1. shared row 존재 보장 command 수행
2. shared row 에 대한 shared-only sync 수행

여기서도 dedicated instance 전체 update 는 금지한다.

### 8.4 `/api/widget/config` 와 `/api/widget/init` 계약

template public key 기반 경로는 더 이상 “없으면 shared 를 만들기”를 수행하지 않는다.

새 계약:

- `instance_id` 기반 요청
  - 기존처럼 해당 instance 를 읽는다.
- `template_id` 또는 template public key 기반 요청
  - shared instance 가 있으면 그것을 읽는다.
  - shared instance 가 없으면 `409` 또는 설계에서 정한 단일 에러 코드로 반환한다.
  - 예시 코드: `SHARED_INSTANCE_MISSING`

권장 이유:

- widget runtime 진입이 데이터를 생성하는 계약이면 안 된다.
- missing 상태를 명시적으로 노출해야 UI 와 운영자가 repair 할 수 있다.

### 8.5 template sync 계약

현재 `syncTemplateInstances()` 는 제거하거나 shared 전용 로직으로 축소한다.

새 규칙:

- template 저장 시 shared instance row 만 동기화한다.
- dedicated instance row 의 `chat_policy` 는 건드리지 않는다.
- dedicated instance row 의 `is_public`, `is_active` 도 template 저장과 함께 일괄 수정하지 않는다.
  - runtime 이 이미 template 상태와 instance 상태를 각각 판단하므로, template row 자체의 상태로 충분하다.
- shared row 동기화 시에는 `chat_policy.widget.instance_kind = "template_shared"` 를 반드시 유지한다.

이 설계는 runtime 의 기존 병합 규칙과 일치한다.

- template policy = base
- instance policy = override
- request overrides = session/request override

즉, template 저장이 dedicated override 저장소를 덮어쓰면 안 된다.

### 8.6 `/app/install` UI 계약

`/app/install?tab=widget`

- 현재처럼 진입 즉시 instance 를 만들면 안 된다.
- 템플릿을 선택하면 현재 shared 상태를 읽기만 한다.
- 상태가 `ready` 면 설치 코드/preview URL 을 보여준다.
- 상태가 `missing` 이면 아래를 보여준다.
  - “공유 인스턴스가 아직 없습니다” 상태 메시지
  - explicit 생성 버튼
  - 버튼 클릭 시에만 `POST /api/widget-instances { template_id, instance_kind: "template_shared" }`

`/app/install?tab=quickstart`

- 실제 `WidgetQuickstartPanel` 을 렌더링한다.
- `GET /api/widgets` 만 사용한다.
- quickstart 는 읽기/안내 전용으로 유지한다.
- quickstart 에서는 shared missing 상태를 안내만 하고, 생성 command 를 숨기거나 명시적으로 별도 버튼 정책을 정한다.
  - 권장: quickstart 는 생성 버튼 없이 상태 안내만 제공

## 9. 구현 순서

후속 구현은 아래 순서를 지킨다.

1. 수정 전 이해확정 절차 수행
2. 화이트리스트 파일의 수정 직전 내용을 `docs/diff` 에 백업
3. `src/lib/widgetSharedInstance.ts` 에서 read/query helper 와 write/command helper 분리
4. `src/app/api/widget-instances/route.ts` 에 explicit `instance_kind` command 계약 반영
5. `src/app/api/widgets/route.ts`, `src/app/api/widget/config/route.ts`, `src/app/api/widget/init/route.ts` 에서 read-side write 제거
6. `src/app/api/widget-templates/[id]/route.ts`, `src/app/api/widget-templates/[id]/chat-policy/route.ts` 에서 shared-only sync 로 전환
7. `/app/install` UI 두 패널을 read-first / explicit-command 구조로 수정
8. `rg` 로 `ensureTemplateSharedInstance`, `syncTemplateInstances`, `template_shared` 사용처 전체 재검색
9. `npm run build` 실행
10. chrome-devtools MCP 와 supabase MCP 로 동작 확인
11. 테스트 기록과 diff 백업 경로를 문서에 남김

## 10. 실패 방지 포인트

### 10.1 절대 금지

- `GET /api/widgets` 안에서 shared 생성
- `GET /api/widget/config` 안에서 shared 생성
- `POST /api/widget/init` 안에서 shared 생성
- `WidgetInstallPanel` 마운트 effect 에서 자동 `POST /api/widget-instances`
- template 저장 시 `B_chat_widget_instances` 전체 row 의 `chat_policy` 일괄 overwrite
- shared marker 가 client payload 에 의해 자유롭게 덮이는 구조

### 10.2 허용되는 보정

- explicit admin command 에서 shared instance 를 없으면 만들기
- template 저장 command 직후 shared instance 전용 동기화
- shared marker 누락 row 를 query 에서 감지하여 UI 에 “repair 필요” 상태로 표시

## 11. 데이터 진단 및 운영 SQL

아래 SQL 은 사용자가 직접 실행하는 진단용이다. LLM 은 DB write 를 직접 실행하지 않는다.

### 11.1 template 별 shared marker 현황

```sql
select
  template_id,
  count(*) as total_instances,
  count(*) filter (
    where chat_policy->'widget'->>'instance_kind' = 'template_shared'
  ) as shared_marked_instances
from public."B_chat_widget_instances"
group by template_id
order by total_instances desc, template_id;
```

해석:

- `shared_marked_instances = 1` 이 목표 상태
- `0` 이면 shared missing 또는 marker 손실
- `2 이상` 이면 중복 shared

### 11.2 shared missing template 찾기

```sql
select
  w.id as template_id,
  w.name as template_name,
  count(i.id) filter (
    where i.chat_policy->'widget'->>'instance_kind' = 'template_shared'
  ) as shared_marked_instances
from public."B_chat_widgets" w
left join public."B_chat_widget_instances" i
  on i.template_id = w.id
group by w.id, w.name
having count(i.id) filter (
  where i.chat_policy->'widget'->>'instance_kind' = 'template_shared'
) = 0
order by w.name, w.id;
```

### 11.3 주의: 자동 repair SQL 은 1차 배포 범위에서 제외

marker 가 이미 사라진 row 를 SQL 만으로 안전하게 “기존 shared row” 로 특정할 근거가 부족할 수 있다.  
따라서 1차 배포에서는 아래 원칙을 따른다.

- 자동 SQL repair 를 기본 경로로 삼지 않는다.
- 앱의 explicit shared provision command 로 새 shared 를 보정한다.
- 기존에 일반 row 로 노출된 후보 row 정리는 운영자가 별도 판단한다.

## 12. 테스트 체크리스트

후속 구현 완료 후 아래 체크리스트를 모두 통과해야 한다.

- [ ] `/app/install?tab=widget` 최초 진입 시 `B_chat_widget_instances` row 수가 증가하지 않는다.
- [ ] `/app/install?tab=widget` 새로고침 시 row 수가 증가하지 않는다.
- [ ] `/app/install?tab=widget` 와 `/app/install?tab=quickstart` 를 오갈 때 row 수가 증가하지 않는다.
- [ ] `WidgetInstallPanel` 은 shared missing 시 자동 생성하지 않고 explicit 버튼만 노출한다.
- [ ] explicit 버튼 클릭 시에만 `template_shared` row 가 1회 생성되거나 기존 row 가 반환된다.
- [ ] `GET /api/widgets` 호출만으로 DB write 가 발생하지 않는다.
- [ ] `GET /api/widget/config` template-key 경로 호출만으로 DB write 가 발생하지 않는다.
- [ ] `POST /api/widget/init` template-key 경로 호출만으로 DB write 가 발생하지 않는다.
- [ ] template 수정 후 dedicated instance 의 `chat_policy` override 가 유지된다.
- [ ] template 수정 후 shared instance 의 `chat_policy.widget.instance_kind` 가 유지된다.
- [ ] `GET /api/widget-instances` 목록에 shared row 가 계속 숨겨진다.
- [ ] `npm run build` 가 성공한다.
- [ ] chrome-devtools MCP 로 `/app/install` 네트워크/화면 동작을 확인했다.
- [ ] supabase MCP 로 shared marker 현황 SQL 을 확인했다.

## 13. 이번 턴 테스트 기록

### 13.1 코드 확인

- 확인 완료: `src/app/app/install/page.tsx`
  - `widget` 와 `quickstart` 둘 다 `WidgetInstallPanel` 렌더링 확인
- 확인 완료: `src/components/settings/WidgetInstallPanel.tsx`
  - 첫 템플릿 자동 선택 및 mount 후 자동 `POST /api/widget-instances` 확인
- 확인 완료: `src/lib/widgetSharedInstance.ts`
  - `ensureTemplateSharedInstance()` 의 조회+생성 혼합 계약 확인
  - `syncTemplateInstances()` 의 전체 row overwrite 확인
- 확인 완료: `src/app/api/widgets/route.ts`
  - `GET` 내 shared ensure 호출 확인
- 확인 완료: `src/app/api/widget/config/route.ts`
  - template-key read 경로에서 shared ensure 호출 확인
- 확인 완료: `src/app/api/widget/init/route.ts`
  - template-key init 경로에서 shared ensure 호출 확인
- 확인 완료: `src/lib/widgetRuntimeConfig.ts`
  - template + instance + overrides 병합 구조 확인

### 13.2 Supabase MCP

- 성공: `list_tables`
  - `public.B_chat_widgets`, `public.B_chat_widget_instances` 및 주요 컬럼 확인
- 성공: read-only SQL
  - template 별 `shared_marked_instances` 집계 확인
  - 현재 조회 시점에는 template 별 `shared_marked_instances = 1`

### 13.3 Chrome DevTools MCP

- 시도: `/app/install?tab=widget`, `/app/install?tab=quickstart` 페이지 열기
- 결과: 실패
- 실패 사유:
  - chrome-devtools MCP 가 기존 실행 중인 브라우저 프로필 충돌로 새 세션을 열지 못함
  - 오류 요지: browser already running for existing profile
- 판단:
  - 이번 턴에서는 코드 정적 확인과 Supabase MCP 확인만 완료
  - 후속 구현 턴에서는 브라우저 프로필 충돌을 먼저 해소한 뒤 네트워크/화면 동작을 재검증해야 함

## 14. 결론

이 문제의 핵심은 “shared instance 중복 생성” 자체가 아니라, 아래 계약 붕괴다.

- query 가 command 를 수행한다.
- shared instance 의 시스템 marker 가 보호되지 않는다.
- template policy 와 instance override 의 경계가 무너져 있다.

따라서 해결도 아래 순서로 이뤄져야 한다.

1. read-side write 제거
2. shared provisioning 을 explicit command 로 이동
3. shared marker 보존 helper 중앙화
4. template sync 를 shared-only 로 축소
5. `/app/install` UI 를 read-first / explicit-create 구조로 변경

이 순서를 지키면 `/app/install` 자동 생성 문제와 shared 재생성 루프를 함께 끊을 수 있다.

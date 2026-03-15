# `delInstancekind.md` 구현 반영 상세 설명서

작성일: 2026-03-15  
기준 브랜치 상태: 현재 워킹트리  
라인 번호 기준: 본 문서 작성 시점의 현재 파일 내용 기준

## 1. 이 문서의 목적

이 문서는 `docs/delInstancekind.md` 설계가 실제 코드에 어떻게 반영되었는지를 매우 구체적으로 설명한다.

핵심 질문은 아래 두 가지다.

1. 어떤 파일의 몇 번째 줄이 어떻게 바뀌었는가
2. 그 변경이 실제 런타임에서 어떻게 작동하는가

중요한 전제도 함께 적는다.

- 이번 반영은 서버 계약 중심 구현이다.
- UI 는 사용자 지침에 따라 수정하지 않았다.
- 따라서 서버는 이미 `instance_kind` 없이 동작하지만, UI 일부 문자열은 아직 남아 있다.
- `creation_path` 는 코드에는 반영되었지만, 실제 DB 컬럼은 아직 사용자가 SQL 로 추가해야 한다.

## 2. 현재 반영 완료 여부 요약

서버 코드 기준으로는 아래가 반영 완료되었다.

- 템플릿 위젯이 더 이상 hidden shared instance 에 의존하지 않는다.
- `SHARED_INSTANCE_MISSING` 구조가 제거되었다.
- widget token 이 `template_id + instance_id` 구조로 바뀌었다.
- runtime policy source 가 `B_chat_widgets.chat_policy` 하나로 고정되었다.
- widget instance CRUD 에서 `instance_kind` 와 shared lock 이 제거되었다.
- template 저장 API 가 더 이상 shared instance 를 자동 생성/동기화하지 않는다.
- `creation_path` 를 instance 생성 시 기록하도록 서버 코드가 준비되었다.

아직 남아 있는 것은 아래다.

- `B_chat_widget_instances.creation_path` 컬럼은 DB 에 아직 없다.
- UI 는 수정하지 않았으므로 [`WidgetInstallPanel.tsx`](C:\dev\1227\mejai3\mejai\src\components\settings\WidgetInstallPanel.tsx#L145) 에 `instance_kind: "template_shared"` 문자열이 남아 있다.
- 이 문자열은 현재 서버에서 기능 분기 기준으로 사용되지 않는다.

## 3. 전체 동작 흐름이 어떻게 바뀌었는가

이제 템플릿 설치 흐름은 아래처럼 작동한다.

1. 브라우저가 템플릿 `widget_id + public_key` 로 [`widget/config/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\config\route.ts) 를 호출한다.
2. 이 라우트는 더 이상 `B_chat_widget_instances` 의 shared row 를 찾지 않고, 바로 `B_chat_widgets` row 를 읽는다.
3. 브라우저가 [`widget/init/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts) 를 호출하면 세션 metadata 에 `template_id` 는 항상 넣고, `widget_instance_id` 는 인스턴스 모드일 때만 넣는다.
4. `issueWidgetToken()` 은 `template_id` 와 `instance_id` 를 분리해서 토큰에 담는다.
5. 이후 [`widget/chat/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts), [`widget/stream/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\stream\route.ts), [`widget/sessions/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\sessions\route.ts), [`widget/history/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\history\route.ts), [`widget/logs/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\logs\route.ts), [`widget/event/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\event\route.ts) 는 토큰을 읽어 template mode 와 instance mode 를 구분한다.
6. 이때 base policy 는 항상 `B_chat_widgets.chat_policy` 에서 읽고, `B_chat_widget_instances.chat_policy` 는 읽지 않는다.

즉, “템플릿은 템플릿 row 하나로 동작하고, 인스턴스는 사용자가 만들었을 때만 존재한다”는 설계가 서버 쪽에서 구현되었다.

## 4. 파일별 상세 설명

## 4.1 [`src/lib/widgetToken.ts`](C:\dev\1227\mejai3\mejai\src\lib\widgetToken.ts)

### 4.1.1 payload 구조 변경

- [`widgetToken.ts:3-12`](C:\dev\1227\mejai3\mejai\src\lib\widgetToken.ts#L3)
- `WidgetTokenPayload` 에 `template_id`, `instance_id` 가 추가되었다.
- 이전 의미:
  - `widget_id` 하나만 있어서 downstream 이 그것을 항상 instance id 처럼 오해할 수 있었다.
- 현재 의미:
  - `template_id` 는 “이 위젯이 어떤 템플릿에서 왔는가”
  - `instance_id` 는 “이 위젯이 실제 사용자 인스턴스인가”
  - `widget_id` 는 하위 호환용 normalized alias

### 4.1.2 토큰 발급 방식 변경

- [`widgetToken.ts:48-75`](C:\dev\1227\mejai3\mejai\src\lib\widgetToken.ts#L48)
- `issueWidgetToken()` 이 이제 `widget_id` 를 직접 요구하지 않는다.
- 내부 동작:
  - [`widgetToken.ts:56-58`](C:\dev\1227\mejai3\mejai\src\lib\widgetToken.ts#L56) 에서 `templateId`, `instanceId`, `widgetId` 를 정규화한다.
  - `widget_id` 는 `instance_id` 가 있으면 그것을 쓰고, 없으면 `template_id` 를 쓴다.
  - 그래서 template mode 에서는 `widget_id == template_id`, instance mode 에서는 `widget_id == instance_id` 가 된다.

이 변경 덕분에 old consumer 가 `widget_id` 만 읽더라도 완전히 깨지지 않고, new consumer 는 `template_id` 와 `instance_id` 를 분리해서 읽을 수 있다.

### 4.1.3 토큰 검증 방식 변경

- [`widgetToken.ts:78-114`](C:\dev\1227\mejai3\mejai\src\lib\widgetToken.ts#L78)
- `verifyWidgetToken()` 은 구버전/신버전 payload 를 모두 받을 수 있게 정규화한다.
- 핵심은 [`widgetToken.ts:98-101`](C:\dev\1227\mejai3\mejai\src\lib\widgetToken.ts#L98) 이다.
- 동작:
  - `template_id` 가 있으면 template mode 를 그대로 유지
  - `template_id` 가 없고 `widget_id` 만 있으면 old token 으로 보고 `instance_id = widget_id` 처럼 해석
  - 결과적으로 토큰 구조를 바꾸더라도 기존 발급분과 신규 발급분이 동시에 동작할 수 있다

### 4.1.4 토큰 읽기 helper 추가

- [`widgetToken.ts:116-121`](C:\dev\1227\mejai3\mejai\src\lib\widgetToken.ts#L116)
- `readWidgetTokenInstanceId()`, `readWidgetTokenTemplateId()` 를 추가했다.
- 이후 라우트들은 이 helper 로 모드를 구분한다.

## 4.2 [`src/lib/widgetRuntimeConfig.ts`](C:\dev\1227\mejai3\mejai\src\lib\widgetRuntimeConfig.ts)

### 4.2.1 인스턴스 타입에서 `chat_policy` 제거

- [`widgetRuntimeConfig.ts:30-40`](C:\dev\1227\mejai3\mejai\src\lib\widgetRuntimeConfig.ts#L30)
- `WidgetInstanceRow` 에서 `chat_policy` 필드를 제거했다.
- 의미:
  - 런타임 helper 가 인스턴스 policy 를 base source 로 읽지 않도록 타입 단계에서 차단

### 4.2.2 `ResolvedWidgetConfig.instance` nullable 변경

- [`widgetRuntimeConfig.ts:42-49`](C:\dev\1227\mejai3\mejai\src\lib\widgetRuntimeConfig.ts#L42)
- `instance` 가 `WidgetInstanceRow | null` 로 바뀌었다.
- 의미:
  - 템플릿만 있는 경우도 정상 런타임 계산이 가능하다는 계약을 타입으로 표현

### 4.2.3 base policy 계산 변경

- [`widgetRuntimeConfig.ts:66-67`](C:\dev\1227\mejai3\mejai\src\lib\widgetRuntimeConfig.ts#L66)
- `resolveWidgetBasePolicy()` 는 이제 template 하나만 받는다.
- 이전 구조:
  - template policy + instance policy 를 합치는 방향
- 현재 구조:
  - `normalizeWidgetChatPolicyProvider(template.chat_policy || null)` 만 사용

이것이 “runtime policy source = `B_chat_widgets.chat_policy`” 원칙의 핵심 구현이다.

### 4.2.4 runtime config 계산 변경

- [`widgetRuntimeConfig.ts:100-130`](C:\dev\1227\mejai3\mejai\src\lib\widgetRuntimeConfig.ts#L100)
- `resolveWidgetRuntimeConfig()` 는 `instance` 를 optional 로 받고, base policy 는 항상 template 에서만 읽는다.
- 의미:
  - request overrides 는 허용
  - 하지만 instance DB row 자체의 policy 는 base merge 에 포함되지 않음

## 4.3 [`src/app/api/widget/config/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\config\route.ts)

이 파일은 “왜 `/login` 템플릿 위젯이 다시 켜졌는가”를 설명하는 가장 중요한 파일이다.

### 4.3.1 요청 파라미터 해석 변경

- [`widget/config/route.ts:40-45`](C:\dev\1227\mejai3\mejai\src\app\api\widget\config\route.ts#L40)
- `instance_id`, `template_id`, `widget_id` 를 분리해서 읽는다.
- [`widget/config/route.ts:43`](C:\dev\1227\mejai3\mejai\src\app\api\widget\config\route.ts#L43)의 `requestedWidgetId` 는 “instance mode 가 아니면 template id 를 widget target 으로 쓴다”는 뜻이다.

### 4.3.2 template mode 직접 조회

- [`widget/config/route.ts:91-106`](C:\dev\1227\mejai3\mejai\src\app\api\widget\config\route.ts#L91)
- `instanceId` 가 없으면 바로 `B_chat_widgets` 를 읽는다.
- 이 라인들이 이전 shared lookup 구조를 대체한다.
- 중요:
  - 더 이상 `widgetSharedInstance.ts`
  - 더 이상 `findTemplateSharedInstance()`
  - 더 이상 `SHARED_INSTANCE_MISSING`

### 4.3.3 instance mode 에서도 template row 를 다시 읽음

- [`widget/config/route.ts:109-125`](C:\dev\1227\mejai3\mejai\src\app\api\widget\config\route.ts#L109)
- instance mode 라도 실제 정책은 template row 에서 읽는다.
- 의미:
  - 인스턴스는 메타데이터/접근 제어/키를 담당
  - 정책 본문은 템플릿이 담당

### 4.3.4 최종 응답 값 계산

- [`widget/config/route.ts:127-141`](C:\dev\1227\mejai3\mejai\src\app\api\widget\config\route.ts#L127)
- `resolveWidgetBasePolicy(template)` 와 `resolveWidgetRuntimeConfig(template, instance, ...)` 를 사용한다.
- `widget.id` 는 `instance?.id || template.id`
- `widget.public_key` 는 `instance?.public_key || template.public_key`
- 즉 template mode 에서는 template id/public key 가 그대로 내려간다.

## 4.4 [`src/app/api/widget/init/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts)

이 파일은 config 다음으로 중요하다. 실제 세션과 토큰을 생성하는 곳이기 때문이다.

### 4.4.1 template mode / instance mode 입력 분리

- [`widget/init/route.ts:78-83`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L78)
- `instance_id`, `template_id`, `widget_id`, `widget_public_key`, `instance_public_key` 를 분리해서 읽는다.
- 동작:
  - instance mode 면 `instance_id + instance_public_key + template_id` 조합을 요구
  - template mode 면 `widget_id + widget_public_key` 조합만 요구

### 4.4.2 instance mode 와 template mode 조회 분리

- [`widget/init/route.ts:103-137`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L103)
- [`widget/init/route.ts:106-124`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L106) 는 instance mode
- [`widget/init/route.ts:125-137`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L125) 는 template mode
- template mode 에서는 `B_chat_widgets` 만 읽는다.

### 4.4.3 template fallback 방식

- [`widget/init/route.ts:139-155`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L139)
- instance mode 로 들어온 경우에도 실제 정책 source 를 얻기 위해 template row 를 다시 읽는다.
- shared instance fallback 은 여기서 완전히 사라졌다.

### 4.4.4 policy 계산

- [`widget/init/route.ts:157-159`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L157)
- `resolveWidgetBasePolicy(template)` 와 `resolveWidgetRuntimeConfig(template, instance, ...)` 로 통일되었다.
- 이 라인이 템플릿만으로도 init 이 가능해진 이유다.

### 4.4.5 세션 재사용 검증 변경

- [`widget/init/route.ts:167-190`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L167)
- 기존 session 을 재사용할 때 metadata 를 검사한다.
- 핵심 규칙:
  - `metadata.template_id` 가 현재 template 과 다르면 session 폐기
  - instance mode 에서는 `metadata.widget_instance_id` 가 현재 instance 와 다르면 폐기
  - template mode 에서는 기존 metadata 에 `widget_instance_id` 가 남아 있으면 폐기

이 로직 덕분에 “template session” 과 “instance session” 이 섞이지 않는다.

### 4.4.6 세션 metadata 구조 변경

- [`widget/init/route.ts:195-203`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L195)
- 새 metadata 구조:
  - `widget_instance_id: instance?.id || null`
  - `template_id: template.id`
  - `origin`, `page_url`, `referrer`, `visitor_id`, `visitor`

중요한 점은 `widget_instance_id` 가 강제가 아니라는 것이다.

### 4.4.7 토큰 발급 구조 변경

- [`widget/init/route.ts:217-226`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L217)
- `issueWidgetToken()` 호출 시:
  - `template_id: String(template.id)`
  - `instance_id: instance?.id || null`

즉, downstream 라우트는 토큰만 보고도 현재 세션이 template mode 인지 instance mode 인지 알 수 있다.

### 4.4.8 audit event payload 변경

- [`widget/init/route.ts:243-246`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L243)
- audit payload 에 `widget_id`, `widget_instance_id`, `template_id` 를 함께 남긴다.
- 의미:
  - 운영 로그에서도 template mode / instance mode 를 구분 가능

## 4.5 [`src/app/api/widget/chat/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts)

### 4.5.1 토큰 구조 읽기 변경

- [`widget/chat/route.ts:5`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts#L5)
- `readWidgetTokenInstanceId`, `readWidgetTokenTemplateId` 를 import 한다.

### 4.5.2 template row 확장 타입 추가

- [`widget/chat/route.ts:25-27`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts#L25)
- `RuntimeTemplateRow` 를 둔 이유:
  - runtime config helper 타입은 `public_key` 를 필수로 들고 있지 않음
  - 하지만 chat route 는 runtime header 에 `public_key` 를 넣어야 함

### 4.5.3 instance / template 대상 해석 변경

- [`widget/chat/route.ts:214-261`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts#L214)
- 순서:
  - [`widget/chat/route.ts:214-215`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts#L214) 에서 token 에서 instance/template 분리
  - [`widget/chat/route.ts:217-229`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts#L217) 에서 instance 가 있으면 instance row 조회
  - [`widget/chat/route.ts:231-237`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts#L231) 에서 template row 조회
  - [`widget/chat/route.ts:256-258`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts#L256) 에서 policy 계산
  - [`widget/chat/route.ts:259-261`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts#L259) 에서 실제 runtime widget id/name/public key 계산

### 4.5.4 runtime proxy header 정리

- [`widget/chat/route.ts:482-484`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts#L482)
- runtime backend 로 넘길 헤더도 이제 `runtimeWidgetId`, `runtimeWidgetName`, `runtimePublicKey` 기반이다.
- 의미:
  - template mode 면 template 값을 넘김
  - instance mode 면 instance 값을 넘김

### 4.5.5 audit event 대상 id 정리

- [`widget/chat/route.ts:384`](C:\dev\1227\mejai3\mejai\src\app\api\widget\chat\route.ts#L384) 등 여러 audit insert 지점에서 `widgetId: runtimeWidgetId` 를 사용한다.
- 이전처럼 무조건 instance id 를 가정하지 않는다.

## 4.6 [`src/app/api/widget/stream/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\stream\route.ts)

stream route 는 chat route 와 같은 구조를 가진다.

### 4.6.1 토큰 구조 읽기 변경

- [`widget/stream/route.ts:3`](C:\dev\1227\mejai3\mejai\src\app\api\widget\stream\route.ts#L3)
- `readWidgetTokenInstanceId`, `readWidgetTokenTemplateId` 사용

### 4.6.2 template/instance 해석 변경

- [`widget/stream/route.ts:106-149`](C:\dev\1227\mejai3\mejai\src\app\api\widget\stream\route.ts#L106)
- 구조:
  - token 에서 instance/template 분리
  - instance 가 있으면 instance 조회
  - 없으면 template id 만으로 template 조회
  - policy 는 `resolveWidgetBasePolicy(runtimeTemplate)` 로 계산

### 4.6.3 runtime backend 헤더 변경

- [`widget/stream/route.ts:323`](C:\dev\1227\mejai3\mejai\src\app\api\widget\stream\route.ts#L323)
- `x-widget-org-id` 는 이제 `runtimeTemplate.created_by` 기준
- shared instance 나 synthetic row 를 전제로 하지 않는다

## 4.7 [`src/app/api/widget/sessions/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\sessions\route.ts)

### 4.7.1 토큰 분기 추가

- [`widget/sessions/route.ts:3`](C:\dev\1227\mejai3\mejai\src\app\api\widget\sessions\route.ts#L3)
- [`widget/sessions/route.ts:32-33`](C:\dev\1227\mejai3\mejai\src\app\api\widget\sessions\route.ts#L32)
- template mode / instance mode 를 토큰 기준으로 나눈다.

### 4.7.2 존재 검증 분기

- [`widget/sessions/route.ts:35-54`](C:\dev\1227\mejai3\mejai\src\app\api\widget\sessions\route.ts#L35)
- instance mode:
  - `B_chat_widget_instances` 의 활성 row 확인
- template mode:
  - `B_chat_widgets` 의 활성 row 확인

### 4.7.3 session 조회 기준 변경

- [`widget/sessions/route.ts:60-62`](C:\dev\1227\mejai3\mejai\src\app\api\widget\sessions\route.ts#L60)
- instance mode:
  - `metadata` 안에 `visitor_id + widget_instance_id`
- template mode:
  - `metadata` 안에 `visitor_id + template_id`

### 4.7.4 template mode 에서 instance session 제거

- [`widget/sessions/route.ts:73-77`](C:\dev\1227\mejai3\mejai\src\app\api\widget\sessions\route.ts#L73)
- 결과 목록에서 `metadata.widget_instance_id` 가 있는 row 를 제거한다.
- 의미:
  - template 위젯에서 instance 전용 세션이 보이지 않음

## 4.8 [`src/app/api/widget/history/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\history\route.ts)

### 4.8.1 토큰 구조 분리

- [`widget/history/route.ts:3`](C:\dev\1227\mejai3\mejai\src\app\api\widget\history\route.ts#L3)
- [`widget/history/route.ts:45-46`](C:\dev\1227\mejai3\mejai\src\app\api\widget\history\route.ts#L45)

### 4.8.2 존재 검증

- [`widget/history/route.ts:48-67`](C:\dev\1227\mejai3\mejai\src\app\api\widget\history\route.ts#L48)
- instance mode 면 instance 존재 확인
- template mode 면 template 존재 확인

### 4.8.3 session metadata 검증

- [`widget/history/route.ts:79-85`](C:\dev\1227\mejai3\mejai\src\app\api\widget\history\route.ts#L79)
- `metadata.widget_instance_id`, `metadata.template_id` 를 읽는다.
- 이후 동작:
  - instance mode 면 widget_instance_id mismatch 차단
  - template mode 면 instance id 가 들어간 세션을 차단

즉, history 라우트도 템플릿 세션과 인스턴스 세션을 섞지 않는다.

## 4.9 [`src/app/api/widget/logs/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\logs\route.ts)

logs route 는 history route 와 동일한 원리로 바뀌었다.

- [`widget/logs/route.ts:3`](C:\dev\1227\mejai3\mejai\src\app\api\widget\logs\route.ts#L3) 토큰 helper import
- [`widget/logs/route.ts:59-60`](C:\dev\1227\mejai3\mejai\src\app\api\widget\logs\route.ts#L59) token 분기
- [`widget/logs/route.ts:62-81`](C:\dev\1227\mejai3\mejai\src\app\api\widget\logs\route.ts#L62) 대상 존재 검증
- [`widget/logs/route.ts:93-99`](C:\dev\1227\mejai3\mejai\src\app\api\widget\logs\route.ts#L93) session metadata 검증

의미는 history 와 같다.

- template mode 는 template 세션만 본다
- instance mode 는 해당 instance 세션만 본다

## 4.10 [`src/app/api/widget/event/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget\event\route.ts)

### 4.10.1 event 대상 id 계산 변경

- [`widget/event/route.ts:21`](C:\dev\1227\mejai3\mejai\src\app\api\widget\event\route.ts#L21)
- `widgetId = instance_id || template_id || payload.widget_id`
- 의미:
  - old token 이 와도 fallback 가능
  - new token 이면 template mode / instance mode 를 더 정확히 보존

### 4.10.2 payload 구조 확장

- [`widget/event/route.ts:35-41`](C:\dev\1227\mejai3\mejai\src\app\api\widget\event\route.ts#L35)
- event payload 안에도 `template_id`, `instance_id` 를 함께 넣는다.
- 운영 추적 시 “이 이벤트가 template widget 에서 왔는지 instance widget 에서 왔는지” 구분 가능

## 4.11 [`src/app/api/widget-instances/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\route.ts)

이 파일은 `instance_kind` 제거와 `creation_path` 도입이 가장 직접적으로 들어간 파일이다.

### 4.11.1 `creation_path` 계약 도입

- [`widget-instances/route.ts:6-12`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\route.ts#L6)
- `INSTANCE_SELECT` 에 `creation_path` 가 추가되었고, 허용값 집합 `CREATION_PATH_VALUES` 를 선언했다.
- 허용값:
  - `app_create_chat`
  - `api_widget_instances`
  - `legacy_unknown`

### 4.11.2 `creation_path` 정규화 함수 추가

- [`widget-instances/route.ts:56-68`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\route.ts#L56)
- `normalizeCreationPath()`:
  - body 에서 받은 값을 whitelist 로 정리
- `inferCreationPath()`:
  - 명시값이 있으면 그것을 사용
  - 없으면 `referer` / `origin` 을 읽어 `/app/create?tab=chat` 에서 온 요청이면 `app_create_chat`
  - 그 외는 `api_widget_instances`

즉, 서버가 생성 경로를 스스로 남길 수 있게 했다.

### 4.11.3 API 응답에서 `chat_policy` 제거

- [`widget-instances/route.ts:108-111`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\route.ts#L108)
- 응답 변환 함수 `mapInstanceRow()` 에서:
  - `chat_policy: null`
  - `creation_path: row.creation_path || null`

의미:
  - instance row 의 policy 를 서버 응답 계약에서 더 이상 의미 있는 값으로 취급하지 않음
  - 대신 생성 경로를 명시적으로 드러냄

### 4.11.4 shared 필터 제거

- 이 파일의 diff 상에서 기존 `isTemplateSharedInstance()` 기반 필터가 사라졌다.
- 이유:
  - shared instance 라는 개념 자체를 제거했기 때문

### 4.11.5 `POST /api/widget-instances` 의 의미 변경

- [`widget-instances/route.ts:251`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\route.ts#L251)
- 생성 전에 `creationPath = inferCreationPath(req, body.creation_path)` 를 만든다.
- [`widget-instances/route.ts:253-268`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\route.ts#L253)
- insert payload 에 `creation_path: creationPath` 를 넣는다.
- 중요한 제거점:
  - 더 이상 `instance_kind` 읽지 않음
  - 더 이상 `template_shared` 분기 없음
  - 더 이상 shared provisioning 없음
  - 더 이상 `chat_policy` 저장 없음

결론적으로 이 API 는 이제 “순수한 사용자 인스턴스 생성 API” 다.

## 4.12 [`src/app/api/widget-instances/[id]/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\[id]\route.ts)

### 4.12.1 select 항목 변경

- [`widget-instances/[id]/route.ts:6-7`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\[id]\route.ts#L6)
- `creation_path` 를 select 한다.

### 4.12.2 응답에서 `chat_policy` 제거

- [`widget-instances/[id]/route.ts:79-82`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\[id]\route.ts#L79)
- `chat_policy: null`, `creation_path: row.creation_path || null`

### 4.12.3 PATCH 의 의미

- [`widget-instances/[id]/route.ts:155`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\[id]\route.ts#L155)
- [`widget-instances/[id]/route.ts:210-214`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\[id]\route.ts#L210)
- update payload 에 `template_id`, `name`, `is_public`, `is_active`, `editable_id`, `usable_id` 만 들어간다.
- diff 기준으로 제거된 것:
  - `chat_policy` update
  - `RESERVED_INSTANCE_KIND`
  - `TEMPLATE_SHARED_INSTANCE_LOCKED`

### 4.12.4 DELETE 의 의미

- [`widget-instances/[id]/route.ts:239-282`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\[id]\route.ts#L239)
- shared lock 없이 일반 권한 검사 후 `is_active = false` 로 비활성화한다.
- 즉, 더 이상 “shared 라서 삭제 금지”라는 숨은 예외가 없다.

## 4.13 [`src/app/api/widgets/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widgets\route.ts)

이 파일은 관리자/설치 화면에서 template 설정을 읽는 API 다.

### 4.13.1 응답을 template-only 로 축소

- [`widgets/route.ts:23-36`](C:\dev\1227\mejai3\mejai\src\app\api\widgets\route.ts#L23)
- `mapTemplateToWidgetConfig()` 는 이제 template row 하나만 받는다.
- 응답 의미:
  - `template_public_key` 는 template 의 공개키
  - `instance_id: null`
  - `instance_public_key: null`
  - `shared_instance_status: "missing"`

`shared_instance_status` 문자열은 응답 shape 호환용으로만 남아 있고, 실제 shared row 를 찾지 않는다.

### 4.13.2 GET 에서 shared lookup 제거

- [`widgets/route.ts:71-72`](C:\dev\1227\mejai3\mejai\src\app\api\widgets\route.ts#L71)
- template 목록을 읽어서 그대로 `mapTemplateToWidgetConfig()` 한다.
- diff 기준으로 제거된 것:
  - `findTemplateSharedInstance()`
  - `instanceMap`
  - `statusMap`

### 4.13.3 POST 에서 template key 회전만 유지

- [`widgets/route.ts:99`](C:\dev\1227\mejai3\mejai\src\app\api\widgets\route.ts#L99)
- `rotateKey` 는 이제 template public key 회전만 의미한다.
- [`widgets/route.ts:136-140`](C:\dev\1227\mejai3\mejai\src\app\api\widgets\route.ts#L136) 와 [`widgets/route.ts:150`](C:\dev\1227\mejai3\mejai\src\app\api\widgets\route.ts#L150), [`widgets/route.ts:168`](C:\dev\1227\mejai3\mejai\src\app\api\widgets\route.ts#L168)
- 더 이상 shared instance 공개키를 돌리지 않는다.
- [`widgets/route.ts:181`](C:\dev\1227\mejai3\mejai\src\app\api\widgets\route.ts#L181)
- 최종 응답도 template 기반 item 하나만 내려준다.

## 4.14 [`src/app/api/widget-templates/[id]/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget-templates\[id]\route.ts)

### 4.14.1 핵심 변화

- [`widget-templates/[id]/route.ts:141-158`](C:\dev\1227\mejai3\mejai\src\app\api\widget-templates\[id]\route.ts#L141)
- template row 를 update 한 뒤 바로 응답한다.
- diff 기준으로 삭제된 것:
  - `provisionTemplateSharedInstance()`
  - `syncTemplateSharedInstance()`
  - shared sync 실패 시 `INSTANCE_SYNC_FAILED`

즉, 템플릿 저장은 이제 정말 “템플릿만 저장”한다.

## 4.15 [`src/app/api/widget-templates/[id]/chat-policy/route.ts`](C:\dev\1227\mejai3\mejai\src\app\api\widget-templates\[id]\chat-policy\route.ts)

### 4.15.1 핵심 변화

- [`widget-templates/[id]/chat-policy/route.ts:150-166`](C:\dev\1227\mejai3\mejai\src\app\api\widget-templates\[id]\chat-policy\route.ts#L150)
- `B_chat_widgets.chat_policy` update 후 바로 `{ ok: true }` 를 반환한다.
- 삭제된 것:
  - shared provisioning
  - shared sync

이 라우트도 더 이상 synthetic instance 를 만들지 않는다.

## 4.16 [`src/lib/widgetSharedInstance.ts`](C:\dev\1227\mejai3\mejai\src\lib\widgetSharedInstance.ts)

이 파일은 전체 삭제되었다.

삭제 이유는 명확하다.

- 이 파일 안에는 `TEMPLATE_SHARED_INSTANCE_KIND`, `SHARED_INSTANCE_MISSING_ERROR`, `findTemplateSharedInstance()`, `provisionTemplateSharedInstance()`, `syncTemplateSharedInstance()` 가 있었다.
- 즉, shared instance 개념 전체가 이 파일에 구현되어 있었다.
- 설계상 이 개념이 잘못된 것이므로 파일 자체를 제거했다.

삭제 효과:

- 템플릿 위젯은 hidden shared row 를 더 이상 찾지 않는다.
- template save 가 synthetic instance 를 더 이상 만들지 않는다.
- server code search 에서 shared helper import 가 사라진다.

## 5. 이번 반영으로 실제로 어떻게 동작하는가

## 5.1 `/login` 템플릿 위젯

이제 `/login` 의 template widget 은 아래처럼 작동한다.

1. 브라우저가 [`widget/config/route.ts:91-106`](C:\dev\1227\mejai3\mejai\src\app\api\widget\config\route.ts#L91) 로 template row 를 직접 읽는다.
2. `widget/config` 는 hidden instance 가 없어도 `B_chat_widgets` row 만 있으면 응답한다.
3. 브라우저가 [`widget/init/route.ts:125-137`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L125) 로 template row 를 다시 읽는다.
4. 세션 metadata 에는 [`widget/init/route.ts:196-197`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L196) 기준으로 `template_id` 가 들어가고 `widget_instance_id` 는 `null` 이다.
5. token 은 [`widget/init/route.ts:219-222`](C:\dev\1227\mejai3\mejai\src\app\api\widget\init\route.ts#L219) 기준으로 `template_id` 만 가진 template mode token 으로 발급된다.
6. chat/stream/history/logs/sessions/event 라우트는 token helper 를 통해 template mode 로 처리한다.

그래서 더 이상 `SHARED_INSTANCE_MISSING` 이 나올 이유가 없다.

## 5.2 사용자가 만든 widget instance

이제 instance 는 아래처럼 작동한다.

1. 사용자가 [`widget-instances/route.ts:253-268`](C:\dev\1227\mejai3\mejai\src\app\api\widget-instances\route.ts#L253) 로 instance 를 만든다.
2. 서버는 `template_id`, `public_key`, `editable_id`, `usable_id`, `creation_path` 를 저장한다.
3. runtime 에서는 token 의 `instance_id` 로 instance row 를 읽는다.
4. 하지만 policy 본문은 template row 에서 읽는다.

즉, instance 는 “template 를 대신하는 숨은 시스템 객체”가 아니라 “template 를 참조하는 사용자 자산”이 된다.

## 6. 아직 반영하지 않은 것

## 6.1 UI 미수정

- [`WidgetInstallPanel.tsx:145`](C:\dev\1227\mejai3\mejai\src\components\settings\WidgetInstallPanel.tsx#L145)
- 현재도 request body 에 `instance_kind: "template_shared"` 문자열이 들어간다.
- 하지만 서버는 이제 그 값을 읽지 않는다.
- 이 문자열을 화면에서 제거하는 작업은 사용자 지침상 별도 확인 후 진행해야 한다.

## 6.2 DB 미적용

- instance API 는 이미 `creation_path` 를 사용하도록 구현되었다.
- 하지만 실제 테이블에는 이 컬럼이 아직 없다.
- 따라서 [`creation_path.sql`](C:\dev\1227\mejai3\mejai\docs\creation_path.sql) 을 사용자가 먼저 실행해야 한다.

## 7. 결론

이번 서버 반영의 핵심은 아래 한 문장으로 요약된다.

“템플릿은 `B_chat_widgets` 로 직접 동작하고, 인스턴스는 `B_chat_widget_instances` 의 explicit 사용자 row 로만 동작하도록 계약을 되돌렸다.”

이 결과로 실제로 달라진 것은 아래다.

- `/login` 템플릿 위젯이 hidden shared row 없이 동작한다.
- `instance_kind` 는 더 이상 서버 기능 분기가 아니다.
- `template_shared` synthetic row 자동 생성 경로가 제거되었다.
- runtime policy source 는 template 하나로 고정되었다.
- instance 생성 경로는 `creation_path` 로 추적 가능하게 준비되었다.


# B_chat_widgets.chat_policy UI 미설정 항목 점검 (DB 실데이터 기반)
작성일: 2026-03-11  
대상 UI: `http://localhost:3000/app/conversation` (pageKey: `/embed`)

## DB 확인 결과
조회 대상 템플릿:
- `0f06752b-c7c7-4dcf-89f1-d6e3ad829cbc` (user widget)
- `861270ce-f2b3-43cb-a2cd-b617d48b9f58` (New Widget Template)
- `c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc` (login)

아래 목록은 **실제 DB에 존재**하면서 `/app/conversation` UI에서 설정할 수 없는 항목입니다.

## UI 미설정 항목과 삭제 영향 (DB 실존)
형식: `path / 패턴` — 포함 템플릿 — 삭제 영향

1. `debug`  
   - 포함: 3건 모두  
   - 영향: 대화 복사/디버그 출력 옵션 기본값 처리에 사용됩니다. 삭제 시 디버그 옵션이 기본값으로 복귀합니다.

2. `debug_copy./embed`  
   - 포함: 3건 모두  
   - 영향: 페이지별 디버그 복사 옵션입니다. 삭제 시 `/embed` 디버그 복사 설정이 기본값으로 복귀합니다.

3. `widget.name` / `widget.is_active`  
   - 포함: `0f06752b...`  
   - 영향: 위젯 표시 이름/활성 상태 보강용 값입니다. 삭제 시 일부 UI에서 name/is_active 보강이 누락될 수 있습니다(테이블 컬럼만 남음).

4. `widget.theme.greeting` / `widget.theme.input_placeholder`  
   - 포함: `0f06752b...`  
   - 영향: 위젯 테마(인삿말/입력 안내) 기본값입니다. 삭제 시 테마 기본값이 사라져 런타임 UI 기본값으로 복귀할 수 있습니다.

5. `widget.theme.allowed_accounts`  
   - 포함: `c9ab5088...`  
   - 영향: 테마 확장 필드입니다. 삭제 시 테마 제어(허용 계정) 로직이 있을 경우 기본값으로 복귀합니다.

6. `widget.access.allowed_paths` / `widget.access.allowed_domains`  
   - 포함: `0f06752b...`, `c9ab5088...`  
   - 영향: 위젯 접근 제어 목록입니다. 삭제 시 접근 제한이 풀리거나 기본 접근 정책으로 복귀할 수 있습니다.

7. `widget.allowed_paths` / `widget.allowed_domains`  
   - 포함: `0f06752b...`  
   - 영향: legacy 접근 제어 필드입니다. 삭제 시 접근 제한이 기본값으로 복귀합니다.

8. `widget.setup_config.*`  
   - 포함: `0f06752b...`, `c9ab5088...` (다른 템플릿은 `null`)  
   - 영향: 위젯 기본 setup_config(에이전트/KB/MCP/LLM)입니다. 삭제 시 기본 선택값이 사라져 초기 설정/런타임 동작이 달라질 수 있습니다.  
   - 실제 존재 키:  
     - `widget.setup_config.agent_id`  
     - `widget.setup_config.kb.mode`, `kb.kb_id`, `kb.admin_kb_ids`  
     - `widget.setup_config.mcp.tool_ids`, `mcp.provider_keys`  
     - `widget.setup_config.llm.default`

9. `features.mcp.*`  
   - 포함: 3건 모두 (`login`에는 allow/deny 값 존재)  
   - 영향: MCP 선택 UI 및 allow/deny 정책입니다. UI는 `setup.mcp*`로만 편집되며 `features.mcp.*`는 노출되지 않습니다. 삭제 시 MCP 오버라이드가 기본값으로 복귀할 수 있습니다.  
   - 실제 존재 키(예): `features.mcp.tools.allowlist/denylist`, `features.mcp.providers.allowlist/denylist`

10. `pages./embed.mcp.*`  
    - 포함: 3건 모두 (`login`에 allow/deny 값 존재)  
    - 영향: `/embed` 페이지의 MCP 오버라이드입니다. UI에서 직접 편집할 수 없어 삭제 시 기본값으로 복귀합니다.

11. `features.setup.defaultSetupMode` / `pages./embed.setup.defaultSetupMode`  
    - 포함: `0f06752b...`, `c9ab5088...`  
    - 영향: UI에 없는 필드입니다. 삭제 시 기본 setup 모드 결정이 런타임 기본값으로 복귀합니다.

12. `features.interaction.prefill` / `pages./embed.interaction.prefill`  
    - 포함: 3건 모두  
    - 영향: 초기 안내 prefill on/off 토글입니다. UI에는 `prefillMessages`만 있어 설정 불가입니다. 삭제 시 기본 prefill 동작으로 복귀합니다.

13. `features.interaction.widgetHeaderAgentAction` / `features.interaction.widgetHeaderNewConversation` / `features.interaction.widgetHeaderClose`  
    - 포함: 3건 모두  
    - 영향: 위젯 헤더 버튼 on/off 입니다. UI에 토글이 없습니다. 삭제 시 기본 헤더 버튼 동작으로 복귀합니다.

14. `pages./embed.interaction.widgetHeaderAgentAction` / `pages./embed.interaction.widgetHeaderNewConversation` / `pages./embed.interaction.widgetHeaderClose`  
    - 포함: 3건 모두  
    - 영향: `/embed` 페이지 헤더 버튼 on/off 오버라이드입니다. 삭제 시 기본값으로 복귀합니다.

15. `features.widget.launcher` / `pages./embed.widget.launcher`  
    - 포함: `c9ab5088...` (다른 템플릿은 null)  
    - 영향: 런처 on/off 플래그입니다. UI에는 해당 토글이 없습니다. 삭제 시 기본 런처 노출 정책으로 복귀합니다.

16. `features.widget.chatPanel` / `features.widget.historyPanel` / `features.widget.setupPanel`  
17. `pages./embed.widget.chatPanel` / `pages./embed.widget.historyPanel` / `pages./embed.widget.setupPanel`  
    - 포함: 3건 모두  
    - 영향: 위젯 패널 on/off 플래그입니다. UI에 해당 토글이 없습니다. 삭제 시 기본 패널 노출 정책으로 복귀합니다.

18. `features.visibility.mcp.*` / `pages./embed.visibility.mcp.*`  
    - 포함: 3건 모두  
    - 영향: MCP 가시성(public/user/admin) 정책입니다. UI에 해당 가시성 토글이 없습니다. 삭제 시 기본 가시성 정책으로 복귀합니다.

19. `features.visibility.interaction.prefill`  
20. `features.visibility.interaction.widgetHeaderAgentAction`  
21. `features.visibility.interaction.widgetHeaderNewConversation`  
22. `features.visibility.interaction.widgetHeaderClose`  
23. `pages./embed.visibility.interaction.prefill`  
24. `pages./embed.visibility.interaction.widgetHeaderAgentAction`  
25. `pages./embed.visibility.interaction.widgetHeaderNewConversation`  
26. `pages./embed.visibility.interaction.widgetHeaderClose`  
    - 포함: 3건 모두  
    - 영향: interaction 일부 항목의 가시성 정책입니다. UI에 해당 가시성 토글이 없습니다. 삭제 시 기본 가시성 정책으로 복귀합니다.

27. `features.visibility.widget.chatPanel` / `features.visibility.widget.historyPanel` / `features.visibility.widget.setupPanel`  
28. `pages./embed.visibility.widget.chatPanel` / `pages./embed.visibility.widget.historyPanel` / `pages./embed.visibility.widget.setupPanel`  
    - 포함: 3건 모두  
    - 영향: 위젯 패널 가시성 정책입니다. UI에 해당 가시성 토글이 없습니다. 삭제 시 기본 가시성 정책으로 복귀합니다.

## 중복/불필요로 보이는 구조 (요청 사항 반영)
요청 주신 “페이지 개념 불필요” 관점에서는 아래가 중복입니다.

1. `pages./embed.*` 전체 vs `features.*`  
   - 실제 DB에 동일한 내용이 중복 저장되어 있습니다.  
   - 영향(삭제 시): 코드 상 `pages./embed`가 우선 적용되며 없으면 `features`가 사용됩니다. `pages./embed`를 제거하면 `features`가 동일한 정책을 이어받아 **동작은 동일**할 가능성이 높습니다.

2. `widget.access.*` vs `widget.allowed_*`  
   - 접근 제어가 중복 저장되어 있습니다.  
   - 영향(삭제 시): **현재 서비스 코드에서 `allowed_*`/`widget.access.*`를 사용하지 않음**이 확인되어 삭제 영향이 없습니다. (아래 “실제 서비스 오버라이드 정책” 참고)

## 실제 서비스 오버라이드 정책 (코드 기준)
서비스의 위젯 정책 오버라이드는 다음 경로로만 처리됩니다.

1. 오버라이드 입력 형식 (허용 키)
   - `name`, `agent_id`, `theme`, `setup_config`, `chat_policy`만 수용합니다.  
   - 근거: `normalizeWidgetOverrides`가 위 키만 추출합니다.  
   - 파일: `src/lib/widgetTemplateMeta.ts`

2. 오버라이드 적용/필터링
   - `filterWidgetOverridesByPolicy`가 현재 정책(`chat_policy`)을 기준으로 에이전트/KB/MCP/LLM 오버라이드 허용 여부를 제한합니다.  
   - 파일: `src/lib/widgetRuntimeConfig.ts`

3. 실제 런타임 적용 경로
   - `/api/widget/config`, `/api/widget/init`, `/api/widget/chat`, `/api/widget/stream`에서 동일 로직으로 오버라이드를 적용합니다.  
   - 파일: `src/app/api/widget/*/route.ts`, `src/lib/widgetRuntimeConfig.ts`

### 삭제 영향 평가 (오버라이드 정책 기준)
1. `widget.allowed_domains`, `widget.allowed_paths`, `widget.access.allowed_domains`, `widget.access.allowed_paths`
   - **실제 서비스 코드에서 참조하지 않습니다.** (`src` 전체 검색 결과: 없음)
   - 오버라이드 입력에도 포함되지 않으므로, 서비스 런타임 동작에 영향이 없습니다.

2. `pages./embed.*` vs `features.*`
   - 런타임은 `resolveConversationPageFeatures`에서 페이지별 오버라이드를 병합합니다.  
   - `pages./embed`를 삭제해도 `features`가 동일 값을 가지고 있다면 동작은 유지됩니다.

3. `settings_ui.*`, `feature_labels.*`
   - UI 라벨/정렬 전용입니다. 런타임 동작에는 직접 영향이 없습니다.

필요 시 위 중복 항목을 정리하는 정합성 기준(“단일 소스 경로”)를 먼저 확정한 뒤 일괄 제거하는 것을 권장합니다.

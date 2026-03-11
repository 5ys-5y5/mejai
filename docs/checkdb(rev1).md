# B_chat_widgets.chat_policy 삭제 대상 (rev1)
작성일: 2026-03-11  
기준 페이지: `/app/conversation` (pageKey: `/embed`)

## 적용 관점(요청 사항)
1. `/app/conversation`에서 **설정 가능한 항목만** `B_chat_widgets.chat_policy`에 저장한다.
2. **페이지별 오버라이드**는 설치 코드에서만 관리하고, DB에는 저장하지 않는다.
3. 서비스 코드가 **chat_policy와 무관하게 고정값**을 쓰는 항목은 DB에서 관리하지 않는다.

## 서비스 오버라이드 정책 요약 (코드 기준)
오버라이드 입력은 `name`, `agent_id`, `theme`, `setup_config`, `chat_policy`만 허용됩니다.  
`allowed_*` 및 `widget.access.*`는 서비스 코드에서 참조하지 않으므로 삭제 영향이 없습니다.

## 삭제 대상 (패턴)
아래 항목은 DB에서 제거해야 합니다. 괄호는 실데이터 존재 템플릿입니다.

1. `pages.*` 전체  
   - 이유: 페이지별 오버라이드 제거 정책.  
   - 실존: 3건 모두 (`pages./embed.*`).

2. `debug`, `debug_copy.*`  
   - 이유: `/app/conversation`에서 설정 불가.  
   - 실존: 3건 모두.

3. `widget.name`, `widget.is_active`  
   - 이유: 서비스는 `B_chat_widgets.name/is_active` 컬럼을 사용함. chat_policy 값은 무시됨.  
   - 실존: `0f06752b-c7c7-4dcf-89f1-d6e3ad829cbc`.

4. `widget.access.*`, `widget.allowed_paths`, `widget.allowed_domains`  
   - 이유: 서비스 코드에서 미사용.  
   - 실존:  
     - `widget.access.*`: `0f06752b...`, `c9ab5088...`  
     - `widget.allowed_*`: `0f06752b...`

5. `widget.setup_config.*` 및 `widget.agent_id`  
   - 이유: `/app/conversation`에서 숨김(설정 불가).  
   - 실존: `0f06752b...`, `c9ab5088...`

6. `widget.theme.greeting`, `widget.theme.input_placeholder`, `widget.theme.allowed_accounts`  
   - 이유: `/app/conversation`에서 설정 불가.  
   - 실존:  
     - `greeting/input_placeholder`: `0f06752b...`  
     - `allowed_accounts`: `c9ab5088...`

7. `features.mcp.*`  
   - 이유: UI는 `setup.mcpProviderSelector/mcpActionSelector`만 편집. `features.mcp.*`는 미노출.  
   - 실존: 3건 모두.

8. `features.interaction.prefill`  
   - 이유: UI 미노출. `prefillMessages`만 편집됨.  
   - 실존: 3건 모두.

9. `features.interaction.widgetHeaderAgentAction`  
10. `features.interaction.widgetHeaderNewConversation`  
11. `features.interaction.widgetHeaderClose`  
   - 이유: UI 미노출.  
   - 실존: 3건 모두.

12. `features.widget.launcher`  
13. `features.widget.chatPanel`  
14. `features.widget.historyPanel`  
15. `features.widget.setupPanel`  
   - 이유: UI 미노출.  
   - 실존: 3건 모두(일부 null 포함).

16. `features.visibility.mcp.*`  
   - 이유: UI 미노출.  
   - 실존: 3건 모두.

17. `features.visibility.interaction.prefill`  
18. `features.visibility.interaction.widgetHeaderAgentAction`  
19. `features.visibility.interaction.widgetHeaderNewConversation`  
20. `features.visibility.interaction.widgetHeaderClose`  
   - 이유: UI 미노출.  
   - 실존: 3건 모두.

21. `features.visibility.widget.chatPanel`  
22. `features.visibility.widget.historyPanel`  
23. `features.visibility.widget.setupPanel`  
   - 이유: UI 미노출.  
   - 실존: 3건 모두.

24. `features.setup.defaultSetupMode`  
   - 이유: UI 미노출.  
   - 실존: `0f06752b...`, `c9ab5088...`.

25. `settings_ui.*` 전체  
    - 이유: 페이지 개념 제거 정책. UI 라벨/정렬은 DB에 저장하지 않음.  
    - 실존: 3건 모두.

## 유지 대상 (UI에서 설정 가능)
아래 항목은 `/app/conversation`에서 설정 가능하므로 유지합니다.

1. `features.setup.*`  
2. `features.adminPanel.*`  
3. `features.interaction.*` 중 UI에서 노출되는 항목  
4. `features.widget.header.*`, `features.widget.tabBar.*`, `features.widget.defaultTab`  
5. `features.visibility.*` 중 UI에서 가시성 토글이 있는 항목  
6. `widget.entry_mode`, `widget.embed_view`, `widget.cfg.*`, `widget.theme.launcher_logo_id`, `widget.theme.primary_color`, `widget.theme.launcher_bg`, `widget.launcher.*`, `widget.iframe.*`  
7. (삭제됨) `settings_ui.*`는 rev1 정책에 따라 제거 대상에 포함됨.

## 결론
현재 DB의 `chat_policy`는 `/embed` 페이지 구조가 중복 저장되고 있으며, 실제 UI에서 설정 불가한 값이 다수 포함돼 있습니다.  
위 “삭제 대상(패턴)”을 기준으로 정리하면, UI-설정 항목만 남게 됩니다.

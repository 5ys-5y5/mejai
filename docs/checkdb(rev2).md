# checkdb rev2: 중복 정의 이슈 점검
작성일: 2026-03-11  
대상 UI: `/app/conversation`

요청 사항:
- “중복 정의” 때문에 잘못 삭제된 항목이 있는지 식별하고,
- **어떤 키를 기준(정의)으로 유지**해야 하는지 명확히 기록.

## 중복 정의 이슈 목록 (문제 가능)
형식: `중복 키` → `정의(정상) 키` / 영향

1. `widget.agent_id` → `widget.setup_config.agent_id`
   - 설명: `widget.agent_id`는 legacy이며, 정식 정의는 `widget.setup_config.agent_id`.
   - 영향: `widget.agent_id`만 삭제하면 **정상**, 하지만 `widget.setup_config.agent_id`까지 삭제하면 UI에서 설정한 에이전트가 소실됨.
   - 조치: `widget.agent_id`는 삭제 대상, `widget.setup_config.agent_id`는 **유지 대상**.

2. `setup_config (root)` → `widget.setup_config`
   - 설명: legacy root 필드가 widget 하위로 병합됨.
   - 영향: root만 남기거나 widget만 남기지 않으면 일부 런타임에서 값 누락 가능.
   - 조치: `widget.setup_config`만 유지, root `setup_config`는 삭제 대상.

3. `theme / cfg / launcher / iframe (root)` → `widget.theme / widget.cfg / widget.launcher / widget.iframe`
   - 설명: legacy root 필드를 widget 하위로 병합하는 로직이 존재.
   - 영향: widget 하위 제거 시 UI/런타임 테마 및 레이아웃 설정 손실.
   - 조치: `widget.*`만 유지, root 필드는 삭제 대상.

4. `setup_ui.*` → `settings_ui.*`
   - 설명: legacy `setup_ui`를 `settings_ui.setup_fields`로 이관하는 흐름이 존재.
   - 영향: 둘 중 하나만 유지해야 함.
   - 조치:
     - **페이지 개념 제거 정책**이면 `settings_ui.*`도 제거 대상.  
     - 페이지 개념 유지 시 `settings_ui.*`만 유지, `setup_ui.*`는 삭제 대상.

5. `pages./embed.*` → `features.*`
   - 설명: `/embed` 페이지 오버라이드는 `pages./embed`에 저장되지만, 기본 정의는 `features`.
   - 영향: `pages./embed` 삭제 시에도 `features`가 동일 값을 가지면 동작 유지.
   - 조치: 페이지 개념 제거 정책이라면 `pages.*`는 삭제 대상, `features.*`는 유지 대상.

6. `widget.name / widget.is_active` → `B_chat_widgets.name / B_chat_widgets.is_active`
   - 설명: 정책 내 name/is_active는 보강용. 실제 서비스는 테이블 컬럼 기준.
   - 영향: 정책 값 삭제해도 서비스 동작에는 영향 없음.
   - 조치: `widget.name`, `widget.is_active`는 삭제 대상.

7. `widget.allowed_paths / widget.allowed_domains` ↔ `widget.access.allowed_paths / widget.access.allowed_domains`
   - 설명: 서로를 보강하는 legacy 구조였으나 현재 서비스 코드에서 **미사용**.
   - 영향: 둘 다 제거해도 런타임 동작 영향 없음.
   - 조치: 둘 다 삭제 대상.

## 결론
중복 정의 이슈 중 **실제 기능 손실로 이어지는 항목은 `widget.setup_config.*` 계열**입니다.  
따라서 `widget.agent_id`를 삭제하는 것은 맞지만, **`widget.setup_config.agent_id`는 반드시 유지**해야 합니다.

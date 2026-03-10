# widgetOverride 설계

**작성일**: 2026-03-10  
**목표 요약**: `/app/install`에서 복사한 설치 코드를 그대로 붙여넣어도, `div` 컨테이너를 지정하고 `/app/conversation`에서 설정 가능한 **전체 항목**을 파라미터로 전달해 `http://localhost:3000/` 및 `http://localhost:3000/login`에 보이는 위젯 UI를 동일하게 재현할 수 있게 한다.

**현재 상태 요약**
1. `/app/install`의 설치 코드는 `widget.js` 런처 방식이다. 기본 동작은 `document.body`에 런처 버튼 + iframe을 붙인다.
2. `http://localhost:3000/`와 `http://localhost:3000/login`은 iframe로 `/embed/...` 페이지를 직접 삽입하는 방식이다.
3. 설치 코드에서 `div` 컨테이너 마운트와 UI 설정 전체를 전달하는 방식이 직접 지원되지 않는다.
4. `/app/conversation`에는 설치 방식/탭/런처/정책/테마 등 다양한 UI/동작 설정이 존재하며, **해당 전체 항목**이 파라미터로 주입되어야 한다.
5. “Overrides (JSON)”은 템플릿 설정을 덮어쓰는 용도로 설계되어 있으며, `encodeWidgetOverrides`로 전달된다. **목표는 `/app/conversation` 전체 항목을 수용하는 범용 스키마**이며, 필요 시 확장한다.

---

**실행 정책 (필수 준수)**
1. 수정 적용 전, 현재 요청에 대한 이해 내용을 목록으로 정리한다.
2. 이해 내용이 사용자와 일치한다는 명시적 확정을 받은 뒤에만 수정한다.
3. 화이트리스트(수정 허용 파일 목록)를 사전에 확정한다. 목록 외 파일 수정이 필요하면 즉시 중단하고 승인을 받는다.
4. 코드 수정이 있는 경우, 수정 직전 상태를 `docs/diff`에 반드시 기록한다.
5. 변경은 계약/의도 수준에서 일반화되도록 설계하고, 단일 화면만 고치는 핫픽스는 금지한다.
6. 공통 UI 정의는 `src/components`의 단일 정의를 수정하고, 상위 컴포넌트에서 재사용한다.
7. 구현 중에는 기능 범위를 넘는 변경을 금지한다.
8. 변경 후 `npm run build`를 실행하고, 오류가 있으면 즉시 해결한다.
9. 매 실행마다 `supabase` MCP와 `chrome-devtools` MCP로 의도대로 동작하는지 확인한다.
10. 테스트 수행/결과는 문서 하단 체크리스트와 테스트 기록에 반드시 남긴다.

---

**수정 허용 화이트리스트 (확정 전용)**
1. `docs/widgetOverride.md`
2. `docs/diff/2026-03-10_widget-install-embed/README.md`
3. `src/components/design-system/widget/WidgetUI.parts.tsx`
4. `src/components/settings/WidgetInstallPanel.tsx`
5. `public/widget.js`
6. `src/app/login/LoginClient.tsx`
7. `src/components/landing/home-widget-install-box.tsx`

화이트리스트 외 파일이 필요하면 반드시 승인 후 추가한다.

---

**설계 목표**
1. 설치 코드만으로 `mount 대상 div`를 지정할 수 있어야 한다.
2. 지정된 div의 스타일을 그대로 유지한 채 위젯을 표시해야 한다.
3. 설치 코드에서 `/app/conversation`에서 설정 가능한 **전체 항목**을 전달해 UI를 변경할 수 있어야 한다.
4. 기존 런처 설치 방식은 그대로 유지되어야 한다. (하위 호환)
5. 보안상의 이유로 **HTML 문서 내 직접 수정은 불가**하고, **페이지 구현 코드에서만 파라미터를 주입**해 UI 변경이 가능해야 한다.

---

**계약 변경 (Contract)**
설치 코드는 `/app/conversation`에서 설정 가능한 **전체 항목**을 전달할 수 있어야 한다.  
설정 payload는 **HTML data-*가 아니라 `window.mejaiWidget`에서만** 수용한다.  
아래 항목은 **비제한 예시/원칙**이며, 특정 키로 범위를 제한하지 않는다.

1. **식별자/인증**
   - `instance_id`, `public_key`, `template_id` (또는 `widget_id` 기반)
   - 이 항목만 `data-*`에서 허용한다.
2. **설정 payload (전체)**
   - `/app/conversation`에서 설정 가능한 **전체 항목**을 포함하는 객체
   - 전송 위치: `window.mejaiWidget` 내부
   - 전송 방식: `encodeWidgetOverrides`로 인코딩해 `ovr` 파라미터 및 init 메시지로 전달
   - 특정 키(예: `entry_mode`, `mount_target`, `tab`)는 전체 설정 중 일부이며, **목록은 제한이 아니다**.

---

**보안 제약: 파라미터 입력 경로**
1. UI/설치 방식 변경에 영향을 주는 **모든 설정 payload**는 **HTML data-*에서 읽지 않는다.**
2. 위 설정은 **페이지 구현 코드가 설정한 `window.mejaiWidget`만 신뢰**한다.
3. `data-*` 속성은 **식별자(예: instance_id, public_key, template_id)**만 허용한다.
4. 내부 페이지(`/`, `/login`)는 **React 코드에서만 파라미터를 주입**한다.

설치 코드 예시:
```html
<div id="login-policy-box" style="height: 210px; border: 1px solid #e2e8f0; border-radius: 16px;"></div>
<script>
  window.mejaiWidget = {
    instance_id: "INSTANCE_ID",
    public_key: "PUBLIC_KEY",
    template_id: "TEMPLATE_ID",
    overrides: {
      /* /app/conversation 전체 설정 JSON (예시) */
      entry_mode: "embed",
      mount_target: "#login-policy-box",
      tab: "policy",
      /* 그 외 모든 설정 항목 ... */
    }
  };
</script>
<script
  async
  src="http://localhost:3000/widget.js"
  data-instance-id="INSTANCE_ID"
  data-public-key="PUBLIC_KEY"
  data-template-id="TEMPLATE_ID"
></script>
```

---

**동작 규칙 (Embed 모드)**
1. 설정 payload 내 `entry_mode === "embed"` 또는 `mount_target`가 제공되면 embed 모드로 처리한다. (예시)
2. embed 모드에서는 런처 버튼을 렌더링하지 않는다.
3. iframe은 항상 열림 상태(`defaultOpen = true`)이며 토글 비활성(`disableToggle = true`)이다.
4. iframe의 크기는 컨테이너에 맞춘다. `width: 100%`, `height: 100%`가 기본이다.
5. 컨테이너의 기존 스타일을 덮어쓰지 않는다. 필요한 경우 `position: relative`만 보정한다.
6. 설정 payload 내 `tab`은 `buildWidgetEmbedSrc(..., tab)`으로 전달한다. (예시)
7. 그 외 `/app/conversation` 전체 항목도 동일하게 payload에서 읽어 적용한다. (제한 없음)
7. `overrides`는 `ovr` 파라미터 및 init 메시지에 동시에 전달한다.

---

**오버라이드 설계 (Overrides)**
1. 설치 코드의 `overrides`는 템플릿 기본값을 덮어쓴다.
2. overrides 범위는 **`/app/conversation`에서 설정 가능한 전체 항목**이어야 하며, 현재 `WidgetOverrides`는 이에 맞게 확장한다.
3. 예: on/off 항목은 `chat_policy` 기반의 `ConversationFeaturesProviderShape`를 허용한다.
4. `/app/conversation`에서 사용하는 Overrides 입력과 동일한 JSON 구조를 유지한다.
5. 서버에서의 병합 규칙은 기존 정책 로직을 그대로 사용한다.

---

**구현 계획 (단계별)**
1. `WidgetUI.parts.tsx`에 embed 모드 지원을 추가한다.
2. `mountWidgetLauncher`가 **전체 설정 payload**를 **`window.mejaiWidget`에서만** 읽고 런처/임베드 모드를 분기한다.
3. embed 모드 전용 렌더링을 추가하고, 컨테이너 스타일을 보존한다.
4. `WidgetInstallPanel`에 `/app/conversation` 전체 설정을 포함한 설치 코드 출력을 추가한다. (파라미터는 코드 생성으로만 입력)
5. `LoginClient.tsx`와 `home-widget-install-box.tsx`를 설치 코드 기반 embed로 전환하되 UI 레이아웃은 유지한다.
6. `npm run build` 실행 후 오류가 있으면 즉시 해결한다.
7. MCP 테스트 2종을 수행하고 결과를 기록한다.

---

**롤백 및 변경 기록**
1. 변경 전 대상 파일의 원본을 `docs/diff/2026-03-10_widget-install-embed/`에 저장한다.
2. 파일당 1개 원본 스냅샷을 남긴다. 파일명은 원본 경로를 알 수 있게 기록한다.
3. 수정 실패 시 해당 스냅샷을 기준으로 즉시 복구한다.

---

**테스트 계획 (MCP 필수)**
1. `supabase` MCP로 스키마 접근 가능 여부 확인.
2. `chrome-devtools` MCP로 `http://localhost:3000/app/install` 페이지 렌더링 확인.
3. 설치 코드 복사 후 지정한 `div`에서 embed 모드 렌더링 여부 확인.
4. 전체 설정 중 일부(예: `tab`) 변경 시 실제 UI에 반영되는지 확인. (예시)
5. `/app/conversation` 전체 설정 변경이 실제 UI에 반영되는지 확인.

---

**테스트 기록**
1. 2026-03-10 1차: `supabase` MCP `list_tables` 실행 성공.
2. 2026-03-10 1차: `chrome-devtools` MCP `http://localhost:3000/app/install` 페이지 스냅샷 로드 성공.
3. 2026-03-10 2차: `supabase` MCP `list_tables` 실행 성공.
4. 2026-03-10 2차: `chrome-devtools` MCP `http://localhost:3000/app/install` 페이지 스냅샷 로드 성공.
5. 2026-03-10 3차: `supabase` MCP `list_tables` 실행 성공.
6. 2026-03-10 3차: `chrome-devtools` MCP `http://localhost:3000/app/install` 페이지 스냅샷 로드 성공.
7. 2026-03-10 4차: `supabase` MCP `list_tables` 실행 성공.
8. 2026-03-10 4차: `chrome-devtools` MCP `http://localhost:3000/app/install` 페이지 스냅샷 로드 성공.
9. 2026-03-10 5차: `supabase` MCP `list_tables` 실행 성공.
10. 2026-03-10 5차: `chrome-devtools` MCP `http://localhost:3000/` 페이지 스냅샷 로드 성공.
11. 2026-03-10 5차: `chrome-devtools` MCP `http://localhost:3000/login` 페이지 스냅샷 로드 성공.
12. 2026-03-10 6차: `supabase` MCP `list_tables` 실행 성공.
13. 2026-03-10 6차: `chrome-devtools` MCP `http://localhost:3000/` 페이지 위젯 iframe 로드 확인.
14. 2026-03-10 6차: `chrome-devtools` MCP `http://localhost:3000/login` 페이지 위젯 iframe 로드 확인.

---

**체크리스트**
- [x] 이해확정 절차 완료
- [x] 화이트리스트 확정
- [x] MCP 테스트 수행 및 기록
- [x] 변경 전 스냅샷 기록
- [x] 코드 변경 적용
- [x] `npm run build` 실행
- [x] 최종 테스트 기록 업데이트

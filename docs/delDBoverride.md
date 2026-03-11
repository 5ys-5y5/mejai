# DB Override 제거 설계 (delDBoverride)

## 수정 전 이해확정 절차 (반드시 실행)
아래 이해 목록을 **사용자가 명시적으로 확정**한 뒤에만 실제 코드 수정을 시작한다.
1. `home-widget-install-box.tsx`의 **baseConfig 오버라이드**와 **URL 파라미터 오버라이드**는 유지한다.
2. DB(`B_chat_widgets.chat_policy`)에 **pages 하위 오버라이드 저장을 금지**한다.
3. 서비스 런타임에서 **DB pages 오버라이드 기능을 사용하지 않도록** 한다.
4. 기존 기능(위젯 표시/탭/헤더/인터랙션/설정 UI) 파괴 없이 진행한다.
5. DB에 대한 수정이 필요한 경우, **SQL 쿼리는 제공만 하고 사용자가 직접 실행**한다.

## 수정 허용 화이트리스트 (필수 확정 필요)
현재 사용자 요청에 **화이트리스트가 비어 있음**. 수정 계획 수립을 위해 아래 후보를 제안한다.
사용자가 **명시적으로 승인**해야 이후 진행 가능.

제안 파일 목록 (필수 최소 범위):
1. `src/components/landing/home-widget-install-box.tsx`
   - baseConfig/URL override 유지 로직 확인 및 문서화
2. `src/app/login/LoginClient.tsx`
   - URL override 유지 로직 확인 및 문서화
3. `src/components/conversation/ChatSettingsPanel.tsx`
   - `pages` 저장 제거 (DB 저장 payload에서 pages 제외)
4. `src/app/app/conversation/page.tsx`
   - 저장 요청 payload에서 pages 제거 확인
5. `src/lib/conversation/pageFeaturePolicy.ts`
   - `pages` 오버라이드가 DB에서 로드/적용되지 않도록 정책 적용 경로 수정
6. `src/lib/widgetChatPolicyShape.ts`
   - DB에서 `pages`를 읽지 않도록 normalize/shape 조정
7. `src/app/embed/[key]/page.tsx`
   - runtime이 DB pages를 쓰지 않도록 적용 경로 확인 및 필요시 수정
8. `src/app/api/widget-templates/[id]/chat-policy/route.ts`
   - DB 저장 시 pages 차단(요청 payload에서 제거)
9. `src/app/api/widget-templates/[id]/route.ts`
   - 템플릿 업데이트 시 pages 차단
10. `src/app/api/widget-templates/route.ts`
   - 템플릿 생성 시 pages 차단

※ 위 목록은 **폴더 단위 제안 금지** 조건을 준수한 개별 파일 제안이다.

## 변경 기록 및 롤백 보장 (필수 절차)
- **모든 수정 전**, 변경 대상 파일의 원본을 `docs/diff/`에 저장한다.
- 저장 형식: 파일 전체 텍스트를 `docs/diff/<원본경로를_언더스코어로>.txt`로 기록.
- 이 기록이 없으면 수정 진행 금지.

## 설계 목표
- DB에는 `pages` 하위 항목을 **저장하지 않는다**.
- 런타임은 DB `pages` 오버라이드가 **없다고 가정**하고 동작한다.
- 오버라이드는 **baseConfig 및 URL 파라미터**만 허용한다.
- 기존 위젯 기능(탭/헤더/인터랙션/설정 UI)은 그대로 유지한다.

## 현재 구조 요약 (문제 지점)
1. `/app/conversation` 저장 시 `pages[pageKey]`가 DB에 저장됨.
2. 런타임(`/embed`)에서 DB `pages`를 사용해 `resolveConversationPageFeatures`로 합쳐 적용.
3. 결과적으로 DB가 **페이지 오버라이드 소스**로 동작.

## 목표 상태의 데이터 흐름
1. `/app/conversation`에서 저장할 때:
   - `features` 및 `widget` 기본 설정만 저장
   - `pages` 및 `settings_ui.setup_fields/feature_labels`의 **pageKey 기반 저장 금지**
2. 런타임에서 사용할 오버라이드:
   - `baseConfig` (설치 코드)
   - URL 파라미터 오버라이드
   - DB는 **오버라이드 소스가 아님**

## 변경 설계 (상세)
### A. 저장 단계에서 pages 차단
- `ChatSettingsPanel`과 `/app/conversation` 저장 payload에서 `pages`를 제거한다.
- `settings_ui.setup_fields`, `settings_ui.feature_labels`도 **pageKey 기반 저장을 제거**한다.
- 결과적으로 DB에는 `pages`가 저장되지 않는다.

### B. 런타임 적용 단계에서 pages 무시
- `resolveConversationPageFeatures`가 DB `pages`를 읽더라도 무시하도록 조정한다.
- `widgetChatPolicyShape`에서 DB `pages` 필드를 **normalize 단계에서 제거**한다.
- `/embed` 페이지에서 `providerPolicy`를 적용할 때 **pages 사용 경로를 끊는다**.

### C. baseConfig/URL 오버라이드 유지
- `home-widget-install-box.tsx`: baseConfig 및 URL 파라미터 오버라이드 유지
- `LoginClient.tsx`: URL 파라미터 오버라이드 유지

## 예상 영향
- DB의 pages 오버라이드는 **완전히 비활성화**
- 위젯 동작 변경은 **baseConfig/URL 오버라이드**로만 제어
- 기존 기능은 유지되지만, DB에 저장되던 page별 설정은 무시됨

## 테스트 계획 (MCP 필수)
### 1) Chrome DevTools
- `/app/conversation`에서 저장 후 네트워크 요청 payload에 `pages`가 없는지 확인
- `/embed` 위젯에서 baseConfig/URL 오버라이드가 정상 적용되는지 확인

### 2) Supabase (DB 수정 없음)
- DB에 직접 쓰기 불가. 필요 시 SQL 쿼리 제공하여 사용자가 실행
- 확인용 SQL (사용자 실행):
```sql
select id, chat_policy ? 'pages' as has_pages
from "B_chat_widgets";
```

## 테스트 기록 체크리스트
- [ ] Chrome DevTools: `/app/conversation` 저장 payload에 `pages` 없음 확인
- [ ] Chrome DevTools: `/embed`에서 baseConfig/URL 오버라이드 정상 적용 확인
- [ ] Supabase: `chat_policy`에서 `pages` 미존재 확인 (사용자 실행)

---

## 실행 정책 (필수 준수)
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

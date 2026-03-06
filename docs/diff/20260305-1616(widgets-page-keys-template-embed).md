# 변경 요약
- B_chat_widgets에 page_keys 컬럼 추가 (페이지별 템플릿 매핑 저장).
- /api/widgets가 목록 반환 + page_key 필터를 지원하도록 변경.
- 템플릿 공유 인스턴스( template_shared ) 자동 생성/재사용 로직 추가.
- /api/widget/init 및 /api/widget/config에 template_id 지원.
- 위젯 런처가 template_id를 받아 설정을 조회하도록 확장.
- 설정/퀵스타트 UI를 목록 선택 기반으로 반영.

# DB 변경
## 적용 SQL
```sql
alter table public."B_chat_widgets" add column if not exists page_keys text[] not null default '{}'::text[];
```

# 코드 변경
## src/lib/widgetSharedInstance.ts (신규)
- template_shared 인스턴스 생성/재사용 및 access 갱신 로직 추가.

## src/app/api/widgets/route.ts
- GET: 단일 반환 → 목록 반환, page_key로 필터 가능.
- POST: template_id 기반 업데이트, page_keys 저장, shared 인스턴스 생성/재사용, rotate_key 시 shared 키 갱신.

## src/app/api/widget/config/route.ts
- key 또는 template_id로 템플릿/인스턴스 해석 가능하게 변경.

## src/app/api/widget/init/route.ts
- public_key가 없을 때 template_id로 초기화 가능하게 변경.

## src/components/design-system/widget/WidgetUI.parts.tsx
- data-template-id / cfg.template_id 지원.
- /api/widget/config 호출 시 template_id 전달.

## src/components/settings/WidgetSettingsPanel.tsx
- /api/widgets 목록 기반으로 템플릿 선택 후 편집하도록 변경.

## src/components/settings/WidgetQuickstartPanel.tsx
- /api/widgets 목록 기반 템플릿 선택 UI 추가.

## src/app/embed/[key]/page.tsx
- init payload에 template_id 추가.

# 빌드/재생성
- `node scripts/build-widget-launcher.mjs` 실행 시도 실패 (EPERM spawn 오류). public/widget.js는 아직 갱신되지 않음.

# 변경 요약
- 위젯 템플릿/인스턴스 분리 전제에 맞춰 `/api/widgets`가 템플릿+인스턴스 조합으로 동작하도록 갱신.
- 위젯 스트림 요청에서 editable/usable/is_public 권한을 반영하도록 필터링 추가.
- 위젯 토큰 기반 transcript 복사 시 인스턴스/템플릿 기준으로 조회하도록 수정.
- 에이전트/KB/MCP 권한 컬럼 추가 및 editable 기본값 트리거 적용.

# DB 변경
## 적용 SQL (요약)
```sql
alter table public."B_bot_agents" add column if not exists is_public boolean not null default false;
alter table public."B_bot_agents" add column if not exists editable_id uuid[] not null default '{}'::uuid[];
alter table public."B_bot_agents" add column if not exists usable_id uuid[] not null default '{}'::uuid[];

alter table public."B_bot_knowledge_bases" add column if not exists created_by uuid;
alter table public."B_bot_knowledge_bases" add column if not exists editable_id uuid[] not null default '{}'::uuid[];
alter table public."B_bot_knowledge_bases" add column if not exists usable_id uuid[] not null default '{}'::uuid[];

alter table public."C_mcp_tools" add column if not exists created_by uuid;
alter table public."C_mcp_tools" add column if not exists editable_id uuid[] not null default '{}'::uuid[];
alter table public."C_mcp_tools" add column if not exists usable_id uuid[] not null default '{}'::uuid[];
```

# 코드 변경
## src/app/api/widgets/route.ts
### Before
```ts
const { data, error } = await context.supabase
  .from("B_chat_widgets")
  .select("*")
  .eq("org_id", context.orgId)
  .maybeSingle();

return NextResponse.json({ item: data || null });
```

### After
```ts
const { data, error } = await context.supabase
  .from("B_chat_widgets")
  .select("*")
  .eq("created_by", context.user.id)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const { data: instance } = await context.supabase
  .from("B_chat_widget_instances")
  .select("id, public_key, template_id")
  .eq("template_id", data.id)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

return NextResponse.json({ item: mapTemplateToWidgetConfig(data, instance) });
```

추가: `POST /api/widgets`는 기존 템플릿이 없을 경우 템플릿을 생성하고, 인스턴스가 없으면 자동으로 인스턴스를 1개 생성합니다.

## src/app/api/widget/stream/route.ts
### Before
```ts
const { data: widget } = await supabaseAdmin
  .from("B_chat_widgets")
  .select("id, org_id, agent_id, is_active, theme, allowed_domains, allowed_paths")
  .eq("id", payload.widget_id)
  .maybeSingle();

const basePolicy = resolveWidgetBasePolicy(widget, template || null);
const resolved = resolveWidgetRuntimeConfig(widget, template || null, filteredOverrides);
```

### After
```ts
const { data: instance } = await supabaseAdmin
  .from("B_chat_widget_instances")
  .select("id, template_id, public_key, name, is_active, chat_policy, is_public, editable_id, usable_id")
  .eq("id", payload.widget_id)
  .maybeSingle();

const { data: template } = await supabaseAdmin
  .from("B_chat_widgets")
  .select("id, name, is_active, chat_policy, is_public, created_by")
  .eq("id", instance.template_id)
  .maybeSingle();

const basePolicy = resolveWidgetBasePolicy(template, instance);
const resolved = resolveWidgetRuntimeConfig(template, instance, filteredOverrides);
```

## src/app/api/transcript/copy/route.ts
### Before
```ts
const { data: widget } = await supabaseAdmin
  .from("B_chat_widgets")
  .select("id, org_id, is_active")
  .eq("id", widgetPayload.widget_id)
  .maybeSingle();

orgId = String(widget.org_id || "");
```

### After
```ts
const { data: instance } = await supabaseAdmin
  .from("B_chat_widget_instances")
  .select("id, template_id, is_active, is_public")
  .eq("id", widgetPayload.widget_id)
  .maybeSingle();

const { data: template } = await supabaseAdmin
  .from("B_chat_widgets")
  .select("id, is_active, is_public, created_by")
  .eq("id", instance.template_id)
  .maybeSingle();

orgId = template.created_by ? String(template.created_by) : String(widgetPayload.org_id || "") || null;
```

# End User Memory Design (A_ Tables)

This document designs how to remember end users (the visitors who chat) across the entire conversation stack. The goal is to store who they are, what conversations happened, which resources were used, and what end-user-specific context was saved for future responses.

**1. Goal / Scope**
- Store end users separately from paying org users.
- Track which `org_id`, `agent_id`, MCP tools, and KBs were used in each conversation.
- Persist conversation content and end-user-specific response materials for fast reuse.
- Power `/contacts` and `/users/{customer_id}` pages with fast, scoped queries.

**2. Definitions**
- Org user: the paying customer (already in DB).
- End user: the visitor who chats with the org.
- Session: a conversation run stored in `D_conv_sessions` and `D_conv_turns`.

**3. Data Model (A_ Tables)**
1. `A_end_users` (core end-user profile per org)
Fields: `id`, `org_id`, `display_name`, `email`, `phone`, `member_id`, `external_user_id`, `tags`, `attributes`, `locale`, `time_zone`, `city`, `province`, `country`, `first_seen_at`, `last_seen_at`, `last_session_id`, `sessions_count`, `has_chat`, `created_at`, `updated_at`, `deleted_at`.
Indexes: `(org_id, last_seen_at)`, `(org_id, display_name)`, `lower(email)`, `phone`, `member_id`, `external_user_id`.

2. `A_end_user_identities` (multi-identifier mapping)
Fields: `id`, `org_id`, `end_user_id`, `identity_type`, `identity_value`, `identity_hash`, `is_primary`, `created_at`.
Notes: store both normalized plain value and hash when allowed; `identity_type` examples include `email`, `phone`, `cookie`, `device`, `external`.
Indexes: `(org_id, identity_type, identity_hash)` unique, `(end_user_id)`.

3. `A_end_user_sessions` (link to runtime sessions)
Fields: `id`, `org_id`, `end_user_id`, `session_id`, `channel`, `agent_id`, `llm`, `mode`, `started_at`, `ended_at`, `outcome`, `satisfaction`, `summary_text`, `created_at`.
Indexes: `(org_id, end_user_id, started_at)`, `(session_id)` unique.

4. `A_end_user_messages` (conversation content for end-user views)
Fields: `id`, `org_id`, `end_user_id`, `session_id`, `turn_id`, `role`, `content`, `content_summary`, `content_redacted`, `content_lang`, `content_tokens`, `created_at`.
Notes: `role` = `user | assistant | system | tool`. Both full content and summary are stored.
Indexes: `(org_id, end_user_id, session_id, created_at)`, `(turn_id)`.

5. `A_end_user_session_resources` (resource usage summary per session)
Fields: `id`, `org_id`, `end_user_id`, `session_id`, `agent_id`, `mcp_tool_ids`, `kb_ids`, `kb_parent_ids`, `mcp_calls_count`, `kb_hits_count`, `updated_at`.
Notes: derived from `F_audit_mcp_tools` and `D_conv_turns.kb_references`.
Indexes: `(org_id, end_user_id, session_id)` unique.

6. `A_end_user_memories` (facts and preferences extracted for reuse)
Fields: `id`, `org_id`, `end_user_id`, `memory_type`, `memory_key`, `content`, `value_json`, `confidence`, `source_type`, `source_session_id`, `source_turn_id`, `ttl_days`, `expires_at`, `is_active`, `created_at`, `updated_at`.
Notes: `memory_type` examples include `profile`, `preference`, `issue`, `order`, `note`.
Indexes: `(org_id, end_user_id, memory_type, memory_key)`, `(end_user_id, is_active)`.

7. `A_end_user_response_materials` (end-user-specific materials used to answer)
Fields: `id`, `org_id`, `end_user_id`, `session_id`, `turn_id`, `material_type`, `content_json`, `created_at`.
Notes: stores memory packs, extracted facts, or user-profile snapshots that were injected into a response.
Indexes: `(org_id, end_user_id, session_id, turn_id)`.

8. `A_end_user_summaries` (fast profile summary for UI and runtime)
Fields: `id`, `org_id`, `end_user_id`, `summary_text`, `source_session_id`, `updated_at`.
Indexes: `(org_id, end_user_id)` unique.

**4. Identity Resolution Rules**
- Normalize before match: lower-case email, E.164 for phone, trim whitespace.
- Match priority: `external_user_id` > `email` > `phone` > `cookie/device`.
- If multiple identities match, attach new identity to the existing `A_end_users` record and log a merge event.
- Allow manual merge in UI; keep a soft-deleted loser with `deleted_at` and move identities.

**5. Write Path (Runtime Flow)**
1. Session start
- Resolve end user from visitor data and `A_end_user_identities`.
- Upsert `A_end_users` and create `A_end_user_sessions` row linked to `D_conv_sessions`.

2. Turn processing
- Insert `A_end_user_messages` for user and assistant outputs.
- Update `A_end_user_session_resources` from MCP calls and KB hits.

3. Memory extraction
- Extract facts from turns and tool outputs.
- Upsert `A_end_user_memories` and refresh `A_end_user_summaries`.
- Store `A_end_user_response_materials` for the response pack used.

4. Session end
- Update `A_end_users.last_seen_at`, `sessions_count`, `has_chat`.

**6. Read Path (UI Mapping)**

6.1 `/contacts` list page
- Primary table source: `A_end_users`.
- Columns (suggested): name, email, mobile, member id, last seen, tags, is member, has chat, sessions count, locale, city, country, created at.
- Search: `display_name`, `email`, `phone`, `member_id`.
- Filters: `last_seen_at` range, `tags`, `has_chat`, `member_id` presence, `channel`, `country`, `language`.
- Row action menu: view profile, edit, copy, filter by same value.

6.2 `/users/{customer_id}` detail page
- Profile card: `A_end_users` + `A_end_user_identities` + `A_end_user_summaries`.
- Conversation list: `A_end_user_sessions` sorted by `started_at` desc.
- Conversation detail: `A_end_user_messages` by `session_id`.
- Resource usage: `A_end_user_session_resources`.
- Memory panel: `A_end_user_memories` (active only).

**7. Security / Privacy / Retention**
- Store PII with field-level encryption or masked versions for UI.
- Keep `identity_hash` for matching when raw storage is restricted.
- Retention policy (default): **unlimited**.
- Message storage (default): **full content storage**.
- Store both full messages and summaries for fast indexing and decisioning.
- Honor deletion requests by deleting `A_end_users` and cascading or soft-deleting linked data.

**8. Backfill Strategy**
- Use `D_conv_sessions.metadata` and `D_conv_turns.bot_context` to find email/phone/member id and upsert `A_end_users`.
- Generate `A_end_user_sessions` and `A_end_user_messages` from existing sessions and turns.
- Build `A_end_user_session_resources` from `F_audit_mcp_tools` and KB references.
- Backfill trigger: `POST /api/end-users/backfill` (admin/cron only). Params: `org_id`(cron), `since`, `until`, `limit`, `offset`, `turn_limit`, `dry_run`.

**9. DDL Draft (Supabase/Postgres)**
```sql
create table public."A_end_users" (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  display_name text null,
  email text null,
  phone text null,
  member_id text null,
  external_user_id text null,
  tags text[] not null default array[]::text[],
  attributes jsonb not null default '{}'::jsonb,
  locale text null,
  time_zone text null,
  city text null,
  province text null,
  country text null,
  first_seen_at timestamptz null,
  last_seen_at timestamptz null,
  last_session_id uuid null,
  sessions_count integer not null default 0,
  has_chat boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint A_end_users_pkey primary key (id),
  constraint A_end_users_org_fk foreign key (org_id) references public."A_iam_organizations"(id) on delete cascade,
  constraint A_end_users_last_session_fk foreign key (last_session_id) references public."D_conv_sessions"(id) on delete set null
);

create table public."A_end_user_identities" (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  end_user_id uuid not null,
  identity_type text not null,
  identity_value text null,
  identity_hash text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint A_end_user_identities_pkey primary key (id),
  constraint A_end_user_identities_org_fk foreign key (org_id) references public."A_iam_organizations"(id) on delete cascade,
  constraint A_end_user_identities_user_fk foreign key (end_user_id) references public."A_end_users"(id) on delete cascade
);

create table public."A_end_user_sessions" (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  end_user_id uuid not null,
  session_id uuid not null,
  channel text null,
  agent_id text null,
  llm text null,
  mode text null,
  started_at timestamptz null,
  ended_at timestamptz null,
  outcome text null,
  satisfaction integer null,
  summary_text text null,
  created_at timestamptz not null default now(),
  constraint A_end_user_sessions_pkey primary key (id),
  constraint A_end_user_sessions_org_fk foreign key (org_id) references public."A_iam_organizations"(id) on delete cascade,
  constraint A_end_user_sessions_user_fk foreign key (end_user_id) references public."A_end_users"(id) on delete cascade,
  constraint A_end_user_sessions_session_fk foreign key (session_id) references public."D_conv_sessions"(id) on delete cascade
);

create table public."A_end_user_messages" (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  end_user_id uuid not null,
  session_id uuid not null,
  turn_id uuid null,
  role text not null,
  content text null,
  content_summary text null,
  content_redacted text null,
  content_lang text null,
  content_tokens integer null,
  created_at timestamptz not null default now(),
  constraint A_end_user_messages_pkey primary key (id),
  constraint A_end_user_messages_org_fk foreign key (org_id) references public."A_iam_organizations"(id) on delete cascade,
  constraint A_end_user_messages_user_fk foreign key (end_user_id) references public."A_end_users"(id) on delete cascade,
  constraint A_end_user_messages_session_fk foreign key (session_id) references public."D_conv_sessions"(id) on delete cascade,
  constraint A_end_user_messages_turn_fk foreign key (turn_id) references public."D_conv_turns"(id) on delete set null,
  constraint A_end_user_messages_role_check check (role in ('user', 'assistant', 'system', 'tool'))
);

create table public."A_end_user_session_resources" (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  end_user_id uuid not null,
  session_id uuid not null,
  agent_id text null,
  mcp_tool_ids uuid[] not null default array[]::uuid[],
  kb_ids uuid[] not null default array[]::uuid[],
  kb_parent_ids uuid[] not null default array[]::uuid[],
  mcp_calls_count integer not null default 0,
  kb_hits_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint A_end_user_session_resources_pkey primary key (id),
  constraint A_end_user_session_resources_org_fk foreign key (org_id) references public."A_iam_organizations"(id) on delete cascade,
  constraint A_end_user_session_resources_user_fk foreign key (end_user_id) references public."A_end_users"(id) on delete cascade,
  constraint A_end_user_session_resources_session_fk foreign key (session_id) references public."D_conv_sessions"(id) on delete cascade
);

create table public."A_end_user_memories" (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  end_user_id uuid not null,
  memory_type text not null,
  memory_key text not null,
  content text null,
  value_json jsonb null default '{}'::jsonb,
  confidence real null,
  source_type text null,
  source_session_id uuid null,
  source_turn_id uuid null,
  ttl_days integer null,
  expires_at timestamptz null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint A_end_user_memories_pkey primary key (id),
  constraint A_end_user_memories_org_fk foreign key (org_id) references public."A_iam_organizations"(id) on delete cascade,
  constraint A_end_user_memories_user_fk foreign key (end_user_id) references public."A_end_users"(id) on delete cascade,
  constraint A_end_user_memories_session_fk foreign key (source_session_id) references public."D_conv_sessions"(id) on delete set null,
  constraint A_end_user_memories_turn_fk foreign key (source_turn_id) references public."D_conv_turns"(id) on delete set null
);

create table public."A_end_user_response_materials" (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  end_user_id uuid not null,
  session_id uuid not null,
  turn_id uuid null,
  material_type text not null,
  content_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint A_end_user_response_materials_pkey primary key (id),
  constraint A_end_user_response_materials_org_fk foreign key (org_id) references public."A_iam_organizations"(id) on delete cascade,
  constraint A_end_user_response_materials_user_fk foreign key (end_user_id) references public."A_end_users"(id) on delete cascade,
  constraint A_end_user_response_materials_session_fk foreign key (session_id) references public."D_conv_sessions"(id) on delete cascade,
  constraint A_end_user_response_materials_turn_fk foreign key (turn_id) references public."D_conv_turns"(id) on delete set null
);

create table public."A_end_user_summaries" (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  end_user_id uuid not null,
  summary_text text not null,
  source_session_id uuid null,
  updated_at timestamptz not null default now(),
  constraint A_end_user_summaries_pkey primary key (id),
  constraint A_end_user_summaries_org_fk foreign key (org_id) references public."A_iam_organizations"(id) on delete cascade,
  constraint A_end_user_summaries_user_fk foreign key (end_user_id) references public."A_end_users"(id) on delete cascade,
  constraint A_end_user_summaries_session_fk foreign key (source_session_id) references public."D_conv_sessions"(id) on delete set null
);

create unique index if not exists A_end_user_identities_unique on public."A_end_user_identities" (org_id, identity_type, identity_hash);
create unique index if not exists A_end_user_sessions_session_id_unique on public."A_end_user_sessions" (session_id);
create unique index if not exists A_end_user_session_resources_unique on public."A_end_user_session_resources" (org_id, end_user_id, session_id);
create unique index if not exists A_end_user_summaries_unique on public."A_end_user_summaries" (org_id, end_user_id);

create index if not exists A_end_users_org_last_seen_idx on public."A_end_users" (org_id, last_seen_at desc);
create index if not exists A_end_users_org_display_name_idx on public."A_end_users" (org_id, display_name);
create index if not exists A_end_users_email_idx on public."A_end_users" (lower(email));
create index if not exists A_end_users_phone_idx on public."A_end_users" (phone);
create index if not exists A_end_users_member_id_idx on public."A_end_users" (member_id);
create index if not exists A_end_users_external_user_id_idx on public."A_end_users" (external_user_id);
create index if not exists A_end_users_tags_gin on public."A_end_users" using gin (tags);
create index if not exists A_end_users_attributes_gin on public."A_end_users" using gin (attributes);

create index if not exists A_end_user_identities_user_idx on public."A_end_user_identities" (end_user_id);
create index if not exists A_end_user_sessions_user_started_idx on public."A_end_user_sessions" (org_id, end_user_id, started_at desc);
create index if not exists A_end_user_messages_session_created_idx on public."A_end_user_messages" (org_id, session_id, created_at);
create index if not exists A_end_user_messages_turn_idx on public."A_end_user_messages" (turn_id);
create index if not exists A_end_user_memories_user_idx on public."A_end_user_memories" (org_id, end_user_id, is_active);
create index if not exists A_end_user_memories_key_idx on public."A_end_user_memories" (org_id, end_user_id, memory_type, memory_key);
create index if not exists A_end_user_response_materials_session_idx on public."A_end_user_response_materials" (org_id, end_user_id, session_id);
```

**10. API / Query Design**
Proposed endpoints:
- `GET /api/end-users` list + search + filters for `/contacts`.
- `GET /api/end-users/{id}` profile for `/users/{customer_id}`.
- `GET /api/end-users/{id}/sessions` session list.
- `GET /api/end-users/{id}/messages?session_id=...` conversation detail.
- `GET /api/end-users/{id}/memories` active memory list.
- `POST /api/end-users/{id}/merge` manual merge.
- `POST /api/end-users/{id}/delete` soft delete.
- `POST /api/end-users/aggregate` async rollup/cache refresh (admin/cron).

Query examples:
```sql
select *
from public."A_end_users"
where org_id = :org_id
  and deleted_at is null
  and (
    display_name ilike '%' || :q || '%'
    or email ilike '%' || :q || '%'
    or phone ilike '%' || :q || '%'
    or member_id ilike '%' || :q || '%'
  )
order by last_seen_at desc nulls last
limit :limit offset :offset;
```

```sql
select u.*, s.summary_text
from public."A_end_users" u
left join public."A_end_user_summaries" s
  on s.org_id = u.org_id and s.end_user_id = u.id
where u.org_id = :org_id and u.id = :end_user_id and u.deleted_at is null;
```

```sql
select *
from public."A_end_user_sessions"
where org_id = :org_id and end_user_id = :end_user_id
order by started_at desc
limit :limit offset :offset;
```

```sql
select role, content, content_summary, created_at
from public."A_end_user_messages"
where org_id = :org_id and session_id = :session_id
order by created_at asc;
```

```sql
select *
from public."A_end_user_session_resources"
where org_id = :org_id and session_id = :session_id;
```

**11. Indexing / Performance Notes**
- Keep `sessions_count`, `has_chat`, `last_seen_at` denormalized in `A_end_users`.
- Use `content_summary` for fast UI decisions and list previews.
- Optional: `pg_trgm` + GIN for faster `ILIKE` search on `display_name` and `email`.
- Optional: generated `tsvector` on `content_summary` for full-text search.
- Keep writes lightweight in runtime path; heavier aggregation can be async.

**12. Open Questions**
- Whether to support per-org overrides for retention and masking.
- Manual merge workflow and audit trail requirements.

**13. Implementation Status**
`C:\dev\1227\mejai\docs\end_user_memory_design.md 구현 완료 여부: true`

**14. Pre-Completion Checklist**
아래 항목이 완료되기 전에는 구현 완료로 선언하지 않는다.
필수 실행 항목:
- [x] DB 마이그레이션 실행: `A_end_users`~`A_end_user_summaries` 생성 + 인덱스
- [x] RLS/권한 정책 적용 및 접근 검증(조직 스코프 보장)
- [x] 런타임 write path 연결 검증: 세션/메시지/리소스/메모리 저장 확인
- [x] API 엔드포인트 구현: `/api/end-users*`
- [x] UI 페이지 구현: `/contacts`, `/users/{customer_id}`
- [x] 백필 실행 및 결과 검증(중복/누락/정합성) - 샘플 범위 실행 완료
- [x] 데이터 품질 점검: 정규화 규칙, 중복 병합 처리 (1차)
  - [x] identity hash 중복 없음
  - [x] sessions_count 불일치 없음
  - [x] content/summary 둘 다 null 없음
  - [x] 중복 병합 처리 시나리오 검증

우선순위 실행 항목(1~4):
- [x] (P1) 개인정보/보안 점검: org 스코프 필터링 및 백필/관리자 접근 경로 확인 완료
- [x] (P2) End-user identity resolution 로직 단위 테스트
- [x] (P3) 성능 검증: 주요 쿼리 응답시간, 인덱스 효율 점검
- [x] (P4) 운영 모니터링 추가: 백필 실패율, 매칭 실패율, 쓰기 지연
  - [x] `END_USER_BACKFILL_SUMMARY` 이벤트 기록(실패율 산정용)
  - [x] `END_USER_MATCH_HIT` / `END_USER_MATCH_MISS` 이벤트 기록
  - [x] `END_USER_WRITE_LATENCY` 이벤트 기록(임계치 1500ms)

선택 진행 항목(비필수 사유):
- [x] `pg_trgm` 확장 적용: 대규모 검색 성능 최적화가 필요할 때만 적용 가능
- [x] 수동 병합/삭제 UI: 초기 릴리스에서 운영 복잡도를 줄이기 위해 후순위 가능
- [x] 비동기 집계/캐시: 트래픽 증가 전까지는 필수 아님

# organizations SQL

## 핵심 요약
- `organizations` 테이블은 `public` 스키마에 있어야 합니다.
- 컬럼이 안 보인다면 다른 스키마/프로젝트에 실행했을 가능성이 큽니다.
- 아래 SQL을 **Supabase SQL Editor**에서 그대로 실행하세요.

## 재적용 SQL
```sql
-- Organizations: 사업자 등록번호 + 등록자/소유자 분리
-- 반드시 public.organizations에 적용

alter table public.organizations
  add column if not exists business_registration_number text;

alter table public.organizations
  add column if not exists registrant_id uuid;

alter table public.organizations
  drop constraint if exists organizations_registrant_id_fkey;

alter table public.organizations
  add constraint organizations_registrant_id_fkey
  foreign key (registrant_id) references auth.users (id) on delete set null;

-- name, 등록자, 소유자, 사업자등록번호 기준으로 중복 방지
create unique index if not exists organizations_identity_unique
  on public.organizations (name, owner_id, registrant_id, business_registration_number);
```

## 컬럼 확인 쿼리
```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'organizations'
  and column_name in ('business_registration_number', 'registrant_id');
```

## 테이블 스키마 확인 (문제 지속 시)
```sql
select table_schema, table_name
from information_schema.tables
where table_name = 'organizations';
```

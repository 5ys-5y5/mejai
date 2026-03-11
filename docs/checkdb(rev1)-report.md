# checkdb rev1 실행 결과
작성일: 2026-03-11

## 수행 내용
1. `B_chat_widget_instances.chat_policy` 정리 실행
2. 정리 결과 재확인 리포트 생성

## DB 정리 결과 요약
### B_chat_widgets
- 총 템플릿 수: 3
- `pages` 보유: 0
- `settings_ui` 보유: 0
- `debug` 보유: 0
- `debug_copy` 보유: 0
- `widget.access` 보유: 0
- `widget.allowed_domains` 보유: 0
- `widget.allowed_paths` 보유: 0

### B_chat_widget_instances
- 총 인스턴스 수: 34
- `pages` 보유: 0
- `settings_ui` 보유: 0
- `debug` 보유: 0
- `debug_copy` 보유: 0
- `widget.access` 보유: 0
- `widget.allowed_domains` 보유: 0
- `widget.allowed_paths` 보유: 0

## 확인 쿼리
```sql
select
  count(*) as total,
  count(*) filter (where chat_policy ? 'pages') as has_pages,
  count(*) filter (where chat_policy ? 'settings_ui') as has_settings_ui,
  count(*) filter (where chat_policy ? 'debug') as has_debug,
  count(*) filter (where chat_policy ? 'debug_copy') as has_debug_copy,
  count(*) filter (where chat_policy #> '{widget,access}' is not null) as has_widget_access,
  count(*) filter (where chat_policy #> '{widget,allowed_domains}' is not null) as has_widget_allowed_domains,
  count(*) filter (where chat_policy #> '{widget,allowed_paths}' is not null) as has_widget_allowed_paths
from public."B_chat_widgets";

select
  count(*) as total,
  count(*) filter (where chat_policy ? 'pages') as has_pages,
  count(*) filter (where chat_policy ? 'settings_ui') as has_settings_ui,
  count(*) filter (where chat_policy ? 'debug') as has_debug,
  count(*) filter (where chat_policy ? 'debug_copy') as has_debug_copy,
  count(*) filter (where chat_policy #> '{widget,access}' is not null) as has_widget_access,
  count(*) filter (where chat_policy #> '{widget,allowed_domains}' is not null) as has_widget_allowed_domains,
  count(*) filter (where chat_policy #> '{widget,allowed_paths}' is not null) as has_widget_allowed_paths
from public."B_chat_widget_instances";
```

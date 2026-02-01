select id, title, org_id, is_admin, is_active,
       content_json->'rules' as rules,
       content_json->'templates' as templates
from knowledge_base
where is_admin = true
  and is_active = true
  and org_id = '8ad81b6b-3210-40dd-8e00-9a43a4395923';
